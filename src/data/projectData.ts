import { InputForm } from '../types/domain';

export interface DemoScenario {
  id: 'normal' | 'medium' | 'high-risk' | 'invalid';
  buttonLabel: string;
  title: string;
  description: string;
  expectedOutcome: string;
  sourceReference: string;
  form: InputForm;
}

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'normal',
    buttonLabel: 'Load Normal Example',
    title: 'Normal Operating Snapshot (AI4I UDI 1)',
    description: 'Dataset record 1 (M14860) from ai4i2020.csv under normal cutting parameters.',
    expectedOutcome: 'NO FAILURE · RISK 9% (LOW)',
    sourceReference: 'Report Section 3.5 & TC-16 / TC-34',
    form: {
      type: 'M',
      airTemp: '298.1',
      processTemp: '308.6',
      rpm: '1551',
      torque: '42.8',
      toolWear: '0',
    },
  },
  {
    id: 'medium',
    buttonLabel: 'Load Medium-Risk Example',
    title: 'Approaching Heat Dissipation Threshold',
    description: 'Narrow 8.0 K temperature gap at 1500 rpm (above the 1380 rpm breach cutoff, inside early-warning band).',
    expectedOutcome: 'NO FAILURE · RISK 32% (MEDIUM)',
    sourceReference: 'Report TC-21 (Early Warning Band)',
    form: {
      type: 'M',
      airTemp: '300.0',
      processTemp: '308.0',
      rpm: '1500',
      torque: '40.0',
      toolWear: '45',
    },
  },
  {
    id: 'high-risk',
    buttonLabel: 'Load High-Risk Example',
    title: 'Overstrain Limit Breached (OSF)',
    description: 'Type L part with tool wear 190 min and torque 59 Nm (190 × 59 = 11,210 > 11,000 min·Nm limit).',
    expectedOutcome: 'FAILURE RISK 82% (HIGH)',
    sourceReference: 'Report Section 3.5 Worked Example & TC-18 / TC-35',
    form: {
      type: 'L',
      airTemp: '298.1',
      processTemp: '308.6',
      rpm: '1300',
      torque: '59',
      toolWear: '190',
    },
  },
  {
    id: 'invalid',
    buttonLabel: 'Load Invalid Example',
    title: 'Multi-Field Validation Test (Wireframe W3)',
    description: 'Deliberately triggers empty field, non-integer text, out-of-range torque, and negative tool wear simultaneously.',
    expectedOutcome: '4 simultaneous validation errors, no prediction stored',
    sourceReference: 'Report Wireframe W3 (Figure 4.4) & TC-13 / TC-36',
    form: {
      type: 'L',
      airTemp: '',
      processTemp: '308.6',
      rpm: 'abc',
      torque: '150',
      toolWear: '-1',
    },
  },
];

export const PROJECT_TEAM = {
  group: 'Group 8',
  project: 'CNC Machine Failure Prediction Using AI and ML',
  course: 'Software Engineering (integrated with AI & ML courses)',
  programme: 'B.Tech Computer Science',
  institution: 'NIIT University, Neemrana',
  reportVersion: '1.0, 24 November 2026',
  members: [
    { no: 1, name: 'Yuvraj Singh', enrolmentNo: 'BT24GCS435' },
    { no: 2, name: 'Aarav', enrolmentNo: 'BT24GCS665' },
    { no: 3, name: 'Hiranya', enrolmentNo: 'BT24GCS445' },
  ],
} as const;

export interface TestCaseRecord {
  id: string;
  requirement: string;
  level: 'Unit: Validation' | 'Unit: Prediction' | 'Service / Integration' | 'System / Acceptance (GUI)';
  suite: 'LogicTests' | 'GuiTests';
  scenario: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL' | 'NOT RUN';
}

