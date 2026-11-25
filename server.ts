import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  getTrainedModelInfo,
  isTrainedModelAvailable,
  MlPredictInput,
  predictWithRandomForest,
} from './server/rfInference.ts';
import {
  AuthenticatedRequest,
  claimFirstRunAdmin,
  getAuthStatus,
  issueBearerToken,
  OperatorRole,
  requireAuth,
  revokeToken,
  verifyLoginCredentials,
} from './server/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Select or add a Gemini API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseStructuredJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Empty response received from AI model.');
  }

  // Strip optional markdown code fences if present
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFences) as T;
  } catch {
    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error('AI response could not be parsed as valid JSON.');
  }
}

function isTransientAiError(err: unknown): boolean {
  const status = typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return /503|UNAVAILABLE|DEADLINE_EXCEEDED|ETIMEDOUT|ECONNRESET|fetch failed|overloaded/i.test(msg);
}

async function generateStructuredJson<T>(params: {
  prompt: string;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
}): Promise<T> {
  const ai = getGeminiClient();
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: params.prompt,
        config: {
          systemInstruction: params.systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        },
      });
      return parseStructuredJson<T>(response.text ?? '');
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isTransientAiError(err)) {
        const delayMs = 600 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

interface SnapshotPayload {
  reading: {
    type: 'L' | 'M' | 'H';
    airTempK: number;
    processTempK: number;
    rpm: number;
    torqueNm: number;
    toolWearMin: number;
  };
  prediction: {
    riskPercent: number;
    failureExpected: boolean;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    advice: string;
    factors: Array<{
      label: string;
      datasetCode: string;
      proximity: number;
      breached: boolean;
      riskContributionPercent: number;
      summary: string;
    }>;
    derivedMetrics: {
      temperatureGapK: number;
      powerWatts: number;
      overstrainProduct: number;
      overstrainLimit: number;
    };
  };
}

interface HistoryRecordSummary {
  id: string;
  timestamp: string;
  type: 'L' | 'M' | 'H';
  airTempK: number;
  processTempK: number;
  rpm: number;
  torqueNm: number;
  toolWearMin: number;
  failureExpected: boolean;
  riskPercent: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidProductType(v: unknown): v is 'L' | 'M' | 'H' {
  return v === 'L' || v === 'M' || v === 'H';
}

function isValidRiskLevel(v: unknown): v is 'LOW' | 'MEDIUM' | 'HIGH' {
  return v === 'LOW' || v === 'MEDIUM' || v === 'HIGH';
}

function validateSnapshotPayload(body: unknown): SnapshotPayload | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const reading = obj.reading as Record<string, unknown> | undefined;
  const prediction = obj.prediction as Record<string, unknown> | undefined;
  if (!reading || !prediction) return null;

  if (
    !isValidProductType(reading.type) ||
    !isFiniteNumber(reading.airTempK) ||
    !isFiniteNumber(reading.processTempK) ||
    !isFiniteNumber(reading.rpm) ||
    !isFiniteNumber(reading.torqueNm) ||
    !isFiniteNumber(reading.toolWearMin)
  ) {
    return null;
  }

  const derived = (prediction.derivedMetrics ?? {}) as Record<string, unknown>;
  if (
    !isFiniteNumber(prediction.riskPercent) ||
    typeof prediction.failureExpected !== 'boolean' ||
    !isValidRiskLevel(prediction.level) ||
    typeof prediction.advice !== 'string'
  ) {
    return null;
  }

  const fallbackOverstrainLimit =
    reading.type === 'L' ? 11000 : reading.type === 'M' ? 12000 : 13000;
  const fallbackTempGapK = Number((reading.processTempK - reading.airTempK).toFixed(2));
  const fallbackPowerWatts = Math.round((reading.torqueNm * reading.rpm * 2 * Math.PI) / 60);
  const fallbackOverstrainProduct = Math.round(reading.toolWearMin * reading.torqueNm);

  const rawFactors = Array.isArray(prediction.factors) ? prediction.factors : [];
  const safeFactors = rawFactors.slice(0, 6).map((f) => {
    const item = (f ?? {}) as Record<string, unknown>;
    return {
      label: String(item.label ?? '').slice(0, 60),
      datasetCode: String(item.datasetCode ?? '').slice(0, 12),
      proximity: isFiniteNumber(item.proximity) ? item.proximity : 0,
      breached: Boolean(item.breached),
      riskContributionPercent: isFiniteNumber(item.riskContributionPercent) ? item.riskContributionPercent : 0,
      summary: String(item.summary ?? '').slice(0, 140),
    };
  });

  return {
    reading: {
      type: reading.type,
      airTempK: reading.airTempK,
      processTempK: reading.processTempK,
      rpm: reading.rpm,
      torqueNm: reading.torqueNm,
      toolWearMin: reading.toolWearMin,
    },
    prediction: {
      riskPercent: prediction.riskPercent,
      failureExpected: prediction.failureExpected,
      level: prediction.level,
      advice: prediction.advice.slice(0, 200),
      factors: safeFactors,
      derivedMetrics: {
        temperatureGapK: isFiniteNumber(derived.temperatureGapK) ? derived.temperatureGapK : fallbackTempGapK,
        powerWatts: isFiniteNumber(derived.powerWatts) ? derived.powerWatts : fallbackPowerWatts,
        overstrainProduct: isFiniteNumber(derived.overstrainProduct) ? derived.overstrainProduct : fallbackOverstrainProduct,
        overstrainLimit: isFiniteNumber(derived.overstrainLimit) ? derived.overstrainLimit : fallbackOverstrainLimit,
      },
    },
  };
}

function validateHistoryPayload(
  body: unknown
): { records: HistoryRecordSummary[]; filterSummary: string } | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.records) || obj.records.length === 0) return null;

  const filterSummary = typeof obj.filterSummary === 'string' ? obj.filterSummary.slice(0, 200) : 'All records';
  const records: HistoryRecordSummary[] = [];

  for (const raw of obj.records.slice(0, 50)) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (
      typeof r.id !== 'string' ||
      typeof r.timestamp !== 'string' ||
      !isValidProductType(r.type) ||
      !isFiniteNumber(r.airTempK) ||
      !isFiniteNumber(r.processTempK) ||
      !isFiniteNumber(r.rpm) ||
      !isFiniteNumber(r.torqueNm) ||
      !isFiniteNumber(r.toolWearMin) ||
      typeof r.failureExpected !== 'boolean' ||
      !isFiniteNumber(r.riskPercent) ||
      !isValidRiskLevel(r.level)
    ) {
      return null;
    }
    records.push({
      id: r.id.slice(0, 40),
      timestamp: r.timestamp.slice(0, 40),
      type: r.type,
      airTempK: r.airTempK,
      processTempK: r.processTempK,
      rpm: r.rpm,
      torqueNm: r.torqueNm,
      toolWearMin: r.toolWearMin,
      failureExpected: r.failureExpected,
      riskPercent: r.riskPercent,
      level: r.level,
    });
  }

  return { records, filterSummary };
}

