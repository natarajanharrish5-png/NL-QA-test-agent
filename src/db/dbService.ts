import fs from 'fs';
import path from 'path';
import { 
  User, 
  TestCase, 
  TestRun, 
  ActionStep, 
  DbVerification, 
  DbScreenshot, 
  AISuggestion, 
  DbReport,
  TestRunFull
} from '../types';

const DB_FILE = path.join(process.cwd(), 'tests_db.json');

interface Schema {
  users: User[];
  test_cases: TestCase[];
  test_runs: TestRun[];
  execution_steps: { id: string; test_run_id: string; step: ActionStep }[];
  verifications: DbVerification[];
  screenshots: DbScreenshot[];
  ai_suggestions: AISuggestion[];
  reports: DbReport[];
}

const DEFAULT_DB: Schema = {
  users: [
    {
      id: 'demo-user-id',
      full_name: 'Demo QA Engineer',
      email: 'demo@example.com',
      password_hash: '$2a$10$DEMO_HASH_PLACEHOLDER', // bcrypt simulator compatible
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'jafar-user-id',
      full_name: 'Jafar Khan',
      email: 'jafarkhanali56@gmail.com',
      password_hash: '$2a$10$DEMO_HASH_PLACEHOLDER',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  test_cases: [],
  test_runs: [],
  execution_steps: [],
  verifications: [],
  screenshots: [],
  ai_suggestions: [],
  reports: []
};

class DbService {
  private schema: Schema;

  constructor() {
    this.schema = { ...DEFAULT_DB };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        this.schema = JSON.parse(data);
        // Ensure defaults are populated
        if (!this.schema.users) this.schema.users = [...DEFAULT_DB.users];
        if (!this.schema.test_cases) this.schema.test_cases = [];
        if (!this.schema.test_runs) this.schema.test_runs = [];
        if (!this.schema.execution_steps) this.schema.execution_steps = [];
        if (!this.schema.verifications) this.schema.verifications = [];
        if (!this.schema.screenshots) this.schema.screenshots = [];
        if (!this.schema.ai_suggestions) this.schema.ai_suggestions = [];
        if (!this.schema.reports) this.schema.reports = [];
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to load database file, resetting to default:', e);
      this.schema = { ...DEFAULT_DB };
      this.save();
    }
  }

  private save() {
    try {
      // Ensure the directory exists
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save to database file:', e);
    }
  }

  // Users Table Operations
  public getUserByEmail(email: string): User | undefined {
    this.load();
    return this.schema.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    this.load();
    return this.schema.users.find(u => u.id === id);
  }

  public createUser(email: string, fullName: string, passwordHash: string): User {
    this.load();
    const existing = this.getUserByEmail(email);
    if (existing) {
      throw new Error('User already exists with this email');
    }
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      full_name: fullName,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.schema.users.push(newUser);
    this.save();
    return newUser;
  }

  // Test Cases Operations
  public createTestCase(userId: string, title: string, prompt: string): TestCase {
    this.load();
    const newCase: TestCase = {
      id: 'tc_' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      title: title,
      test_prompt: prompt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.schema.test_cases.push(newCase);
    this.save();
    return newCase;
  }

  public getTestCases(userId: string): TestCase[] {
    this.load();
    // Row level privacy
    return this.schema.test_cases.filter(tc => tc.user_id === userId);
  }

  public getTestCaseById(id: string, userId: string): TestCase | undefined {
    this.load();
    const tc = this.schema.test_cases.find(c => c.id === id);
    if (tc && tc.user_id === userId) {
      return tc;
    }
    return undefined;
  }

  // Test Runs Operations
  public createTestRun(testCaseId: string, userId: string): TestRun {
    this.load();
    const newRun: TestRun = {
      id: 'run_' + Math.random().toString(36).substr(2, 9),
      test_case_id: testCaseId,
      user_id: userId,
      status: 'Pending',
      started_at: new Date().toISOString()
    };
    this.schema.test_runs.push(newRun);
    this.save();
    return newRun;
  }

  public updateTestRun(id: string, updates: Partial<TestRun>): TestRun {
    this.load();
    const runIndex = this.schema.test_runs.findIndex(r => r.id === id);
    if (runIndex === -1) {
      throw new Error('Test run not found');
    }
    const updated = {
      ...this.schema.test_runs[runIndex],
      ...updates
    } as TestRun;
    this.schema.test_runs[runIndex] = updated;
    this.save();
    return updated;
  }

  public getTestRun(id: string, userId: string): TestRun | undefined {
    this.load();
    const run = this.schema.test_runs.find(r => r.id === id);
    if (run && run.user_id === userId) {
      return run;
    }
    return undefined;
  }

  public getTestRuns(userId: string): TestRun[] {
    this.load();
    return this.schema.test_runs.filter(r => r.user_id === userId);
  }

  // Execution Steps Operations
  public addExecutionSteps(runId: string, steps: ActionStep[]) {
    this.load();
    const items = steps.map(step => ({
      id: 'step_' + Math.random().toString(36).substr(2, 12),
      test_run_id: runId,
      step
    }));
    this.schema.execution_steps.push(...items);
    this.save();
  }

  public getExecutionSteps(runId: string): ActionStep[] {
    this.load();
    return this.schema.execution_steps
      .filter(es => es.test_run_id === runId)
      .map(es => es.step)
      .sort((a, b) => a.step_number - b.step_number);
  }

  // Verifications Operations
  public addVerification(runId: string, stepNumber: number, expected: string, actual: string, status: 'Passed' | 'Failed'): DbVerification {
    this.load();
    const item: DbVerification = {
      id: 'ver_' + Math.random().toString(36).substr(2, 9),
      test_run_id: runId,
      step_number: stepNumber,
      expected_result: expected,
      actual_result: actual,
      verification_status: status,
      created_at: new Date().toISOString()
    };
    this.schema.verifications.push(item);
    this.save();
    return item;
  }

  public getVerifications(runId: string): DbVerification[] {
    this.load();
    return this.schema.verifications.filter(v => v.test_run_id === runId);
  }

  // Screenshots Table Operations
  public addScreenshot(runId: string, stepNumber: number, file_path: string): DbScreenshot {
    this.load();
    const item: DbScreenshot = {
      id: 'scr_' + Math.random().toString(36).substr(2, 9),
      test_run_id: runId,
      step_number: stepNumber,
      file_path: file_path,
      captured_at: new Date().toISOString()
    };
    this.schema.screenshots.push(item);
    this.save();
    return item;
  }

  public getScreenshots(runId: string): DbScreenshot[] {
    this.load();
    return this.schema.screenshots.filter(s => s.test_run_id === runId);
  }

  // AI Suggestions Operations
  public addAISuggestions(testCaseId: string, suggestions: string[]) {
    this.load();
    // Clear old ones for this test case
    this.schema.ai_suggestions = this.schema.ai_suggestions.filter(s => s.test_case_id !== testCaseId);
    
    const items = suggestions.map(text => ({
      id: 'sug_' + Math.random().toString(36).substr(2, 9),
      test_case_id: testCaseId,
      suggestion_text: text,
      created_at: new Date().toISOString()
    }));
    this.schema.ai_suggestions.push(...items);
    this.save();
  }

  public getAISuggestions(testCaseId: string): AISuggestion[] {
    this.load();
    return this.schema.ai_suggestions.filter(s => s.test_case_id === testCaseId);
  }

  // Reports Operations
  public addReport(runId: string, reportFilePath: string): DbReport {
    this.load();
    const item: DbReport = {
      id: 'rep_' + Math.random().toString(36).substr(2, 9),
      test_run_id: runId,
      report_file_path: reportFilePath,
      generated_at: new Date().toISOString()
    };
    this.schema.reports.push(item);
    this.save();
    return item;
  }

  public getReportByRunId(runId: string): DbReport | undefined {
    this.load();
    return this.schema.reports.find(r => r.test_run_id === runId);
  }

  // Fetch complete details of a test run
  public getFullTestRun(runId: string, userId: string): TestRunFull | undefined {
    const run = this.getTestRun(runId, userId);
    if (!run) return undefined;

    const testCase = this.schema.test_cases.find(tc => tc.id === run.test_case_id);
    const steps = this.getExecutionSteps(runId);
    const verifications = this.getVerifications(runId);
    const screenshots = this.getScreenshots(runId);
    const report = this.getReportByRunId(runId);

    return {
      run,
      testCaseName: testCase ? testCase.title : 'NL Browser Test Run',
      testPrompt: testCase ? testCase.test_prompt : '',
      steps,
      verifications,
      screenshots,
      report
    };
  }

  // Get statistics for dashboard
  public getUserStats(userId: string) {
    this.load();
    const runs = this.schema.test_runs.filter(r => r.user_id === userId);
    const totalRuns = runs.length;
    const passedRuns = runs.filter(r => r.final_result === 'Passed').length;
    const failedRuns = runs.filter(r => r.final_result === 'Failed').length;
    
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
    
    const completedRuns = runs.filter(r => r.execution_time !== undefined);
    const totalTime = completedRuns.reduce((sum, r) => sum + (r.execution_time || 0), 0);
    const averageExecutionTime = completedRuns.length > 0 ? Math.round(totalTime / completedRuns.length) : 0;
    
    const activeTests = runs.filter(r => r.status === 'Running' || r.status === 'Pending').length;

    return {
      passRate,
      totalRuns,
      averageExecutionTime,
      activeTests,
      failedRuns,
      passedRuns
    };
  }
}

export const dbService = new DbService();