export const DOCUMENTED_TEST_CASES: readonly TestCaseRecord[] = [
  { id: 'TC-01', requirement: 'FR-01, FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Valid readings are accepted', expected: 'VALID', actual: 'VALID', status: 'PASS' },
  { id: 'TC-02', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Empty air temperature is rejected', expected: 'Air temperature is required.', actual: 'Air temperature is required.', status: 'PASS' },
  { id: 'TC-03', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Non-numeric torque is rejected', expected: 'Torque must be a number.', actual: 'Torque must be a number.', status: 'PASS' },
  { id: 'TC-04', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Torque above the maximum (150) is rejected', expected: 'Torque must be between 1 and 100 Nm.', actual: 'Torque must be between 1 and 100 Nm.', status: 'PASS' },
  { id: 'TC-05', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Boundary: torque exactly 100 is accepted', expected: 'VALID', actual: 'VALID', status: 'PASS' },
  { id: 'TC-06', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Boundary: torque exactly 1 is accepted', expected: 'VALID', actual: 'VALID', status: 'PASS' },
  { id: 'TC-07', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Boundary: torque 0.9 is rejected', expected: 'Torque must be between 1 and 100 Nm.', actual: 'Torque must be between 1 and 100 Nm.', status: 'PASS' },
  { id: 'TC-08', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Decimal rotational speed (1500.5) is rejected', expected: 'Rotational speed must be a whole number.', actual: 'Rotational speed must be a whole number.', status: 'PASS' },
  { id: 'TC-09', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Process temperature not above air temperature is rejected', expected: 'Process temperature must be higher than air temperature.', actual: 'Process temperature must be higher than air temperature.', status: 'PASS' },
  { id: 'TC-10', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Negative tool wear (-1) is rejected', expected: 'Tool wear must be between 0 and 300 min.', actual: 'Tool wear must be between 0 and 300 min.', status: 'PASS' },
  { id: 'TC-11', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Boundary: tool wear 0 and 300 are accepted', expected: 'VALID,VALID', actual: 'VALID,VALID', status: 'PASS' },
  { id: 'TC-12', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: "Unknown product type 'X' is rejected", expected: 'Type must be L, M or H.', actual: 'Type must be L, M or H.', status: 'PASS' },
  { id: 'TC-13', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: 'Several mistakes are all reported together', expected: 'Air temperature is required. | Torque must be a number. | Tool wear must be between 0 and 300 min.', actual: 'Air temperature is required. | Torque must be a number. | Tool wear must be between 0 and 300 min.', status: 'PASS' },
  { id: 'TC-14', requirement: 'FR-02, NFR-03', level: 'Unit: Validation', suite: 'LogicTests', scenario: "'NaN' and 'Infinity' are rejected, application does not fail", expected: 'Torque must be a number., Air temperature must be a number.', actual: 'Torque must be a number., Air temperature must be a number.', status: 'PASS' },
  { id: 'TC-15', requirement: 'FR-02', level: 'Unit: Validation', suite: 'LogicTests', scenario: "Lower-case type 'l' is accepted", expected: 'VALID', actual: 'VALID', status: 'PASS' },
  { id: 'TC-16', requirement: 'FR-03, FR-04', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Dataset record 1 (UDI 1) gives no failure', expected: 'failure=false level=LOW', actual: 'failure=false level=LOW', status: 'PASS' },
  { id: 'TC-17', requirement: 'FR-03', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Dataset records 2 to 5 (UDI 2-5) all give no failure', expected: 'false,false,false,false', actual: 'false,false,false,false', status: 'PASS' },
  { id: 'TC-18', requirement: 'FR-03, FR-04', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Overstrain rule breached (L, wear x torque = 11,210 > 11,000)', expected: 'failure=true level=HIGH', actual: 'failure=true level=HIGH', status: 'PASS' },
  { id: 'TC-19', requirement: 'FR-03', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Tool-wear limit reached (wear 210 min)', expected: 'failure=true level=HIGH', actual: 'failure=true level=HIGH', status: 'PASS' },
  { id: 'TC-20', requirement: 'FR-03', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Heat-dissipation rule breached (diff 8.0 K, 1300 rpm)', expected: 'failure=true level=HIGH', actual: 'failure=true level=HIGH', status: 'PASS' },
  { id: 'TC-21', requirement: 'FR-03, FR-04', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Same small temperature gap at 1500 rpm is only a medium warning', expected: 'failure=false level=MEDIUM', actual: 'failure=false level=MEDIUM', status: 'PASS' },
  { id: 'TC-22', requirement: 'FR-03', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Power too low (3 Nm at 1000 rpm, about 314 W)', expected: 'failure=true level=HIGH', actual: 'failure=true level=HIGH', status: 'PASS' },
  { id: 'TC-23', requirement: 'FR-03', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Power too high (70 Nm at 1400 rpm, about 10,262 W)', expected: 'failure=true level=HIGH', actual: 'failure=true level=HIGH', status: 'PASS' },
  { id: 'TC-24', requirement: 'FR-03, FR-04', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Boundary: reading exactly on the overstrain limit is flagged as early warning (risk 60%)', expected: 'failure=true risk=60.0', actual: 'failure=true risk=60.0', status: 'PASS' },
  { id: 'TC-25', requirement: 'FR-04', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'Risk stays within 0-100 and failure flag matches 50% threshold (grid of 7,020 inputs)', expected: 'ok', actual: 'ok', status: 'PASS' },
  { id: 'TC-26', requirement: 'NFR-01', level: 'Unit: Prediction', suite: 'LogicTests', scenario: 'One validate + predict call finishes in under 1 second', expected: 'under 1000 ms', actual: '~30 ms (incl. JVM warm-up)', status: 'PASS' },
  { id: 'TC-27', requirement: 'FR-05', level: 'Service / Integration', suite: 'LogicTests', scenario: 'A successful prediction is stored in history', expected: '1 record, type M', actual: '1 record, type M', status: 'PASS' },
  { id: 'TC-28', requirement: 'FR-02, FR-05', level: 'Service / Integration', suite: 'LogicTests', scenario: 'Invalid input is not stored and raises field errors', expected: 'InvalidInputException, 1 error(s), history 0', actual: 'InvalidInputException, 1 error(s), history 0', status: 'PASS' },
  { id: 'TC-29', requirement: 'FR-06', level: 'Service / Integration', suite: 'LogicTests', scenario: 'History lists newest first after three predictions', expected: '3 records, newest wear=190', actual: '3 records, newest wear=190', status: 'PASS' },
  { id: 'TC-30', requirement: 'FR-08', level: 'Service / Integration', suite: 'LogicTests', scenario: 'Clearing history empties it', expected: '0', actual: '0', status: 'PASS' },
  { id: 'TC-31', requirement: 'FR-06', level: 'Service / Integration', suite: 'LogicTests', scenario: 'Changing the list returned by history() does not change stored history', expected: '1', actual: '1', status: 'PASS' },
  { id: 'TC-32', requirement: 'NFR-04', level: 'Service / Integration', suite: 'LogicTests', scenario: 'A different FailurePredictor can be plugged in without changing the service', expected: 'risk=77.0 failure=true', actual: 'risk=77.0 failure=true', status: 'PASS' },
  { id: 'TC-33', requirement: 'FR-01', level: 'System / Acceptance (GUI)', suite: 'GuiTests', scenario: 'Window shows type, five reading fields, Predict and Clear', expected: 'all present', actual: 'all present', status: 'PASS' },
  { id: 'TC-34', requirement: 'FR-03, FR-04', level: 'System / Acceptance (GUI)', suite: 'GuiTests', scenario: "Normal reading (dataset record 1) shows 'NO FAILURE' with a risk %", expected: 'NO FAILURE · RISK 9%', actual: 'NO FAILURE · RISK 9%', status: 'PASS' },
  { id: 'TC-35', requirement: 'FR-03, FR-04', level: 'System / Acceptance (GUI)', suite: 'GuiTests', scenario: "Overstrain reading shows 'FAILURE RISK' with a risk % and advice", expected: 'FAILURE RISK 82% | Risk level: HIGH. Schedule an inspection before the next run.', actual: 'FAILURE RISK 82% | Risk level: HIGH. Schedule an inspection before the next run.', status: 'PASS' },
  { id: 'TC-36', requirement: 'FR-02', level: 'System / Acceptance (GUI)', suite: 'GuiTests', scenario: 'Invalid entries show the error messages and clear the old result', expected: 'errors shown, result blank', actual: 'errors shown, result blank', status: 'PASS' },
  { id: 'TC-37', requirement: 'FR-07', level: 'System / Acceptance (GUI)', suite: 'GuiTests', scenario: 'Clear empties every field, message and result', expected: 'empty', actual: 'empty', status: 'PASS' },
  { id: 'TC-38', requirement: 'FR-05, FR-06', level: 'System / Acceptance (GUI)', suite: 'GuiTests', scenario: 'History tab lists the 2 successful predictions, newest first (invalid entry not listed)', expected: '2 rows, newest = Failure', actual: '2 rows, newest = Failure', status: 'PASS' },
];

export type TraceStatus = 'Implemented' | 'Tested' | 'Design Only' | 'Future Enhancement';

export interface RequirementTrace {
  id: string;
  category: 'Functional' | 'Non-Functional';
  qualityOrPriority: string;
  description: string;
  acceptanceCriteria: string;
  designElement: string;
  implementation: string;
  testCases: string;
  statuses: TraceStatus[];
  verdict: string;
}

export const TRACEABILITY_MATRIX: readonly RequirementTrace[] = [
  {
    id: 'FR-01',
    category: 'Functional',
    qualityOrPriority: 'High Priority',
    description: 'Let the user enter product type (L, M or H) and five sensor readings: air temperature, process temperature, rotational speed, torque, and tool wear.',
    acceptanceCriteria: 'All six inputs are on one screen; Type is chosen from a list of L, M, H.',
    designElement: 'Input form, InputForm',
    implementation: 'CncPredictorApp.buildPredictPanel(), InputForm / PredictFailurePage',
    testCases: 'TC-01, TC-33',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-02',
    category: 'Functional',
    qualityOrPriority: 'High Priority',
    description: 'Validate every entry before predicting (required, correct number kind, allowed range, process temperature higher than air temperature) and show a clear message for each problem.',
    acceptanceCriteria: 'Each invalid entry gets its own message and all messages are shown together; no prediction is made; app keeps running.',
    designElement: 'InputValidator, InvalidInputException',
    implementation: 'InputValidator.validate()',
    testCases: 'TC-01 to TC-15, TC-28, TC-36',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-03',
    category: 'Functional',
    qualityOrPriority: 'High Priority',
    description: 'Predict whether the machine is expected to fail (failure or no failure) from a valid reading.',
    acceptanceCriteria: 'Every valid reading gives exactly one outcome. Documented limit breaches report failure; normal records report no failure.',
    designElement: 'FailurePredictor, RuleBasedPredictor',
    implementation: 'RuleBasedPredictor.predict()',
    testCases: 'TC-16 to TC-24, TC-34, TC-35',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-04',
    category: 'Functional',
    qualityOrPriority: 'High Priority',
    description: 'Show risk probability as a percentage (0–100%), a risk level (LOW, MEDIUM, HIGH) and a short advice line.',
    acceptanceCriteria: 'LOW < 30%, MEDIUM 30% to < 50%, HIGH >= 50%. Failure reported when risk >= 50%.',
    designElement: 'Prediction, RiskLevel',
    implementation: 'Prediction.headline(), RiskLevel.fromPercent()',
    testCases: 'TC-16, TC-18, TC-21, TC-24, TC-25, TC-34, TC-35',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-05',
    category: 'Functional',
    qualityOrPriority: 'Medium Priority',
    description: 'Save every successful prediction, with timestamp and readings, in prediction history.',
    acceptanceCriteria: 'After a valid prediction the history has one more record; invalid entries are never saved.',
    designElement: 'PredictionService, PredictionRepository',
    implementation: 'PredictionService.predict(), PredictionRepository.add()',
    testCases: 'TC-27, TC-28, TC-38',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-06',
    category: 'Functional',
    qualityOrPriority: 'Medium Priority',
    description: 'Let the user view the prediction history, newest first.',
    acceptanceCriteria: 'History shows time, type, five readings, result, and risk for every saved prediction.',
    designElement: 'PredictionRepository, History view',
    implementation: 'PredictionRepository.findAll(), CncPredictorApp.refreshHistory() / PredictionHistoryPage',
    testCases: 'TC-29, TC-31, TC-38',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-07',
    category: 'Functional',
    qualityOrPriority: 'Medium Priority',
    description: 'Let the user clear the form, messages, and result to start a new prediction.',
    acceptanceCriteria: 'All fields, messages, and result are emptied; Type returns to its first option.',
    designElement: 'Clear button',
    implementation: 'CncPredictorApp.onClear() / handleClearForm()',
    testCases: 'TC-37',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'FR-08',
    category: 'Functional',
    qualityOrPriority: 'Low Priority',
    description: 'Let the user delete the whole history after a confirmation.',
    acceptanceCriteria: 'History is empty after user confirms; nothing is deleted if user declines.',
    designElement: 'PredictionService, confirmation dialog',
    implementation: 'PredictionService.clearHistory(), PredictionRepository.clear(), ConfirmModal',
    testCases: 'TC-30 (dialog manual)',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Partly verified (deletion tested; dialog not automated in Java)',
  },
  {
    id: 'NFR-01',
    category: 'Non-Functional',
    qualityOrPriority: 'Performance',
    description: 'Validation plus prediction shall complete within 1 second on a standard laptop (guideline allows 2 seconds).',
    acceptanceCriteria: 'Measured < 1000 ms (Java prototype measured ~30 ms including JVM warm-up).',
    designElement: 'Lightweight scoring',
    implementation: 'RuleBasedPredictor',
    testCases: 'TC-26',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'NFR-02',
    category: 'Non-Functional',
    qualityOrPriority: 'Usability',
    description: 'Three-step prediction flow: fill in, press Predict, read result. Example hints on every field; result shown in words as well as colour.',
    acceptanceCriteria: 'Single-screen input & result, units + placeholders visible, color-independent text verdicts.',
    designElement: 'Single-screen layout, example hints, text + colour',
    implementation: 'CncPredictorApp / PredictFailurePage',
    testCases: 'TC-34, TC-35, screenshots',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'NFR-03',
    category: 'Non-Functional',
    qualityOrPriority: 'Reliability',
    description: 'Invalid input (empty, letters, NaN, Infinity, out-of-range numbers) shall never crash or terminate the application unexpectedly.',
    acceptanceCriteria: 'All bad input handled gracefully via field error map.',
    designElement: 'Central validation, exception for field errors',
    implementation: 'InputValidator, PredictionService',
    testCases: 'TC-14, TC-28, TC-36',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'NFR-04',
    category: 'Non-Functional',
    qualityOrPriority: 'Maintainability',
    description: 'Layered architecture with meaningful names, single responsibility per class, and replaceable prediction component behind one interface.',
    acceptanceCriteria: 'Swapping FailurePredictor requires zero changes to UI, validator, service, or repository.',
    designElement: '4 Layers, FailurePredictor interface',
    implementation: 'Whole codebase (FailurePredictor seam)',
    testCases: 'TC-32',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met',
  },
  {
    id: 'NFR-05',
    category: 'Non-Functional',
    qualityOrPriority: 'Portability',
    description: 'Java prototype runs on any standard JDK 17 or later without external libraries; web demo runs in any modern browser without backend dependencies.',
    acceptanceCriteria: 'Compiled and run on JDK 21 with zero external dependencies.',
    designElement: 'Standard JDK only',
    implementation: 'All Java source files (15 files, 602 lines)',
    testCases: 'Built & run on JDK 21 (Section 6)',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met (tested on JDK 21)',
  },
  {
    id: 'NFR-06',
    category: 'Non-Functional',
    qualityOrPriority: 'Security & Privacy',
    description: 'Require authenticated dashboard access with salted password hashing, protected API routes, and role perspectives (Maintenance Engineer vs Production Supervisor).',
    acceptanceCriteria: 'Unauthenticated API requests return 401; login verifies password server-side and issues a signed Bearer session token.',
    designElement: 'Section 3.10 Security Design + server/auth.ts',
    implementation: 'LoginPage + requireAuth Express middleware',
    testCases: 'Auth status / 401 guard / Login / Logout verified',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met (server-verified session auth)',
  },
  {
    id: 'NFR-07',
    category: 'Non-Functional',
    qualityOrPriority: 'Model Quality (ML)',
    description: 'Trained ML model evaluated on held-out 20% stratified AI4I 2020 test split with balanced class weighting and tuned threshold (τ = 0.26).',
    acceptanceCriteria: 'Evaluated on held-out 20% stratified test split (2,000 rows, 68 failures) beating the always-"no failure" baseline.',
    designElement: 'MlModelPredictor + /api/ml/predict',
    implementation: '150-tree RandomForestClassifier (server/rfInference.ts)',
    testCases: 'Recall 0.721, Precision 0.521, ROC-AUC 0.961',
    statuses: ['Implemented', 'Tested'],
    verdict: 'Met (live trained model attached)',
  },
];

export const USE_CASES = [
  {
    id: 'UC-01',
    name: 'Predict machine failure',
    actor: 'Maintenance engineer',
    goal: 'Find out whether a machine is likely to fail and how risky it is',
    mainFlow: [
      'Choose product type (L, M, H) and enter five sensor readings.',
      'Press Predict Failure.',
      'System validates entries (includes UC-02).',
      'System builds SensorReading and queries FailurePredictor.',
      'System displays headline (FAILURE RISK n% or NO FAILURE · RISK n%), risk level, and advice.',
      'System stores the PredictionRecord in history.',
    ],
    alternateFlow: 'One or more entries are invalid: system lists every error message, highlights invalid fields, clears prior result, makes no prediction, and stores nothing.',
    requirements: 'FR-01, FR-03, FR-04, FR-05',
  },
  {
    id: 'UC-02',
    name: 'Validate readings (included by UC-01)',
    actor: 'System',
    goal: 'Ensure only valid, finite, in-range readings reach the predictor',
    mainFlow: [
      'Check no field is empty.',
      'Verify numbers are finite (reject letters, NaN, Infinity) and rpm/tool wear are whole numbers.',
      'Check each value against SRS Section 2.7 ranges.',
      'Check process temperature > air temperature.',
      'Return valid SensorReading or complete field error map.',
    ],
    alternateFlow: 'Any check fails: error is recorded for that field and checking continues so all problems appear at once.',
    requirements: 'FR-02, NFR-03',
  },
  {
    id: 'UC-03',
    name: 'View prediction history',
    actor: 'Maintenance engineer, Production supervisor',
    goal: 'Review past predictions to plan inspections and shift output',
    mainFlow: [
      'Open Prediction History.',
      'System lists every saved prediction newest-first with time, type, five readings, verdict, and risk %.',
    ],
    alternateFlow: 'No predictions saved yet: displays clean empty state.',
    requirements: 'FR-06',
  },
  {
    id: 'UC-04',
    name: 'Reset input form',
    actor: 'Maintenance engineer',
    goal: 'Start a fresh prediction from a clean form',
    mainFlow: [
      'Press Clear.',
      'System empties all five numeric fields, resets Type to first option, and clears errors and result.',
    ],
    alternateFlow: 'None (history remains unchanged).',
    requirements: 'FR-07',
  },
  {
    id: 'UC-05',
    name: 'Clear prediction history',
    actor: 'Maintenance engineer',
    goal: 'Remove all stored prediction records',
    mainFlow: [
      'Press Clear History.',
      'System opens confirmation modal.',
      'User confirms deletion; system removes all records and shows empty table.',
    ],
    alternateFlow: 'User clicks Cancel: nothing is deleted.',
    requirements: 'FR-08',
  },
] as const;

export const AI4I_FAILURE_MODES = [
  { code: 'HDF', name: 'Heat Dissipation Failure', count: 115, rule: 'Temperature gap < 8.6 K and speed < 1,380 rpm' },
  { code: 'OSF', name: 'Overstrain Failure', count: 98, rule: 'Tool wear × torque > 11,000 (L) / 12,000 (M) / 13,000 (H) min·Nm' },
  { code: 'PWF', name: 'Power Failure', count: 95, rule: 'Mechanical power < 3,500 W or > 9,000 W' },
  { code: 'TWF', name: 'Tool Wear Failure', count: 46, rule: 'Tool reaches random wear limit of 200–240 min' },
  { code: 'RNF', name: 'Random Failure', count: 19, rule: 'Random 0.1% chance of failure (inherently unpredictable)' },
] as const;

export const AI4I_SAMPLE_ROWS = [
  { udi: 1, productId: 'M14860', type: 'M', airTemp: 298.1, processTemp: 308.6, rpm: 1551, torque: 42.8, toolWear: 0, failure: 0 },
  { udi: 2, productId: 'L47181', type: 'L', airTemp: 298.2, processTemp: 308.7, rpm: 1408, torque: 46.3, toolWear: 3, failure: 0 },
  { udi: 3, productId: 'L47182', type: 'L', airTemp: 298.1, processTemp: 308.5, rpm: 1498, torque: 49.4, toolWear: 5, failure: 0 },
  { udi: 4, productId: 'L47183', type: 'L', airTemp: 298.2, processTemp: 308.6, rpm: 1433, torque: 39.5, toolWear: 7, failure: 0 },
  { udi: 5, productId: 'L47184', type: 'L', airTemp: 298.2, processTemp: 308.7, rpm: 1408, torque: 40.0, toolWear: 9, failure: 0 },
] as const;

export const ML_WORKFLOW_STEPS = [
  { step: 1, title: 'Data Collection', detail: 'AI4I 2020 (10,000 rows, CC BY 4.0) primary dataset; Kaggle 1,000-row secondary dataset kept strictly separate as negative control.' },
  { step: 2, title: 'Preprocessing', detail: 'Verify zero missing values, drop UDI/Product ID identifiers and the 5 failure-mode leakage flags, encode Product Type (L/M/H), and scale numeric inputs.' },
  { step: 3, title: 'Feature Engineering', detail: 'Engineer domain features: Temperature Gap (Process Temp − Air Temp) and Mechanical Power (Torque × RPM × 2π / 60).' },
  { step: 4, title: 'Model Training', detail: 'Stratified 80/20 train/test split with fixed random seed and class weights to counter the 3.39% severe class imbalance.' },
  { step: 5, title: 'Model Comparison', detail: 'Benchmark Logistic Regression (baseline), Decision Tree, Random Forest, and Gradient Boosting on identical folds.' },
  { step: 6, title: 'Cross-Validation', detail: 'Stratified 5-fold cross-validation on the training split to tune hyperparameters without touching the held-out test set.' },
  { step: 7, title: 'Threshold Tuning', detail: 'Calibrate decision threshold targeting Recall >= 0.80 with Precision >= 0.50 (minimizing costly missed failures / false negatives).' },
  { step: 8, title: 'Prediction & Deployment', detail: 'Export best model + scaler/encoder and plug into the application via MlModelPredictor implementing FailurePredictor.' },
] as const;

export const MODELS_CONSIDERED = [
  { name: 'Logistic Regression', role: 'Interpretable linear baseline', notes: 'With class_weight="balanced"; establishes baseline recall and precision.' },
  { name: 'Decision Tree', role: 'Non-linear rule-learning tree', notes: 'Captures threshold splits cleanly; prone to variance without pruning.' },
  { name: 'Random Forest', role: 'Bagged tree ensemble', notes: 'Handles feature interactions (wear × torque, temp gap × speed) with lower variance.' },
  { name: 'Gradient Boosting', role: 'Boosted tree ensemble', notes: 'Strong candidate for tabular physical interactions and calibrated probabilities.' },
] as const;

export const SQL_SCHEMA = `CREATE TABLE product_type (
  product_type     CHAR(1) PRIMARY KEY CHECK (product_type IN ('L','M','H')),
  overstrain_limit INTEGER NOT NULL
);

CREATE TABLE sensor_reading (
  reading_id       INTEGER PRIMARY KEY,
  product_type     CHAR(1) NOT NULL REFERENCES product_type(product_type),
  air_temp_k       REAL NOT NULL CHECK (air_temp_k BETWEEN 290 AND 310),
  process_temp_k   REAL NOT NULL CHECK (process_temp_k BETWEEN 300 AND 320),
  rpm              INTEGER NOT NULL CHECK (rpm BETWEEN 500 AND 4000),
  torque_nm        REAL NOT NULL CHECK (torque_nm BETWEEN 1 AND 100),
  tool_wear_min    INTEGER NOT NULL CHECK (tool_wear_min BETWEEN 0 AND 300)
);

CREATE TABLE prediction_record (
  record_id        INTEGER PRIMARY KEY,
  created_at       TIMESTAMP NOT NULL,
  reading_id       INTEGER NOT NULL UNIQUE REFERENCES sensor_reading(reading_id),
  risk_percent     REAL NOT NULL CHECK (risk_percent BETWEEN 0 AND 100),
  failure_expected BOOLEAN NOT NULL,
  risk_level       VARCHAR(6) NOT NULL CHECK (risk_level IN ('LOW','MEDIUM','HIGH'))
);`;

export const DESIGN_DECISIONS = [
  { decision: 'Layered architecture (4 layers)', rationale: 'Matches guideline and UI / logic / data separation; easy to explain and maintain.', alternative: 'Single monolithic class' },
  { decision: 'FailurePredictor interface', rationale: 'Decouples model from app so trained ML model drops in later; enables stub testing (TC-32).', alternative: 'Hard-coding rules inside PredictionService' },
  { decision: 'Rule-based stand-in predictor', rationale: 'Makes prototype demonstrable and testable using documented AI4I physical rules.', alternative: 'Dummy or random output' },
  { decision: 'In-memory / Local repository', rationale: 'Sufficient for prototype without external DB setup; swappable for JDBC/SQLite/MySQL later.', alternative: 'Immediate relational DB dependency' },
  { decision: 'Centralized InputValidator', rationale: 'Shared across UI front ends and independently unit-testable without launching a window.', alternative: 'Inline checks inside button handlers' },
  { decision: 'Immutable data records', rationale: 'SensorReading, Prediction, and PredictionRecord cannot mutate after creation; safe data carriers.', alternative: 'Mutable POJOs with setters' },
  { decision: 'Report all errors together', rationale: 'Engineer fixes all invalid fields in a single pass instead of playing whack-a-mole.', alternative: 'Fail-fast on first invalid field' },
  { decision: 'Verdict in text + colour', rationale: 'Colour alone is inaccessible (NFR-02); every state displays explicit words and icons.', alternative: 'Colour-coded banner only' },
] as const;


export const DOCUMENTATION_CARDS = [
  { section: 'Section 1', title: 'Project Proposal', status: 'Completed', summary: 'Problem statement, target users (Maintenance Engineer & Production Supervisor), objectives O1–O6, strict in-scope vs out-of-scope boundaries, and risk mitigation.' },
  { section: 'Section 2', title: 'Software Requirements Specification (SRS)', status: 'Completed', summary: 'IEEE 29148-structured FR-01 through FR-08, NFR-01 through NFR-07, external interfaces, Use Cases UC-01 to UC-05, data ranges, and acceptance criteria.' },
  { section: 'Section 3', title: 'Software Design Document (SDD)', status: 'Completed', summary: 'IEEE 1016-structured 4-layer architecture, UML class/sequence/activity/DFD/ER/deployment diagrams, RuleBasedPredictor math, SQL schema, and traceability matrix.' },
  { section: 'Section 4', title: 'Wireframes & UI Design', status: 'Completed', summary: 'Low-fidelity wireframes W1 (empty), W2 (result), W3 (validation errors), W4 (history), W5 (clear confirmation) and navigation state machine.' },
  { section: 'Section 5 & Appendix A', title: 'Java Implementation', status: 'Completed', summary: '15 plain Java source files (602 lines) in src/cnc with Swing GUI (CncPredictorApp), ConsoleApp, zero external dependencies, plus ~380 lines of tests.' },
  { section: 'Section 6', title: 'Testing & Evidence', status: 'Completed', summary: '38 test cases (32 LogicTests + 6 GuiTests), all 38 passing, defect log (DEF-01 closed), test environment notes, and SRS acceptance verification.' },
  { section: 'Section 7', title: 'Quality Review & Rubric', status: 'Completed', summary: 'Traceability audit, Guideline Section 10 quality checklist, and 15-mark evaluation rubric mapping across all project deliverables.' },
] as const;

export const RUBRIC_COVERAGE = [
  { component: 'Problem definition and scope', marks: 1, section: 'Section 1' },
  { component: 'SRS (Requirements, Use Cases, Data Rules)', marks: 4, section: 'Section 2' },
  { component: 'SDD / Architecture / UML Diagrams', marks: 4, section: 'Section 3' },
  { component: 'Wireframe / UI Design', marks: 2, section: 'Section 4' },
  { component: 'Java Implementation', marks: 2, section: 'Section 5 & Appendix A' },
  { component: 'Testing and Traceability', marks: 2, section: 'Sections 3.12, 6 & 7' },
] as const;
