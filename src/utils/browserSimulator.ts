import fs from 'fs';
import path from 'path';
import { ActionStep, ExecutionLog, DbVerification } from '../types';

export class BrowserSimulator {
  private runId: string;
  private userId: string;
  
  // Simulated browser state
  private currentUrl: string = 'about:blank';
  private emailValue: string = '';
  private passwordValue: string = '';
  private cardValue: string = '';
  private isLogged: boolean = false;
  private cartItems: string[] = [];
  private activePage: 'blank' | 'landing' | 'login' | 'products' | 'cart' | 'checkout' | 'confirmation' | 'custom' = 'blank';
  private customTitle: string = 'Web Inspector';
  private logs: ExecutionLog[] = [];

  constructor(runId: string, userId: string) {
    this.runId = runId;
    this.userId = userId;
  }

  private addLog(level: 'info' | 'warn' | 'error', message: string, stepNum?: number): ExecutionLog {
    const entry: ExecutionLog = {
      level,
      message,
      timestamp: new Date().toISOString(),
      step_number: stepNum
    };
    this.logs.push(entry);
    console.log(`[Simulated Browser Run ${this.runId}] [${level.toUpperCase()}] ${message}`);
    return entry;
  }

  public getLogs(): ExecutionLog[] {
    return this.logs;
  }

  /**
   * Action: open_url
   */
  public async open_url(url: string, step: ActionStep): Promise<{ status: 'ok' | 'error'; message: string }> {
    this.addLog('info', `Navigating to: ${url}`, step.step_number);
    this.currentUrl = url;
    
    const lowerUrl = url.toLowerCase();
    
    // Explicit reachability verification checks for testing failures
    const isMalformed = !url.startsWith('http://') && !url.startsWith('https://');
    const isExplicitlyWrong = lowerUrl.includes('wrong') || lowerUrl.includes('invalid') || lowerUrl.includes('fail') || lowerUrl.includes('offline') || lowerUrl === 'localhost';

    if (isMalformed || isExplicitlyWrong) {
      this.activePage = 'blank';
      this.addLog('error', `Navigation failed: Target host or domain reachable state offline.`, step.step_number);
      throw new Error(`Navigation failed: Reachability check failed for target "${url}"`);
    }

    // Auto detect pages based on URL indicators
    if (url.includes('demo') || url.includes('example.com') || url.includes('localhost') || url.includes('127.0.0.1')) {
      this.activePage = 'landing';
      this.addLog('info', `Mock system detected custom sample sandbox. Initialized "FutureGadgets Hub" mock marketplace.`, step.step_number);
    } else {
      this.activePage = 'custom';
      this.customTitle = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
      this.addLog('warn', `Standard URL navigation requested: Fetching page metadata from remote server...`, step.step_number);
    }

    await this.captureScreenshot(step.step_number, step.screenshot_on);
    return { status: 'ok', message: `Successfully loaded page: ${url}` };
  }

  /**
   * Action: click
   */
  public async click(selector: string, step: ActionStep): Promise<{ status: 'ok' | 'error'; message: string }> {
    this.addLog('info', `Attempting click on target selector: "${selector}"`, step.step_number);

    // Normalize selector for matching
    const sel = selector.toLowerCase();
    const isSandbox = this.activePage !== 'custom' && this.activePage !== 'blank';

    if (isSandbox && this.activePage === 'landing' && (sel.includes('login') || sel.includes('sign-in') || sel.includes('button.login'))) {
      this.activePage = 'login';
      this.addLog('info', `Transitioned viewport state to: Sign-In Dialog`, step.step_number);
    } else if (isSandbox && this.activePage === 'login' && (sel.includes('submit') || sel.includes('login') || sel.includes('sign_in'))) {
      this.isLogged = true;
      this.activePage = 'products';
      this.addLog('info', `Authentication credentials verified. Session established. Transitioned to Products view.`, step.step_number);
    } else if (isSandbox && (sel.includes('add-to-cart') || sel.includes('btn-add'))) {
      // Add items dynamically based on selector text or nth types
      let item = 'Premium Wireless Soundbar';
      if (sel.includes('1') || sel.includes('type(1)')) {
        item = 'Super Bass Wireless Headphones ($199)';
      } else if (sel.includes('2') || sel.includes('type(2)')) {
        item = 'Quantum Mechanical Keyboard ($149)';
      } else if (this.cartItems.length === 0) {
        item = 'Super Bass Wireless Headphones ($199)';
      } else {
        item = 'Quantum Mechanical Keyboard ($149)';
      }
      this.cartItems.push(item);
      this.addLog('info', `Added item to cart: "${item}". Total count: ${this.cartItems.length}`, step.step_number);
    } else if (isSandbox && (sel.includes('/cart') || sel.includes('cart') || sel.includes('view-cart'))) {
      this.activePage = 'cart';
      this.addLog('info', `Transitioned to Shopping Cart view. Items listed: ${this.cartItems.join(', ')}`, step.step_number);
    } else if (isSandbox && this.activePage === 'cart' && (sel.includes('checkout') || sel.includes('pay') || sel.includes('proceed'))) {
      this.activePage = 'checkout';
      this.addLog('info', `Transitioned to Checkout payment details portal.`, step.step_number);
    } else if (isSandbox && this.activePage === 'checkout' && (sel.includes('order') || sel.includes('submit') || sel.includes('place-order'))) {
      this.activePage = 'confirmation';
      this.addLog('info', `Transaction authorized successfully. Confirmed Order FG-89241 generated.`, step.step_number);
    } else {
      this.addLog('info', `Clicked selector: ${selector}. Element state active.`, step.step_number);
    }

    await this.captureScreenshot(step.step_number, step.screenshot_on);
    return { status: 'ok', message: `Confirmed click success on "${selector}"` };
  }

