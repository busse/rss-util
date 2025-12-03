const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { setupSampleData } = require('./setup-sample-data');

const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const CDP_PORT = 9222;
const CDP_URL = `http://localhost:${CDP_PORT}`;

// Ensure screenshots directory exists
async function ensureScreenshotsDir() {
  if (!(await fs.access(screenshotsDir).catch(() => false))) {
    await fs.mkdir(screenshotsDir, { recursive: true });
  }
}

async function waitForCDP(maxWait = 30000) {
  const http = require('http');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(CDP_URL + '/json/version', (res) => {
          if (res.statusCode === 200) {
            console.log('CDP endpoint is ready');
            resolve(true);
          } else {
            reject(new Error(`CDP returned status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('CDP request timeout'));
        });
      });
      return true;
    } catch (error) {
      // CDP not ready yet, continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('CDP endpoint did not become available');
}

async function launchElectron(userDataDir) {
  const electronPath = require('electron');
  const appPath = path.join(__dirname, '..');
  
  // Electron processes --user-data-dir before loading the main script
  // Also set environment variable as backup
  const electronProcess = spawn(electronPath, [
    appPath,
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-sandbox' // May be needed for some environments
  ], {
    stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr for debugging
    env: {
      ...process.env,
      ELECTRON_USER_DATA: userDataDir,
      ELECTRON_IS_DEV: '1'
    }
  });
  
  // Log Electron output for debugging
  electronProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('CDP') || output.includes('9222')) {
      console.log('Electron:', output.trim());
    }
  });
  
  electronProcess.stderr.on('data', (data) => {
    const output = data.toString();
    // Filter out common Electron warnings
    if (!output.includes('Warning') && !output.includes('Deprecation')) {
      console.error('Electron error:', output.trim());
    }
  });
  
  return electronProcess;
}

async function takeScreenshot(page, filename, options = {}) {
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ 
    path: filepath,
    fullPage: options.fullPage || false,
    ...options
  });
  console.log(`Screenshot saved: ${filepath}`);
}

async function main() {
  let electronProcess = null;
  let tempDataDir = null;
  let browser = null;
  
  try {
    await ensureScreenshotsDir();
    
    // Setup sample data
    console.log('Setting up sample data...');
    tempDataDir = await setupSampleData();
    console.log(`Sample data created at: ${tempDataDir}`);
    
    // Launch Electron
    console.log('Launching Electron...');
    electronProcess = await launchElectron(tempDataDir);
    
    // Wait for CDP to be available
    console.log('Waiting for CDP endpoint...');
    await waitForCDP();
    
    // Connect Playwright to Electron via CDP
    console.log('Connecting Playwright to Electron...');
    browser = await chromium.connectOverCDP(CDP_URL);
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
      throw new Error('No browser contexts found');
    }
    
    const pages = contexts[0].pages();
    if (pages.length === 0) {
      throw new Error('No pages found in browser context');
    }
    
    const page = pages[0];
    
    // Wait for the app to load
    console.log('Waiting for app to load...');
    await page.waitForSelector('.sidebar', { timeout: 15000 });
    await page.waitForTimeout(2000); // Additional wait for content to render
    
    // Screenshot 1: Main interface with articles
    console.log('Taking screenshot of main reader interface...');
    // Select an article to show in preview
    await page.evaluate(() => {
      const articleItem = document.querySelector('.article-item');
      if (articleItem) {
        articleItem.click();
      }
    });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'main-interface.png', { fullPage: false });
    
    // Screenshot 2: AI Article Summary
    console.log('Taking screenshot of AI article summary...');
    // Find an article that has an AI summary (article-tc-1)
    // First, make sure we're viewing the right feed
    await page.evaluate(() => {
      // Click on TechCrunch feed
      const feedItems = Array.from(document.querySelectorAll('.feed-item'));
      const techcrunchFeed = feedItems.find(item => {
        const text = item.textContent || '';
        return text.includes('TechCrunch');
      });
      if (techcrunchFeed) {
        techcrunchFeed.click();
      }
    });
    await page.waitForTimeout(1500);
    
    // Select the first article (which should have an AI summary)
    await page.evaluate(() => {
      const articleItem = document.querySelector('.article-item');
      if (articleItem) {
        articleItem.click();
      }
    });
    
    // Wait for AI summary to appear
    await page.waitForSelector('.ai-summary-container', { timeout: 10000 }).catch(() => {
      console.warn('AI summary container not found, continuing anyway...');
    });
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'ai-summary.png', { fullPage: false });
    
    // Screenshot 3: Settings Modal
    console.log('Taking screenshot of settings modal...');
    // Open settings
    await page.evaluate(() => {
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) {
        settingsBtn.click();
      }
    });
    
    // Wait for modal to appear
    await page.waitForSelector('#settingsModal:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Ensure API key is obfuscated (it should be by default as password field)
    await page.evaluate(() => {
      const apiKeyInput = document.getElementById('apiKeyInput');
      if (apiKeyInput) {
        // Set a placeholder value that looks obfuscated
        if (apiKeyInput.type === 'password' && !apiKeyInput.value) {
          apiKeyInput.value = 'sk-proj-...';
        }
      }
    });
    
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'settings.png', { fullPage: false });
    
    // Close settings modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#settingsModal .modal-close');
      if (closeBtn) {
        closeBtn.click();
      }
    });
    await page.waitForTimeout(500);
    
    // Screenshot 4: Feed Management
    console.log('Taking screenshot of feed management interface...');
    
    // Click manage button and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {
        // Navigation might complete before we set up the listener
        console.log('Navigation may have already completed');
      }),
      page.evaluate(() => {
        const manageBtn = document.getElementById('manageFeeds');
        if (manageBtn) {
          manageBtn.click();
        }
      })
    ]);
    
    // Wait for manage.html to load - check for its specific elements
    await page.waitForSelector('.feed-panel, .sidebar-title, .header-title', { timeout: 10000 });
    await page.waitForTimeout(1500); // Wait for content to render
    await takeScreenshot(page, 'feed-management.png', { fullPage: false });
    
    // Screenshot 5: Empty state (optional - would need different data setup)
    // Skipping for now as it requires a different data setup
    
    console.log('All screenshots completed!');
    
  } catch (error) {
    console.error('Error during screenshot capture:', error);
    throw error;
  } finally {
    // Cleanup
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.warn('Error closing browser:', error);
      }
    }
    
    if (electronProcess) {
      console.log('Closing Electron...');
      electronProcess.kill();
      // Wait a bit for process to terminate
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (tempDataDir) {
      console.log('Cleaning up temporary data directory...');
      try {
        await fs.rm(tempDataDir, { recursive: true, force: true });
        console.log('Temporary data directory removed');
      } catch (error) {
        console.warn('Error removing temporary directory:', error);
      }
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

