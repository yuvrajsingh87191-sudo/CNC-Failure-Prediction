import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type OperatorRole = 'Maintenance Engineer' | 'Production Supervisor';

export interface AuthUser {
  name: string;
  email: string;
  role: OperatorRole;
}

interface ClaimedAdminRecord {
  name: string;
  email: string;
  role: OperatorRole;
  saltHex: string;
  hashHex: string;
}

interface TokenPayload {
  jti: string;
  sub: string;
  name: string;
  role: OperatorRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  tokenJti?: string;
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function getConfiguredEnvPasscode(): string | null {
  const raw = process.env.DASHBOARD_ADMIN_PASSCODE;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_DASHBOARD_ADMIN_PASSCODE') return null;
  return trimmed;
}

const SIGNING_SECRET: Buffer = (() => {
  const explicitSecret = process.env.SESSION_SECRET?.trim();
  if (explicitSecret) {
    return crypto.createHash('sha256').update(explicitSecret).digest();
  }
  const envPasscode = getConfiguredEnvPasscode();
  if (envPasscode) {
    return crypto
      .createHash('sha256')
      .update(`cnc-dashboard-session-signing-v1:${envPasscode}`)
      .digest();
  }
  return crypto.randomBytes(32);
})();

// In-memory store for first-run claimed admin hash (never written as plaintext to disk)
let claimedAdmin: ClaimedAdminRecord | null = null;
const revokedTokenIds = new Set<string>();

// Simple per-IP brute-force throttle for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function isEnvPasscodeConfigured(): boolean {
  return getConfiguredEnvPasscode() !== null;
}

export function isAuthInitialized(): boolean {
  return isEnvPasscodeConfigured() || claimedAdmin !== null;
}

export function getAuthStatus(): {
  initialized: boolean;
  envConfigured: boolean;
  claimedEmailHint: string | null;
} {
  const envConfigured = isEnvPasscodeConfigured();
  return {
    initialized: envConfigured || claimedAdmin !== null,
    envConfigured,
    claimedEmailHint: !envConfigured && claimedAdmin ? claimedAdmin.email : null,
  };
}

function hashPassword(password: string, saltHex: string): string {
  return crypto.scryptSync(password, saltHex, 64).toString('hex');
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB) && bufA.length === bufB.length;
}

export function claimFirstRunAdmin(params: {
  name: string;
  email: string;
  role: OperatorRole;
  password: string;
}): { ok: true; user: AuthUser } | { ok: false; status: number; error: string } {
  if (isEnvPasscodeConfigured() || claimedAdmin !== null) {
    return {
      ok: false,
      status: 403,
      error: 'Workspace operator access is already configured. Please sign in with your password.',
    };
  }

  const saltHex = crypto.randomBytes(16).toString('hex');
  const hashHex = hashPassword(params.password, saltHex);

  claimedAdmin = {
    name: params.name,
    email: params.email.toLowerCase(),
    role: params.role,
    saltHex,
    hashHex,
  };

  return {
    ok: true,
    user: {
      name: claimedAdmin.name,
      email: claimedAdmin.email,
      role: claimedAdmin.role,
    },
  };
}

export function verifyLoginCredentials(params: {
  email: string;
  role: OperatorRole;
  password: string;
  clientIp: string;
}): { ok: true; user: AuthUser } | { ok: false; status: number; error: string } {
  const now = Date.now();
  const entry = loginAttempts.get(params.clientIp);
  if (entry && entry.resetAt > now && entry.count >= MAX_LOGIN_ATTEMPTS) {
    return {
      ok: false,
      status: 429,
      error: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
    };
  }

  const recordFailure = () => {
    const current = loginAttempts.get(params.clientIp);
    if (!current || current.resetAt <= now) {
      loginAttempts.set(params.clientIp, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    } else {
      current.count += 1;
    }
  };

  const envPasscode = getConfiguredEnvPasscode();
  const normalizedEmail = params.email.trim().toLowerCase();

  // Configured process.env passcode ALWAYS overrides any claimed fallback hash
  if (envPasscode !== null) {
    if (!constantTimeEquals(params.password, envPasscode)) {
      recordFailure();
      return { ok: false, status: 401, error: 'Invalid credentials. Please verify your passcode.' };
    }
    loginAttempts.delete(params.clientIp);
    const displayName = normalizedEmail.includes('@')
      ? normalizedEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : normalizedEmail || 'Lead Operator';
    return {
      ok: true,
      user: {
        name: displayName,
        email: normalizedEmail,
        role: params.role,
      },
    };
  }

  if (!claimedAdmin) {
    return {
      ok: false,
      status: 400,
      error: 'Workspace access has not been set up yet. Complete first-run setup first.',
    };
  }

  const candidateHash = hashPassword(params.password, claimedAdmin.saltHex);
  const emailMatches = constantTimeEquals(normalizedEmail, claimedAdmin.email);
  const passwordMatches = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'hex'),
    Buffer.from(claimedAdmin.hashHex, 'hex')
  );

  if (!emailMatches || !passwordMatches) {
    recordFailure();
    return { ok: false, status: 401, error: 'Invalid operator email or password.' };
  }

  loginAttempts.delete(params.clientIp);
  return {
    ok: true,
    user: {
      name: claimedAdmin.name,
      email: claimedAdmin.email,
      role: params.role,
    },
  };
}

export function issueBearerToken(user: AuthUser): { token: string; expiresAt: string } {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    jti: crypto.randomBytes(16).toString('hex'),
    sub: user.email,
    name: user.name,
    role: user.role,
    iat: nowSec,
    exp: nowSec + TOKEN_TTL_SECONDS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${sig}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function verifyBearerToken(token: string): { user: AuthUser; jti: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf-8');
  const expBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as TokenPayload;
    if (!parsed || typeof parsed.exp !== 'number' || typeof parsed.jti !== 'string') {
      return null;
    }
    if (revokedTokenIds.has(parsed.jti)) return null;
    if (Math.floor(Date.now() / 1000) >= parsed.exp) return null;
    if (
      parsed.role !== 'Maintenance Engineer' &&
      parsed.role !== 'Production Supervisor'
    ) {
      return null;
    }
    return {
      jti: parsed.jti,
      user: {
        name: String(parsed.name || 'Operator'),
        email: String(parsed.sub || ''),
        role: parsed.role,
      },
    };
  } catch {
    return null;
  }
}

export function revokeToken(jti: string): void {
  revokedTokenIds.add(jti);
}

export function extractBearerToken(req: Request): string | null {
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader.trim().length > 0) {
    return customHeader.trim();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in to access the CNC dashboard API.' });
    return;
  }
  const verified = verifyBearerToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  req.authUser = verified.user;
  req.tokenJti = verified.jti;
  next();
}