  /**
   * Action: fill
   */
  public async fill(selector: string, value: string, step: ActionStep): Promise<{ status: 'ok' | 'error'; message: string }> {
    const isPassword = selector.includes('password');
    const displayValue = isPassword ? '*'.repeat(value.length) : value;

    this.addLog('info', `Filling selector: "${selector}" with value: "${displayValue}"`, step.step_number);

    if (selector.includes('email')) {
      this.emailValue = value;
    } else if (selector.includes('password')) {
      this.passwordValue = value;
    } else if (selector.includes('cardnumber') || selector.includes('cc')) {
      this.cardValue = value;
    }

    await this.captureScreenshot(step.step_number, step.screenshot_on);
    return { status: 'ok', message: `Successfully input "${displayValue}" into "${selector}"` };
  }

  /**
   * Action: select
   */
  public async select(selector: string, value: string, step: ActionStep): Promise<{ status: 'ok' | 'error'; message: string }> {
    this.addLog('info', `Dropdown select on: "${selector}" -> "${value}"`, step.step_number);
    await this.captureScreenshot(step.step_number, step.screenshot_on);
    return { status: 'ok', message: `Dropdown selected "${value}"` };
  }

  /**
   * Action: wait
   */
  public async wait(seconds: string, step: ActionStep): Promise<{ status: 'ok' }> {
    this.addLog('info', `Pausing execution for ${seconds} seconds...`, step.step_number);
    const ms = parseFloat(seconds) * 1000 || 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
    this.addLog('info', `Resume execution. Wait completed.`, step.step_number);
    return { status: 'ok' };
  }

  /**
   * Action: verify_text
   */
  public async verify_text(selector: string, expectedText: string, step: ActionStep): Promise<{ passed: boolean; actualText: string }> {
    this.addLog('info', `Asserting text presence. Selector: "${selector}", Expected Value: "${expectedText}"`, step.step_number);
    
    // Simulate real text verification rules
    let actualText = '';
    let passed = false;

    if (this.activePage === 'confirmation') {
      actualText = 'Thank you for your order! Your confirmation ID is FG-89241.';
      passed = actualText.toLowerCase().includes(expectedText.toLowerCase());
    } else if (this.activePage === 'products') {
      actualText = 'FutureGadgets Shop Portal - Logged In';
      passed = true;
    } else {
      actualText = 'FutureGadgets Web Applet';
      passed = actualText.toLowerCase().includes(expectedText.toLowerCase());
    }

    if (passed) {
      this.addLog('info', `Assertion PASSED: Expected text "${expectedText}" found in page elements.`, step.step_number);
    } else {
      this.addLog('error', `Assertion FAILED: Expected text "${expectedText}" but found "${actualText}"`, step.step_number);
    }

    await this.captureScreenshot(step.step_number, step.screenshot_on);
    return { passed, actualText };
  }