function extractApiError(err: unknown): { status: number; message: string } {
  const statusCode =
    typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : undefined;
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'AI service request failed.');

  if (rawMessage.includes('GEMINI_API_KEY')) {
    return { status: 503, message: rawMessage };
  }
  if (
    statusCode === 429 ||
    /429|RESOURCE_EXHAUSTED|quota/i.test(rawMessage)
  ) {
    return {
      status: 429,
      message: 'AI quota or rate limit reached. Wait a moment and retry, or select a billing-enabled key in Settings > Secrets.',
    };
  }
  if (
    statusCode === 403 ||
    /403|PERMISSION_DENIED|API_KEY_INVALID|API key not valid/i.test(rawMessage)
  ) {
    return {
      status: 403,
      message: 'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (statusCode === 404 || /404|NOT_FOUND/i.test(rawMessage)) {
    return {
      status: 502,
      message: `Configured AI model (${MODEL_NAME}) is currently unavailable for this API key.`,
    };
  }
  if (
    statusCode === 503 ||
    /503|UNAVAILABLE|DEADLINE_EXCEEDED|overloaded|ETIMEDOUT/i.test(rawMessage)
  ) {
    return {
      status: 503,
      message: 'The Gemini AI service is temporarily busy. Please try again in a few seconds.',
    };
  }
  if (statusCode === 400 || /INVALID_ARGUMENT/i.test(rawMessage)) {
    return {
      status: 400,
      message: 'The AI request could not be processed with the current parameters. Please retry.',
    };
  }
  return { status: 500, message: 'Unable to complete AI diagnostic request right now. Please try again.' };
}

