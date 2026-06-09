export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: string;
  user_id: string;
  title: string;
  test_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: string;
  test_case_id: string;
  user_id: string;
  status: 'Pending' | 'Running' | 'Passed' | 'Failed';
  started_at: string;
  completed_at?: string;
  execution_time?: number; // in seconds
  final_result?: 'Passed' | 'Failed';
}

export type ActionType = 'open_url' | 'click' | 'fill' | 'select' | 'screenshot' | 'verify_text' | 'wait' | 'close';

export interface ActionStep {
  step_number: number;
  action: ActionType;
  target: string;
  value: string | null;
  timeout_seconds: number;
  retry: number;
  screenshot_on: 'always' | 'on_failure' | 'never';
  execution_status?: 'Pending' | 'Running' | 'Passed' | 'Failed';
  error_message?: string;
}

export interface VerificationPlan {
  step_number: number;
  type: 'text' | 'element' | 'url' | 'status_code';
  expected: string;
  actual?: string;
  status?: 'Passed' | 'Failed';
}

export interface ActionPlan {
  test_name: string;
  steps: ActionStep[];
  verifications: VerificationPlan[];
  metadata: {
    sample_app?: string;
    credentials_ref?: string;
  };
}

export interface ExecutionLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  step_number?: number;
}

export interface DbVerification {
  id: string;
  test_run_id: string;
  step_number: number;
  expected_result: string;
  actual_result: string;
  verification_status: 'Passed' | 'Failed';
  created_at: string;
}

export interface DbScreenshot {
  id: string;
  test_run_id: string;
  step_number: number;
  file_path: string;
  captured_at: string;
}

export interface AISuggestion {
  id: string;
  test_case_id: string;
  suggestion_text: string;
  created_at: string;
}

export interface DbReport {
  id: string;
  test_run_id: string;
  report_file_path: string;
  generated_at: string;
}

export interface TestRunFull {
  run: TestRun;
  testCaseName: string;
  testPrompt: string;
  steps: ActionStep[];
  verifications: DbVerification[];
  screenshots: DbScreenshot[];
  report?: DbReport;
}