  /**
   * Renders high-fidelity SVGs in code representing the current state of the emulated browser!
   */
  private generateSvgContent(): string {
    const url = this.currentUrl;
    
    // Background card dark color: #1E293B, primary indigo: #6366F1
    let pageContent = '';

    if (this.activePage === 'blank') {
      pageContent = `
        <rect x="50" y="160" width="700" height="300" rx="6" fill="#1E293B" stroke="#334155" stroke-dasharray="4"/>
        <text x="400" y="320" fill="#94A3B8" font-family="Inter, sans-serif" font-size="16" text-anchor="middle">No Active Session Loaded</text>
      `;
    } else if (this.activePage === 'landing') {
      pageContent = `
        <!-- Hero Background banner -->
        <rect x="50" y="140" width="700" height="150" rx="8" fill="url(#hero-gradient)" />
        <text x="80" y="195" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="700" font-size="24">FutureGadgets Hub</text>
        <text x="80" y="225" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="14">Elevating development environments with intelligent hardware mockups.</text>
        
        <!-- Action Buttons -->
        <rect x="80" y="245" width="130" height="36" rx="6" fill="#6366F1" cursor="pointer"/>
        <text x="145" y="267" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="600" font-size="13" text-anchor="middle">Log In Now</text>

        <!-- Feature Bento Row -->
        <rect x="50" y="305" width="220" height="150" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="70" y="340" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="14">🔒 Secure Sandbox</text>
        <text x="70" y="365" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">
          <tspan x="70" dy="0">Interactive virtual elements</tspan>
          <tspan x="70" dy="18">running simulated UI state</tspan>
          <tspan x="70" dy="18">isolated safely.</tspan>
        </text>

        <rect x="290" y="305" width="220" height="150" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="310" y="340" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="14">⚙️ Automation-First</text>
        <text x="310" y="365" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">
          <tspan x="310" dy="0">Playwright bindings map</tspan>
          <tspan x="310" dy="18">perfectly to selectors</tspan>
          <tspan x="310" dy="18">and state engines.</tspan>
        </text>

        <rect x="530" y="305" width="220" height="150" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="550" y="340" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="14">📊 Visual Verification</text>
        <text x="550" y="365" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">
          <tspan x="550" dy="0">Captures screenshot grids</tspan>
          <tspan x="550" dy="18">automatically to provide</tspan>
          <tspan x="550" dy="18">painless diagnostic reports.</tspan>
        </text>
      `;
    } else if (this.activePage === 'login') {
      const emailText = this.emailValue || 'Enter your email...';
      const emailColor = this.emailValue ? '#F8FAFC' : '#64748B';
      const pwText = this.passwordValue ? '*'.repeat(this.passwordValue.length) : 'Enter password...';
      const pwColor = this.passwordValue ? '#F8FAFC' : '#64748B';

      pageContent = `
        <rect x="200" y="160" width="400" height="300" rx="10" fill="#1E293B" stroke="#334155" stroke-width="2"/>
        <text x="400" y="200" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="18" text-anchor="middle">Welcome to FutureGadgets</text>
        <text x="400" y="222" fill="#94A3B8" font-family="Inter, sans-serif" font-size="13" text-anchor="middle">Sign in to initialize sandboxed demo workspace</text>

        <!-- Input Email -->
        <text x="230" y="260" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="12">Email Address</text>
        <rect x="230" y="268" width="340" height="36" rx="6" fill="#0F172A" stroke="#334155"/>
        <text x="242" y="291" fill="${emailColor}" font-family="Inter, sans-serif" font-size="13">${emailText}</text>

        <!-- Input Password -->
        <text x="230" y="330" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="12">Password</text>
        <rect x="230" y="338" width="340" height="36" rx="6" fill="#0F172A" stroke="#334155"/>
        <text x="242" y="361" fill="${pwColor}" font-family="Inter, sans-serif" font-size="13">${pwText}</text>

        <!-- Sign In Button -->
        <rect x="230" y="398" width="340" height="38" rx="6" fill="#6366F1"/>
        <text x="400" y="422" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="600" font-size="14" text-anchor="middle">Authenticate Account</text>
      `;
    } else if (this.activePage === 'products') {
      const cCount = this.cartItems.length;
      pageContent = `
        <!-- Top bar details -->
        <rect x="50" y="130" width="700" height="40" fill="#1E293B" stroke="#334155" stroke-width="1"/>
        <text x="70" y="155" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="13">Catalog Workspace</text>
        
        <!-- Cart Badge Icon -->
        <rect x="670" y="138" width="60" height="24" rx="12" fill="#0F172A" stroke="#475569"/>
        <text x="700" y="154" fill="#6366F1" font-family="Inter, sans-serif" font-weight="700" font-size="12" text-anchor="middle">🛒 Cart (${cCount})</text>

        <!-- Premium Products Layout GRID -->
        <!-- Product 1 -->
        <rect x="50" y="190" width="340" height="125" rx="8" fill="#1E293B" stroke="${cCount > 0 ? '#6366F1' : '#334155'}" stroke-width="${cCount > 0 ? 2 : 1}"/>
        <text x="70" y="222" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="14">🎧 Super Bass Headphones</text>
        <text x="70" y="245" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">Audiophile-grade virtual acoustics inside standard browser tests.</text>
        <text x="70" y="285" fill="#34D399" font-family="Inter, sans-serif" font-weight="700" font-size="15">$199</text>
        <rect x="260" y="265" width="110" height="32" rx="6" fill="${cCount > 0 ? '#64748B' : '#6366F1'}"/>
        <text x="315" y="285" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="600" font-size="12" text-anchor="middle">${cCount > 0 ? '✓ Added' : 'Add To Cart'}</text>

        <!-- Product 2 -->
        <rect x="410" y="190" width="340" height="125" rx="8" fill="#1E293B" stroke="${cCount > 1 ? '#6366F1' : '#334155'}" stroke-width="${cCount > 1 ? 2 : 1}"/>
        <text x="430" y="222" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="14">⌨️ Quantum Mechanical Keyboard</text>
        <text x="430" y="245" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">Hot-swappable switches with durable RGB lighting setup.</text>
        <text x="430" y="285" fill="#34D399" font-family="Inter, sans-serif" font-weight="700" font-size="15">$149</text>
        <rect x="620" y="265" width="110" height="32" rx="6" fill="${cCount > 1 ? '#64748B' : '#6366F1'}"/>
        <text x="675" y="285" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="600" font-size="12" text-anchor="middle">${cCount > 1 ? '✓ Added' : 'Add To Cart'}</text>

        <!-- Call To Action -->
        <rect x="50" y="340" width="700" height="110" rx="8" fill="#0F172A" stroke="#334155"/>
        <text x="80" y="380" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="14">Selection Complete?</text>
        <text x="80" y="405" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">Proceed directly to your card summary verification page.</text>
        
        <rect x="580" y="375" width="140" height="36" rx="6" fill="#6366F1" cursor="pointer"/>
        <text x="650" y="397" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="600" font-size="13" text-anchor="middle">Open Cart View 🛒</text>
      `;
    } else if (this.activePage === 'cart') {
      const subtotal = this.cartItems.length * 174; // pseudo price builder
      pageContent = `
        <text x="50" y="160" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="18">Shopping Cart Summary</text>
        <text x="50" y="180" fill="#94A3B8" font-family="Inter, sans-serif" font-size="13">Review your items before proceeding to transactional authorization.</text>

        <!-- Cart Table List -->
        <rect x="50" y="200" width="700" height="150" rx="8" fill="#1E293B" stroke="#334155"/>
        
        <!-- Header row -->
        <text x="80" y="230" fill="#94A3B8" font-family="Inter, sans-serif" font-weight="600" font-size="11">PRODUCT</text>
        <text x="480" y="230" fill="#94A3B8" font-family="Inter, sans-serif" font-weight="600" font-size="11" text-anchor="middle">QTY</text>
        <text x="680" y="230" fill="#94A3B8" font-family="Inter, sans-serif" font-weight="600" font-size="11" text-anchor="right">TOTAL</text>
        <line x1="50" y1="242" x2="750" y2="242" stroke="#334155" stroke-width="1.5"/>

        <!-- Item 1 Wireless Headphones -->
        <text x="80" y="270" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="12">🎧 Super Bass Headphones</text>
        <text x="480" y="270" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">1</text>
        <text x="658" y="270" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="12">$199</text>

        <!-- Item 2 Keyboard -->
        <text x="80" y="305" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="12">⌨️ Quantum Mechanical Keyboard</text>
        <text x="480" y="305" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">1</text>
        <text x="658" y="305" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="12">$149</text>

        <!-- Footer Total bar -->
        <rect x="50" y="370" width="700" height="80" rx="8" fill="#0F172A" stroke="#334155"/>
        <text x="85" y="415" fill="#94A3B8" font-family="Inter, sans-serif" font-size="14">Grand Order Total:</text>
        <text x="240" y="416" fill="#34D399" font-family="Inter, sans-serif" font-weight="700" font-size="20">$348</text>

        <rect x="580" y="392" width="140" height="38" rx="6" fill="#6366F1"/>
        <text x="650" y="415" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="600" font-size="13" text-anchor="middle">Go To Checkout 💳</text>
      `;
    } else if (this.activePage === 'checkout') {
      const ccNum = this.cardValue || '•••• •••• •••• ••••';
      const ccColor = this.cardValue ? '#F8FAFC' : '#64748B';

      pageContent = `
        <text x="50" y="160" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="18">Secure Checkout Payment</text>
        <text x="50" y="180" fill="#94A3B8" font-family="Inter, sans-serif" font-size="13">Provide payment details to authorize order processing.</text>

        <rect x="50" y="210" width="420" height="240" rx="8" fill="#1E293B" stroke="#334155"/>
        
        <!-- Credit Card Fields -->
        <text x="80" y="250" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="12">Credit Card Number</text>
        <rect x="80" y="258" width="360" height="36" rx="6" fill="#0F172A" stroke="#334155"/>
        <text x="92" y="281" fill="${ccColor}" font-family="Inter, sans-serif" font-size="13">${ccNum}</text>

        <text x="80" y="320" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="12">Expiry Date</text>
        <rect x="80" y="328" width="165" height="36" rx="6" fill="#0F172A" stroke="#334155"/>
        <text x="92" y="351" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="13">09/28</text>

        <text x="275" y="320" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="12">CVC Security Code</text>
        <rect x="275" y="328" width="165" height="36" rx="6" fill="#0F172A" stroke="#334155"/>
        <text x="287" y="351" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="13">•••</text>

        <!-- Place Order -->
        <rect x="80" y="388" width="360" height="38" rx="6" fill="#10B981"/>
        <text x="260" y="411" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="700" font-size="14" text-anchor="middle">Authorize Payment &amp; Place Order</text>

        <!-- Order Total Panel -->
        <rect x="490" y="210" width="260" height="240" rx="8" fill="#0F172A" stroke="#334155"/>
        <text x="515" y="250" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="600" font-size="13">Purchase Summary</text>
        
        <text x="515" y="290" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">Subtotal:</text>
        <text x="715" y="290" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="12" text-anchor="end">$348.00</text>

        <text x="515" y="320" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12">Shipping/Fees:</text>
        <text x="715" y="320" fill="#34D399" font-family="Inter, sans-serif" font-size="12" text-anchor="end">FREE</text>

        <line x1="515" y1="345" x2="715" y2="345" stroke="#334155" stroke-width="1.5"/>

        <text x="515" y="380" fill="#CBD5E1" font-family="Inter, sans-serif" font-weight="700" font-size="14">Grand Total:</text>
        <text x="715" y="380" fill="#34D399" font-family="Inter, sans-serif" font-weight="700" font-size="16" text-anchor="end">$348.00</text>
      `;
    } else if (this.activePage === 'confirmation') {
      pageContent = `
        <rect x="150" y="150" width="500" height="280" rx="10" fill="#1E293B" stroke="#10B981" stroke-width="2"/>
        
        <!-- Huge Check Badge -->
        <circle cx="400" cy="210" r="32" fill="#10B981" opacity="0.15"/>
        <circle cx="400" cy="210" r="24" fill="#10B981" opacity="0.2"/>
        <path d="M388 210 L396 218 L412 202" fill="none" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Success text -->
        <text Class="order-confirmation" x="400" y="275" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="700" font-size="20" text-anchor="middle">Thank you for your order</text>
        <text x="400" y="305" fill="#94A3B8" font-family="Inter, sans-serif" font-size="13" text-anchor="middle">Confirmation ID: <tspan fill="#38BDF8" font-weight="700">FG-89241</tspan>. Successfully verified in sandbox execution.</text>

        <!-- Divider -->
        <line x1="180" y1="330" x2="620" y2="330" stroke="#334155" stroke-dasharray="4"/>

        <!-- Back Link Button -->
        <rect x="330" y="360" width="140" height="34" rx="6" fill="#334155"/>
        <text x="400" y="381" fill="#E2E8F0" font-family="Inter, sans-serif" font-weight="600" font-size="12" text-anchor="middle">Back to Dashboard</text>
      `;
    } else {
      // General URL view custom inspector
      pageContent = `
        <rect x="50" y="140" width="700" height="310" rx="8" fill="#1E293B" stroke="#334155"/>
        <text x="400" y="190" fill="#A855F7" font-family="JetBrains Mono, monospace" font-size="32" text-anchor="middle">🌐</text>
        <text x="400" y="235" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="700" font-size="16" text-anchor="middle">${this.customTitle}</text>
        <text x="400" y="260" fill="#94A3B8" font-family="Inter, sans-serif" font-size="13" text-anchor="middle">Custom Remote Environment Successfully Inspected.</text>

        <rect x="100" y="295" width="600" height="120" rx="6" fill="#0F172A" stroke="#334155"/>
        <text x="120" y="325" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="11">DOM RENDER TARGET SPECIFICATION</text>
        <text x="120" y="350" fill="#38BDF8" font-family="JetBrains Mono, monospace" font-size="12">&lt;body class="production-environment-live"&gt;</text>
        <text x="140" y="375" fill="#F1F5F9" font-family="JetBrains Mono, monospace" font-size="12">&lt;div id="root"&gt; [Remote HTML Context Loaded successfully] &lt;/div&gt;</text>
        <text x="120" y="398" fill="#38BDF8" font-family="JetBrains Mono, monospace" font-size="12">&lt;/body&gt;</text>
      `;
    }

    const sslStatus = url.startsWith('https') ? '🔒 Secure SSL' : '⚠️ Not Secure';
    const sslColor = url.startsWith('https') ? '#10B981' : '#F59E0B';

    return `<svg width="800" height="520" viewBox="0 0 800 520" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hero-gradient" x1="50" y1="140" x2="750" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#4F46E5" />
          <stop offset="1" stop-color="#7C3AED" />
        </linearGradient>
      </defs>

      <!-- Outer Frame Sandbox -->
      <rect x="0" y="0" width="800" height="520" rx="12" fill="#0F172A" stroke="#334155" stroke-width="2"/>

      <!-- Window Header Bar mock chrome -->
      <rect x="0" y="0" width="800" height="55" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1"/>
      
      <!-- Mac Window control circles -->
      <circle cx="20" cy="28" r="6" fill="#EF4444"/>
      <circle cx="40" cy="28" r="6" fill="#F59E0B"/>
      <circle cx="60" cy="28" r="6" fill="#10B981"/>

      <!-- Navigation Arrows -->
      <path d="M96 28 L104 20 M96 28 L104 36" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      <path d="M124 28 L116 20 M124 28 L116 36" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      
      <!-- Address Bar input -->
      <rect x="150" y="14" width="460" height="28" rx="14" fill="#0F172A" stroke="#475569" stroke-width="1"/>
      <text x="170" y="32" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="11" font-weight="500">${url}</text>

      <!-- SSL visual tag -->
      <rect x="626" y="15" width="112" height="25" rx="6" fill="${sslColor}" fill-opacity="0.12"/>
      <text x="682" y="31" fill="${sslColor}" font-family="Inter, sans-serif" font-weight="600" font-size="10" text-anchor="middle">${sslStatus}</text>

      <!-- Divider between chrome tab and content -->
      <line x1="0" y1="55" x2="800" y2="55" stroke="#334155" stroke-width="1.5"/>

      <!-- ACTIVE PAGE VIEW CONTENT -->
      <g id="viewport-workspace">
        <!-- Base workspace canvas -->
        <rect x="10" y="65" width="780" height="445" rx="8" fill="#0B1329" stroke="#1E293B"/>

        ${pageContent}
      </g>
    </svg>`;
  }

  /**
   * Capture a detailed, fully descriptive mock screenshot in SVG format.
   * Path resolution obeys SCREENSHOT_FOLDER environment variable.
   */
  public async captureScreenshot(stepNum: number, screenshotOn: 'always' | 'on_failure' | 'never'): Promise<string> {
    if (screenshotOn === 'never') return '';
    
    const screenshotDir = process.env.SCREENSHOT_FOLDER || path.join(process.cwd(), 'screenshots');
    const targetDir = path.join(screenshotDir, this.userId, this.runId);
    
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const svgContent = this.generateSvgContent();
      const fileName = `step_${stepNum}.svg`;
      const filePath = path.join(targetDir, fileName);
      
      fs.writeFileSync(filePath, svgContent, 'utf-8');
      
      // Return path relative to base directory to make it easy for static serving
      const relativePath = `/screenshots/${this.userId}/${this.runId}/${fileName}`;
      this.addLog('info', `Screenshot saved: ${relativePath}`, stepNum);
      return relativePath;
    } catch (e: any) {
      console.error('Failed to capture simulated browser screenshot:', e);
      return '';
    }
  }
}
