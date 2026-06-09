import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { dbService } from './src/db/dbService';
import { generateActionPlan, generateSuggestions } from './src/utils/gemini';
import { BrowserSimulator } from './src/utils/browserSimulator';
import { ActionPlan, ActionStep, TestRun } from './src/types';

// Ensure required environment dirs exist
const SCREENSHOT_FOLDER = process.env.SCREENSHOT_FOLDER || path.join(process.cwd(), 'screenshots');
const REPORT_FOLDER = process.env.REPORT_FOLDER || path.join(process.cwd(), 'reports');

if (!fs.existsSync(SCREENSHOT_FOLDER)) fs.mkdirSync(SCREENSHOT_FOLDER, { recursive: true });
if (!fs.existsSync(REPORT_FOLDER)) fs.mkdirSync(REPORT_FOLDER, { recursive: true });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and UrlEncoded parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve screenshots and reports statically
  app.use('/screenshots', express.static(SCREENSHOT_FOLDER));
  app.use('/reports', express.static(REPORT_FOLDER));

  // Create HTTP Server
  const server = http.createServer(app);

  // Initialize WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // Map of active run WS clients for real-time log streaming
  const activeWsClients = new Map<string, WebSocket[]>();

  server.on('upgrade', (request, socket, head) => {
    const urlObj = new URL(request.url || '', `http://${request.headers.host}`);
    if (urlObj.pathname === '/api/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request) => {
    const urlObj = new URL(request.url || '', `http://${request.headers.host}`);
    const runId = urlObj.searchParams.get('run_id');

    if (runId) {
      if (!activeWsClients.has(runId)) {
        activeWsClients.set(runId, []);
      }
      activeWsClients.get(runId)!.push(ws);
      console.log(`WebSocket: client connected for run_id: ${runId}`);
    }

    ws.on('close', () => {
      if (runId && activeWsClients.has(runId)) {
        const clients = activeWsClients.get(runId)!;
        activeWsClients.set(runId, clients.filter(c => c !== ws));
        if (activeWsClients.get(runId)!.length === 0) {
          activeWsClients.delete(runId);
        }
      }
      console.log(`WebSocket: client closed connection`);
    });
  });

  // Helper function to broadcast WS updates
  function broadcastWS(runId: string, message: any) {
    const clients = activeWsClients.get(runId);
    if (clients) {
      clients.forEach(wsClient => {
        if (wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(JSON.stringify(message));
        }
      });
    }
  }

  // Pure Tokenless Helper Authentication Middleware (Simulated JWT Auth)
  function getAuthenticatedUserId(req: express.Request): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const email = authHeader.replace('Bearer ', '').trim();
      const user = dbService.getUserByEmail(email);
      if (user) return user.id;
    }
    // Fallback for easy API testing and demo profiles
    return 'demo-user-id';
  }

  // --- 1. Authentication Endpoints ---
  app.post('/api/auth/register', (req, res) => {
    const { email, full_name, password } = req.body;
    if (!email || !full_name || !password) {
      return res.status(400).json({ error: 'Missing registration details' });
    }
    try {
      const passwordHash = `$2a$10$SIMULATED_BCRYPT_${Buffer.from(password).toString('base64')}`;
      const user = dbService.createUser(email, full_name, passwordHash);
      res.json({ token: user.email, user: { id: user.id, email: user.email, full_name: user.full_name } });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing login credentials' });
    }
    const user = dbService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Simple password check bypass for demo/hackathon ease
    res.json({ token: user.email, user: { id: user.id, email: user.email, full_name: user.full_name } });
  });

  app.get('/api/auth/profile', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const user = dbService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profiles not found' });
    }
    res.json({ id: user.id, email: user.email, full_name: user.full_name });
  });

  // --- 2. Test Cases Endpoints ---
  app.post('/api/tests/create', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { title, test_prompt, sample_app } = req.body;
    if (!title || !test_prompt) {
      return res.status(400).json({ error: 'Title and natural language prompt are required' });
    }

    try {
      // 1. Save Test Case
      const tc = dbService.createTestCase(userId, title, test_prompt);

      // 2. Generate Action Plan & AI Suggestions asynchronously/promptly
      const actionPlan = await generateActionPlan(test_prompt, sample_app);
      const suggestions = await generateSuggestions(test_prompt);

      dbService.addAISuggestions(tc.id, suggestions);

      res.json({
        test_case: tc,
        action_plan: actionPlan,
        suggestions
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save test' });
    }
  });

  app.get('/api/tests', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const cases = dbService.getTestCases(userId);
    res.json(cases);
  });

  app.get('/api/tests/:id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const tc = dbService.getTestCaseById(req.params.id, userId);
    if (!tc) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    const suggestions = dbService.getAISuggestions(tc.id);
    res.json({ test_case: tc, suggestions });
  });

  app.delete('/api/tests/:id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    // Row level verification check
    const tc = dbService.getTestCaseById(req.params.id, userId);
    if (!tc) {
      return res.status(404).json({ error: 'Test case not found or access denied' });
    }
    // Quick inline filter deletion representing database transaction delete
    fs.readFile(path.join(process.cwd(), 'tests_db.json'), 'utf-8', (err, data) => {
      if (!err && data) {
        const db = JSON.parse(data);
        db.test_cases = db.test_cases.filter((c: any) => c.id !== req.params.id);
        db.ai_suggestions = db.ai_suggestions.filter((s: any) => s.test_case_id !== req.params.id);
        fs.writeFileSync(path.join(process.cwd(), 'tests_db.json'), JSON.stringify(db, null, 2));
      }
      res.json({ message: 'Success' });
    });
  });

  // --- 3. Test Execution Endpoints ---
  app.post('/api/execution/start', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { test_case, sample_app_url, credentials, prompt, title, action_plan } = req.body;

    let targetPrompt = prompt || '';
    let targetTitle = title || 'Untitled English Test';
    let targetCaseId = '';

    // If test case model provided is already existing
    if (test_case) {
      const tc = dbService.getTestCaseById(test_case, userId);
      if (tc) {
        targetPrompt = tc.test_prompt;
        targetTitle = tc.title;
        targetCaseId = tc.id;
      }
    }

    if (!targetPrompt && !action_plan) {
      return res.status(400).json({ error: 'Failed: Must provide natural language test instructions, a valid test case ID, or a custom pre-generated action plan.' });
    }

    try {
      // Create test case if not existing yet (to link history correctly)
      if (!targetCaseId) {
        const tc = dbService.createTestCase(userId, targetTitle, targetPrompt);
        targetCaseId = tc.id;
      }

      // Generate action plan using Gemini (or use the one passed directly)
      const plan: ActionPlan = action_plan || await generateActionPlan(targetPrompt, sample_app_url, credentials);

      // Create Test Run db record
      const run = dbService.createTestRun(targetCaseId, userId);
      dbService.addExecutionSteps(run.id, plan.steps);

      // Start Async Background Execution
      runBrowserAutomation(run.id, userId, plan);

      res.json({
        test_run_id: run.id,
        test_name: plan.test_name,
        action_plan: plan
      });

    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Execution setup error' });
    }
  });

  app.get('/api/execution/history', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const runs = dbService.getTestRuns(userId).map(run => {
      const full = dbService.getFullTestRun(run.id, userId);
      return {
        id: run.id,
        title: full?.testCaseName || 'NL Test Action Plan',
        status: run.status,
        started_at: run.started_at,
        execution_time: run.execution_time,
        final_result: run.final_result
      };
    });
    res.json(runs);
  });

  app.get('/api/execution/:id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const full = dbService.getFullTestRun(req.params.id, userId);
    if (!full) {
      return res.status(404).json({ error: 'Execution run logs not found' });
    }
    res.json(full);
  });

  // --- 4. Reports Endpoints ---
  app.get('/api/reports/:run_id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const report = dbService.getReportByRunId(req.params.run_id);
    if (!report) {
      return res.status(404).json({ error: 'JSON report outline is not generated yet for this run.' });
    }
    
    try {
      const contents = fs.readFileSync(report.report_file_path, 'utf-8');
      res.json(JSON.parse(contents));
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve raw payload' });
    }
  });

  app.get('/api/reports/download/:run_id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const report = dbService.getReportByRunId(req.params.run_id);
    if (!report) {
      return res.status(404).json({ error: 'Report not ready' });
    }
    res.setHeader('Content-disposition', `attachment; filename=report_${req.params.run_id}.json`);
    res.setHeader('Content-type', 'application/json');
    const filestream = fs.createReadStream(report.report_file_path);
    filestream.pipe(res);
  });

  app.get('/api/ai/suggestions/:test_case_id', (req, res) => {
    const suggestions = dbService.getAISuggestions(req.params.test_case_id);
    res.json(suggestions);
  });

  // --- Background Browser Runner with Step WebSockets ---
  async function runBrowserAutomation(runId: string, userId: string, plan: ActionPlan) {
    const simulator = new BrowserSimulator(runId, userId);
    dbService.updateTestRun(runId, { status: 'Running' });
    
    const startTime = Date.now();
    const stepsRunDetail: any[] = [];
    let isStillHealthy = true;
    let failedStepDetails: string[] = [];

    // Emit initial launch log
    const initialLog = {
      type: 'log',
      payload: {
        level: 'info',
        message: 'Browser automation driver initialized. Loading headless sandbox browser...',
        timestamp: new Date().toISOString()
      }
    };
    broadcastWS(runId, initialLog);

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!isStillHealthy) {
        // Mark subsequent steps as skipped/failed
        stepsRunDetail.push({
          step_number: step.step_number,
          action: step.action,
          status: 'Failed',
          actual_result: 'Skipped active execution due to upstream failure',
          screenshot_path: ''
        });
        continue;
      }

      // 1. Emit Step update running
      broadcastWS(runId, {
        type: 'step_update',
        payload: {
          step_number: step.step_number,
          status: 'running',
          timestamp: new Date().toISOString(),
          details: { action: step.action, target: step.target, value: step.value }
        }
      });

      // Emit Step execution details console log
      broadcastWS(runId, {
        type: 'log',
        payload: {
          level: 'info',
          message: `Executing Step ${step.step_number}: ${step.action.toUpperCase()} target "${step.target}"`,
          timestamp: new Date().toISOString()
        }
      });

      // Brief sleep for realistic automation latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      let stepResultSuccess = true;
      let actualTextReceived = '';
      let relativeScreenshotPath = '';

      try {
        if (step.action === 'open_url') {
          await simulator.open_url(step.target, step);
        } else if (step.action === 'click') {
          await simulator.click(step.target, step);
        } else if (step.action === 'fill') {
          await simulator.fill(step.target, step.value || '', step);
        } else if (step.action === 'select') {
          await simulator.select(step.target, step.value || '', step);
        } else if (step.action === 'wait') {
          await simulator.wait(step.target || '1', step);
        } else if (step.action === 'verify_text') {
          const res = await simulator.verify_text(step.target, step.value || '', step);
          stepResultSuccess = res.passed;
          actualTextReceived = res.actualText;
        } else if (step.action === 'screenshot') {
          await simulator.captureScreenshot(step.step_number, 'always');
        }

        // Locate created screenshot relative path
        const fileName = `step_${step.step_number}.svg`;
        const screenshotDir = path.join(SCREENSHOT_FOLDER, userId, runId);
        const screenshotFile = path.join(screenshotDir, fileName);
        if (fs.existsSync(screenshotFile)) {
          relativeScreenshotPath = `/screenshots/${userId}/${runId}/${fileName}`;
          // Emit Screenshot WS broadcast
          broadcastWS(runId, {
            type: 'screenshot',
            payload: {
              step_number: step.step_number,
              file_path: relativeScreenshotPath,
              timestamp: new Date().toISOString()
            }
          });
        }

        // Set Database screenshots log
        if (relativeScreenshotPath) {
          dbService.addScreenshot(runId, step.step_number, relativeScreenshotPath);
        }

      } catch (err: any) {
        stepResultSuccess = false;
        actualTextReceived = err.message || 'Execution error';
      }

      const outcomeStatus = stepResultSuccess ? 'Passed' : 'Failed';
      if (!stepResultSuccess) {
        isStillHealthy = false;
        failedStepDetails.push(`Step ${step.step_number} failed: ${actualTextReceived || 'Assertion check mismatch'}`);
      }

      // Add to running report steps
      stepsRunDetail.push({
        step_number: step.step_number,
        action: step.action,
        status: outcomeStatus,
        actual_result: actualTextReceived || 'Step successfully executed',
        screenshot_path: relativeScreenshotPath
      });

      // Verify specific verification plan records
      const associatedVerify = plan.verifications.find(v => v.step_number === step.step_number);
      if (associatedVerify) {
        const verifyStatus = stepResultSuccess ? 'Passed' : 'Failed';
        dbService.addVerification(
          runId, 
          step.step_number, 
          associatedVerify.expected, 
          actualTextReceived || 'Verified', 
          verifyStatus
        );
      }

      // Emit Step status update passed/failed
      broadcastWS(runId, {
        type: 'step_update',
        payload: {
          step_number: step.step_number,
          status: stepResultSuccess ? 'passed' : 'failed',
          timestamp: new Date().toISOString(),
          details: { message: `Step ${step.step_number} marked ${outcomeStatus.toUpperCase()}` }
        }
      });

      // Emit Step outcome console log
      broadcastWS(runId, {
        type: 'log',
        payload: {
          level: stepResultSuccess ? 'info' : 'error',
          message: `Step ${step.step_number} Completed: ${outcomeStatus.toUpperCase()} - ${actualTextReceived || 'Successful interaction.'}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    const completedTime = Date.now();
    const durationSeconds = Math.round((completedTime - startTime) / 1000);
    const finalResultState = isStillHealthy ? 'Passed' : 'Failed';

    dbService.updateTestRun(runId, {
      status: finalResultState,
      completed_at: new Date().toISOString(),
      execution_time: durationSeconds,
      final_result: finalResultState
    });

    // Compile Verifications payload for reporting output
    const runVerifications = dbService.getVerifications(runId).map(rv => ({
      step_number: rv.step_number,
      expected: rv.expected_result,
      actual: rv.actual_result,
      status: rv.verification_status
    }));

    // Compile Final JSON Report structure (Save to REPORT_FOLDER)
    const reportPayload = {
      test_run_id: runId,
      test_name: plan.test_name,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date(completedTime).toISOString(),
      execution_time_seconds: durationSeconds,
      steps: stepsRunDetail,
      verifications: runVerifications,
      final_result: isStillHealthy ? 'TEST PASSED' : 'TEST FAILED',
      report_file_path: path.join(REPORT_FOLDER, userId, `${runId}.json`)
    };

    // Save final report file to disk
    const reportUserDir = path.join(REPORT_FOLDER, userId);
    if (!fs.existsSync(reportUserDir)) {
      fs.mkdirSync(reportUserDir, { recursive: true });
    }
    const reportFilePath = path.join(reportUserDir, `${runId}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(reportPayload, null, 2), 'utf-8');

    // Persist Report to Db table
    dbService.addReport(runId, reportFilePath);

    const checkStatusText = isStillHealthy ? 'TEST PASSED' : 'TEST FAILED';
    const failureSummaryText = isStillHealthy 
      ? `Successfully completed all ${plan.steps.length} test steps inside mock sandbox environment.` 
      : `Test failed during execution. Failures in step sequence: ${failedStepDetails.join(', ')}`;

    // Emit Final Report output WS stream
    broadcastWS(runId, {
      type: 'final_report',
      payload: {
        report_path: `/reports/${userId}/${runId}.json`,
        final_result: checkStatusText,
        summary: failureSummaryText
      }
    });

    console.log(`[Simulator Runner] Finished run execution: ${runId} - Final Result: ${checkStatusText}`);
  }

  // --- 5. Mount Vite Middleware for UI Frontend Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server listener
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`NL Browser Test Agent REST + WebSocket dev server booted at live port http://0.0.0.0:${PORT}`);
  });
}

startServer();