function validateMlPredictInput(body: unknown): { data: MlPredictInput | null; error?: string } {
  if (!body || typeof body !== 'object') {
    return { data: null, error: 'Request body must be a JSON object.' };
  }
  const obj = body as Record<string, unknown>;
  const type = obj.type;
  const airTempK = obj.airTempK;
  const processTempK = obj.processTempK;
  const rpm = obj.rpm;
  const torqueNm = obj.torqueNm;
  const toolWearMin = obj.toolWearMin;

  if (!isValidProductType(type)) {
    return { data: null, error: 'Type must be one of L, M, or H.' };
  }
  if (!isFiniteNumber(airTempK) || airTempK < 290 || airTempK > 310) {
    return { data: null, error: 'Air temperature must be between 290 and 310 K.' };
  }
  if (!isFiniteNumber(processTempK) || processTempK < 300 || processTempK > 320) {
    return { data: null, error: 'Process temperature must be between 300 and 320 K.' };
  }
  if (processTempK <= airTempK) {
    return { data: null, error: 'Process temperature must be strictly higher than air temperature.' };
  }
  if (!isFiniteNumber(rpm) || !Number.isInteger(rpm) || rpm < 500 || rpm > 4000) {
    return { data: null, error: 'Rotational speed must be a whole number between 500 and 4000 rpm.' };
  }
  if (!isFiniteNumber(torqueNm) || torqueNm < 0 || torqueNm > 100) {
    return { data: null, error: 'Torque must be between 0 and 100 Nm.' };
  }
  if (!isFiniteNumber(toolWearMin) || !Number.isInteger(toolWearMin) || toolWearMin < 0 || toolWearMin > 300) {
    return { data: null, error: 'Tool wear must be a whole number between 0 and 300 min.' };
  }

  return {
    data: { type, airTempK, processTempK, rpm, torqueNm, toolWearMin },
  };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const isValidRole = (v: unknown): v is OperatorRole =>
    v === 'Maintenance Engineer' || v === 'Production Supervisor';

  // Auth Endpoint 1: Check whether workspace access is configured or awaits first-run setup
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    res.json(getAuthStatus());
  });

  // Auth Endpoint 2: One-time first-run operator setup (locked once claimed or when DASHBOARD_ADMIN_PASSCODE is set)
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 120) : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const role: OperatorRole = isValidRole(body?.role) ? body.role : 'Maintenance Engineer';

    if (name.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid work email address.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }

    const result = claimFirstRunAdmin({ name, email, role, password });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const { token, expiresAt } = issueBearerToken(result.user);
    res.status(201).json({ user: result.user, token, expiresAt });
  });

  // Auth Endpoint 3: Sign in with configured passcode or claimed operator credentials
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 120) : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const role: OperatorRole = isValidRole(body?.role) ? body.role : 'Maintenance Engineer';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid operator email address.' });
      return;
    }
    if (!password || password.length > 128) {
      res.status(400).json({ error: 'Please enter your access password.' });
      return;
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const result = verifyLoginCredentials({ email, role, password, clientIp });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const { token, expiresAt } = issueBearerToken(result.user);
    res.json({ user: result.user, token, expiresAt });
  });

  // Auth Endpoint 4: Verify active Bearer token
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.authUser });
  });

  // Auth Endpoint 5: Revoke current Bearer token on sign out
  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.tokenJti) {
      revokeToken(req.tokenJti);
    }
    res.json({ ok: true });
  });

  // Protect all ML and AI API routes behind server-verified Bearer auth
  app.use('/api/ml', requireAuth);
  app.use('/api/ai', requireAuth);

  // ML Endpoint 1: Serve trained Random Forest metadata, held-out test metrics, and feature importances
  app.get('/api/ml/model-info', (_req: Request, res: Response) => {
    if (!isTrainedModelAvailable()) {
      res.status(503).json({ error: 'Trained Random Forest model artifact is not available on the server.' });
      return;
    }
    try {
      res.json(getTrainedModelInfo());
    } catch (err) {
      console.error('Failed to load trained model info:', err);
      res.status(500).json({ error: 'Unable to read trained model metadata.' });
    }
  });

  // ML Endpoint 2: Run live 150-tree Random Forest inference on a validated CNC sensor snapshot
  app.post('/api/ml/predict', (req: Request, res: Response) => {
    if (!isTrainedModelAvailable()) {
      res.status(503).json({ error: 'Trained Random Forest model artifact is not available on the server.' });
      return;
    }

    const validated = validateMlPredictInput(req.body);
    if (!validated.data) {
      res.status(400).json({ error: validated.error ?? 'Invalid sensor reading payload.' });
      return;
    }

    try {
      const prediction = predictWithRandomForest(validated.data);
      res.json({ prediction });
    } catch (err) {
      console.error('ML inference error:', err);
      res.status(500).json({ error: 'Unable to complete Random Forest inference.' });
    }
  });

  // Endpoint 1: AI Maintenance Diagnosis for a single CNC sensor snapshot
  app.post('/api/ai/diagnose-snapshot', async (req: Request, res: Response) => {
    const payload = validateSnapshotPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: 'Invalid CNC snapshot payload.' });
      return;
    }

    try {
      const { reading, prediction } = payload;

      const prompt = `Analyze this single CNC machine operating snapshot evaluated by the active predictor:
- Product Type: ${reading.type} (overstrain limit ${prediction.derivedMetrics.overstrainLimit} min·Nm)
- Air Temperature: ${reading.airTempK} K
- Process Temperature: ${reading.processTempK} K (Temperature Gap ΔT = ${prediction.derivedMetrics.temperatureGapK} K)
- Rotational Speed: ${reading.rpm} rpm
- Torque: ${reading.torqueNm} Nm (Mechanical Power = ${prediction.derivedMetrics.powerWatts} W)
- Tool Wear: ${reading.toolWearMin} min (Wear × Torque = ${prediction.derivedMetrics.overstrainProduct} min·Nm)
- Active Verdict: ${prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'} | Risk: ${prediction.riskPercent.toFixed(1)}% (${prediction.level})
- Physical Failure-Mode Proximity Context (AI4I 2020 rules):
${prediction.factors.map((f) => `  * ${f.label} (${f.datasetCode}): proximity p=${f.proximity.toFixed(3)}, breached=${f.breached}, score=${f.riskContributionPercent.toFixed(1)}%, detail=${f.summary}`).join('\n')}

Provide a concise, practical predictive-maintenance engineering diagnosis strictly grounded in these numbers.`;

      const parsed = await generateStructuredJson<Record<string, unknown>>({
        prompt,
        systemInstruction:
          'You are a senior CNC predictive-maintenance engineer assisting a maintenance engineer and production supervisor. Stay strictly faithful to the provided snapshot data. Never claim live PLC connectivity or exact time-to-failure (RUL). Keep responses concise, structured, and actionable.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: '2-sentence plain-language summary of the machine condition and why the risk score landed where it did.',
            },
            primaryRiskDrivers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 specific engineering drivers citing the actual numeric readings and limits.',
            },
            inspectionChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 concrete shop-floor inspection or preventive maintenance actions.',
            },
            parameterGuidance: {
              type: Type.STRING,
              description: 'Concise guidance on safe operating adjustments or monitoring priorities for the next cycle.',
            },
            scopeNote: {
              type: Type.STRING,
              description: 'One short sentence noting this AI brief interprets a single operating snapshot alongside the active predictor.',
            },
          },
          required: [
            'executiveSummary',
            'primaryRiskDrivers',
            'inspectionChecklist',
            'parameterGuidance',
            'scopeNote',
          ],
        },
      });

      res.json({ diagnosis: parsed, model: MODEL_NAME, generatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('AI snapshot diagnosis error:', err);
      const mapped = extractApiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Endpoint 2: AI Shift & History Pattern Analysis on filtered Prediction History
  app.post('/api/ai/analyze-history', async (req: Request, res: Response) => {
    const payload = validateHistoryPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: 'Provide at least one valid prediction history record to analyze.' });
      return;
    }

    try {
      const { records, filterSummary } = payload;

      const total = records.length;
      const failures = records.filter((r) => r.failureExpected).length;
      const avgRisk = records.reduce((s, r) => s + r.riskPercent, 0) / total;

      const compactTable = records
        .map(
          (r, i) =>
            `${i + 1}. ${r.timestamp} | Type ${r.type} | Air ${r.airTempK}K | Proc ${r.processTempK}K | ${r.rpm}rpm | ${r.torqueNm}Nm | Wear ${r.toolWearMin}m | ${r.failureExpected ? 'FAILURE' : 'NO FAILURE'} (${r.riskPercent.toFixed(1)}%, ${r.level})`
        )
        .join('\n');

      const prompt = `Analyze these ${total} stored CNC prediction history records (Active Filter Scope: ${filterSummary}).
Summary stats: ${failures} FAILURE / ${total - failures} NO FAILURE, Average Risk: ${avgRisk.toFixed(1)}%.

Records (newest first):
${compactTable}

Generate a concise maintenance shift briefing for the Maintenance Engineer and Production Supervisor.`;

      const parsed = await generateStructuredJson<Record<string, unknown>>({
        prompt,
        systemInstruction:
          'You are an industrial reliability analyst summarizing CNC prediction history logs for a maintenance team. Base every statement strictly on the supplied records. Do not invent machine IDs, timestamps, or plant telemetry that are not in the data.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shiftSummary: {
              type: Type.STRING,
              description: '2 to 3 sentence executive overview of the filtered prediction history.',
            },
            detectedPatterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 concrete patterns across product types, sensor readings, or risk levels observed in these records.',
            },
            priorityActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 prioritized maintenance or shift-planning recommendations.',
            },
            dataScopeNote: {
              type: Type.STRING,
              description: 'Short factual disclosure of record count and active filter scope analyzed.',
            },
          },
          required: ['shiftSummary', 'detectedPatterns', 'priorityActions', 'dataScopeNote'],
        },
      });

      res.json({
        analysis: parsed,
        recordCount: total,
        model: MODEL_NAME,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('AI history analysis error:', err);
      const mapped = extractApiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Endpoint 3: AI Engineering Advisor (Interactive Q&A grounded in session telemetry & uploaded RF config)
  app.post('/api/ai/assistant', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body.question !== 'string' || body.question.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid engineering question.' });
      return;
    }

    const question = body.question.trim().slice(0, 600);
    const persona =
      body.persona === 'Production Supervisor' ? 'Production Supervisor' : 'Maintenance Engineer';
    const sessionStats = (body.sessionStats ?? {}) as Record<string, unknown>;
    const total = isFiniteNumber(sessionStats.total) ? sessionStats.total : 0;
    const failures = isFiniteNumber(sessionStats.failures) ? sessionStats.failures : 0;
    const avgRisk = isFiniteNumber(sessionStats.averageRisk) ? sessionStats.averageRisk : null;
    const latestSnapshot = body.latestSnapshot ? validateSnapshotPayload(body.latestSnapshot) : null;

    let mlStatusSummary = 'Prototype RuleBasedPredictor currently active.';
    if (isTrainedModelAvailable()) {
      const info = getTrainedModelInfo();
      const testM = info.evaluation.heldOutTest;
      mlStatusSummary = `CONNECTED TRAINED ML MODEL: ${info.config.model_type} (${info.modelSummary.totalTrees} trees, min_samples_split=${info.config.hyperparameters.min_samples_split}, max_depth=null, seed=${info.config.hyperparameters.random_state}), trained on ${info.sourceDataset.trainRows} AI4I rows and evaluated ONCE on ${info.sourceDataset.testRows} held-out test rows (${info.sourceDataset.testFailures} failures) at optimized_threshold=${info.config.optimized_threshold} (low_risk_limit=${info.config.risk_thresholds.low_risk_limit}). Real Held-Out Test Metrics: Recall=${testM.recall.toFixed(3)}, Precision=${testM.precision.toFixed(3)}, F1=${testM.f1.toFixed(3)}, PR-AUC=${testM.prAuc.toFixed(3)}, ROC-AUC=${testM.rocAuc.toFixed(3)}, Confusion Matrix TP=${testM.confusionMatrix.tp}, FP=${testM.confusionMatrix.fp}, TN=${testM.confusionMatrix.tn}, FN=${testM.confusionMatrix.fn}. Feature importances: ${info.featureImportances.map((fi) => `${fi.key}=${(fi.importance * 100).toFixed(1)}%`).join(', ')}.`;
    }

    const latestContext = latestSnapshot
      ? `Latest Evaluated Snapshot: Type ${latestSnapshot.reading.type}, Air ${latestSnapshot.reading.airTempK} K, Process ${latestSnapshot.reading.processTempK} K (ΔT ${latestSnapshot.prediction.derivedMetrics.temperatureGapK} K), ${latestSnapshot.reading.rpm} rpm, Torque ${latestSnapshot.reading.torqueNm} Nm (Power ${latestSnapshot.prediction.derivedMetrics.powerWatts} W), Tool Wear ${latestSnapshot.reading.toolWearMin} min → ${latestSnapshot.prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'} at ${latestSnapshot.prediction.riskPercent.toFixed(1)}% (${latestSnapshot.prediction.level}).`
      : 'No CNC snapshot has been evaluated yet in this session.';

    try {
      const prompt = `User Role: ${persona}
Project Context: CNC Machine Failure Prediction Using AI and ML (Group 8, NIIT University). Primary dataset: AI4I 2020 (10,000 rows, 3.39% failure rate, 339 failures). Target ML criteria: Recall >= 0.80, Precision >= 0.50 (accuracy is misleading because always predicting "no failure" yields 96.61% accuracy with 0% recall).
${mlStatusSummary}
Session Telemetry: ${total} total predictions (${failures} failures, avg risk ${avgRisk !== null ? `${avgRisk.toFixed(1)}%` : 'N/A'}).
${latestContext}

Question: ${question}`;

      const parsed = await generateStructuredJson<Record<string, unknown>>({
        prompt,
        systemInstruction:
          'You are an AI predictive-maintenance and machine-learning advisor embedded inside a CNC Machine Failure Prediction engineering dashboard. Answer clearly and rigorously for both shop-floor engineers and academic AI/ML course examiners. Quote only the exact measured held-out test metrics provided in the prompt (never invent metrics, never claim live PLC connections or RUL forecasting). Ground every answer in the supplied facts, AI4I 2020 physics, decision theory, and the connected RandomForestClassifier.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directAnswer: {
              type: Type.STRING,
              description: 'Clear, direct 2-4 sentence technical answer.',
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 structured engineering takeaways or justifications.',
            },
            actionableNextStep: {
              type: Type.STRING,
              description: 'One concrete recommendation for the engineer, supervisor, or viva presenter.',
            },
            groundingReference: {
              type: Type.STRING,
              description: 'Short citation of which project data/config/telemetry grounded this answer.',
            },
          },
          required: ['directAnswer', 'keyPoints', 'actionableNextStep', 'groundingReference'],
        },
      });

      res.json({
        reply: parsed,
        model: MODEL_NAME,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('AI assistant error:', err);
      const mapped = extractApiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Endpoint 4: Counterfactual What-If Risk Reduction Advisor
  app.post('/api/ai/what-if', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    const payload = validateSnapshotPayload(body);
    if (!payload) {
      res.status(400).json({ error: 'Invalid CNC snapshot payload for What-If analysis.' });
      return;
    }

    const goal =
      typeof body?.goal === 'string' && body.goal.trim().length > 0
        ? body.goal.trim().slice(0, 240)
        : 'Bring this CNC machine safely into LOW risk (< 30%) without halting production unnecessarily.';

    try {
      const { reading, prediction } = payload;

      const prompt = `Current CNC Snapshot:
- Type: ${reading.type} (Overstrain limit ${prediction.derivedMetrics.overstrainLimit} min·Nm)
- Air Temp: ${reading.airTempK} K | Process Temp: ${reading.processTempK} K (ΔT = ${prediction.derivedMetrics.temperatureGapK} K; HDF breach if ΔT < 8.6 K & RPM < 1380)
- Rotational Speed: ${reading.rpm} rpm
- Torque: ${reading.torqueNm} Nm (Power = ${prediction.derivedMetrics.powerWatts} W; PWF safe window 3500–9000 W)
- Tool Wear: ${reading.toolWearMin} min (TWF breach >= 200 min; OSF wear×torque = ${prediction.derivedMetrics.overstrainProduct} min·Nm)
- Current Risk: ${prediction.riskPercent.toFixed(1)}% (${prediction.level} · ${prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'})

Optimization Goal: ${goal}

Provide concrete counterfactual parameter adjustments ("What-If" changes) that explain how modifying specific operating inputs shifts the physical proximity ratios and reduces failure risk.`;

      const parsed = await generateStructuredJson<Record<string, unknown>>({
        prompt,
        systemInstruction:
          'You are an explainable-AI (XAI) counterfactual advisor for CNC predictive maintenance. Suggest realistic, physically valid counterfactual interventions grounded strictly in the provided sensor readings and documented AI4I 2020 physical boundaries. Do not invent sensor channels not present in the input.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: '2-sentence counterfactual explanation of the fastest lever to lower risk.',
            },
            interventions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  parameter: { type: Type.STRING },
                  currentValue: { type: Type.STRING },
                  suggestedTarget: { type: Type.STRING },
                  expectedImpact: { type: Type.STRING },
                },
                required: ['parameter', 'currentValue', 'suggestedTarget', 'expectedImpact'],
              },
              description: '2 to 4 concrete parameter interventions.',
            },
            tradeoffWarning: {
              type: Type.STRING,
              description: 'One concise engineering caution (e.g., power lower bound or machining throughput trade-off).',
            },
          },
          required: ['summary', 'interventions', 'tradeoffWarning'],
        },
      });

      res.json({
        whatIf: parsed,
        model: MODEL_NAME,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('AI what-if error:', err);
      const mapped = extractApiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Mount Vite middleware in development, or serve built dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CNC Machine Failure Prediction server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
