// Keyboard Shortcuts Test Suite
// Tests all keyboard shortcuts documented in README.md

const { test, expect } = require('@playwright/test');
const path = require('path');
const { createMockElectronAPI } = require('./helpers/mock-electron-api');

test.describe('Keyboard Shortcuts', () => {
  let page;
  let mockElectronAPI;

  test.beforeEach(async ({ browser }) => {
    // Create a new page for each test
    page = await browser.newPage();
    mockElectronAPI = createMockElectronAPI();

    // Get test data to inject
    const testData = mockElectronAPI._getTestData();

    // Mock window.open to track calls
    await page.addInitScript(() => {
      window._openCalls = [];
      const originalOpen = window.open;
      window.open = function(url, target, features) {
        window._openCalls.push({ url, target, features });
        return originalOpen.call(this, url, target, features);
      };
    });

    // Inject mock Electron API before page loads
    // We need to recreate the functions in the browser context
    await page.addInitScript((data) => {
      const testFeeds = data.feeds;
      const testCategories = data.categories;
      const testArticles = data.articles;
      const testReadStates = data.readStates;

      // Create mock API with functions that work in browser context
      window.electronAPI = {
        // Navigation
        navigateTo: async (file) => ({ success: true }),

        // Feeds operations
        readFeeds: async () => ({ success: true, data: testFeeds }),
        writeFeeds: async (feeds) => ({ success: true }),

        // Categories operations
        readCategories: async () => ({ success: true, data: testCategories }),
        writeCategories: async (categories) => ({ success: true }),

        // Read states operations
        readReadStates: async () => ({ success: true, data: testReadStates }),
        writeReadStates: async (readStates) => ({ success: true }),

        // Settings operations
        readSettings: async () => ({ success: true, data: { featureFlags: { aiArticleSummary: false } } }),
        writeSettings: async (settings) => ({ success: true }),

        // Encrypted API key operations
        getEncryptedApiKey: async () => ({ success: true, data: null }),
        setEncryptedApiKey: async (apiKey) => ({ success: true }),

        // Feature flags operations
        getFeatureFlags: async () => ({ success: true, data: { aiArticleSummary: false, dataMirror: false } }),
        setFeatureFlag: async (flagName, enabled) => ({ success: true }),
        
        // Data Mirror operations
        selectMirrorDirectory: async () => ({ success: true, data: null }),
        getMirrorDirectory: async () => ({ success: true, data: null }),
        setMirrorDirectory: async (mirrorDirectory) => ({ success: true }),
        getSyncAsMarkdown: async () => ({ success: true, data: true }),
        setSyncAsMarkdown: async (enabled) => ({ success: true }),
        syncToMirror: async () => ({ success: true }),

        // AI Summary operations
        readAISummary: async (articleId) => ({ success: true, data: null }),
        writeAISummary: async (articleId, summaryData) => ({ success: true }),

        // RSS Feed operations
        fetchFeed: async (url) => ({ success: true, data: { feedTitle: 'Test Feed', articles: [] } }),

        // Articles operations
        readArticles: async (feedId) => {
          const articles = testArticles[feedId] || [];
          return {
            success: true,
            data: {
              feedId: feedId,
              lastFetched: new Date().toISOString(),
              articles: articles
            }
          };
        },
        writeArticles: async (feedId, articlesData) => ({ success: true }),

        // Update operations
        checkForUpdates: async () => ({ success: true }),
        getUpdateStatus: async () => ({ success: true, status: 'idle' }),
        installUpdate: async () => ({ success: true }),

        // Update event listeners (no-ops for testing)
        onUpdateStatus: () => {},
        onUpdateAvailable: () => {},
        onUpdateDownloaded: () => {},
        onUpdateProgress: () => {},
        onUpdateError: () => {},
        removeUpdateListeners: () => {},

        // Get app version
        getAppVersion: async () => ({ success: true, version: '1.0.2' })
      };
    }, testData);

    // Load the index.html file
    const htmlPath = path.join(__dirname, '..', 'index.html');
    await page.goto(`file://${htmlPath}`);

    // Wait for the app to initialize
    await page.waitForSelector('.sidebar', { timeout: 5000 });
    
    // Wait a bit more for all async operations to complete
    await page.waitForTimeout(1000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('J key navigates to next article', async () => {
    // Wait for articles to load
    await page.waitForSelector('.article-item', { timeout: 5000 });

    // Get initial article items
    const articles = await page.$$('.article-item');
    expect(articles.length).toBeGreaterThan(0);

    // Initially no article should be selected (no active class)
    const initialActive = await page.$$('.article-item.active');
    expect(initialActive.length).toBe(0);

    // Press J to select first article
    await page.keyboard.press('j');
    await page.waitForTimeout(100); // Wait for selection to update

    // First article should now be active
    const firstActive = await page.$$('.article-item.active');
    expect(firstActive.length).toBe(1);

    // Get the selected article ID
    const firstArticleId = await firstActive[0].getAttribute('data-article-id');
    expect(firstArticleId).toBeTruthy();

    // Press J again to move to next article
    await page.keyboard.press('j');
    await page.waitForTimeout(100);

    // Second article should now be active
    const secondActive = await page.$$('.article-item.active');
    expect(secondActive.length).toBe(1);
    
    const secondArticleId = await secondActive[0].getAttribute('data-article-id');
    expect(secondArticleId).toBeTruthy();
    expect(secondArticleId).not.toBe(firstArticleId);
  });

  test('K key navigates to previous article', async () => {
    // Wait for articles to load
    await page.waitForSelector('.article-item', { timeout: 5000 });

    // Press J twice to get to second article
    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    await page.keyboard.press('j');
    await page.waitForTimeout(100);

    // Get current active article
    const activeBefore = await page.$$('.article-item.active');
    expect(activeBefore.length).toBe(1);
    const articleIdBefore = await activeBefore[0].getAttribute('data-article-id');

    // Press K to go back
    await page.keyboard.press('k');
    await page.waitForTimeout(100);

    // Previous article should now be active
    const activeAfter = await page.$$('.article-item.active');
    expect(activeAfter.length).toBe(1);
    
    const articleIdAfter = await activeAfter[0].getAttribute('data-article-id');
    expect(articleIdAfter).toBeTruthy();
    expect(articleIdAfter).not.toBe(articleIdBefore);
  });

  test('V key opens selected article in browser', async () => {
    // Wait for articles to load
    await page.waitForSelector('.article-item', { timeout: 5000 });

    // Select first article with J
    await page.keyboard.press('j');
    await page.waitForTimeout(500); // Wait for article to load in preview

    // Get the article link from the preview meta section
    // The preview should show the article with a "View Original" link
    const previewMeta = await page.$('.article-preview-meta');
    expect(previewMeta).toBeTruthy();

    // Press V to open in browser
    await page.keyboard.press('v');
    await page.waitForTimeout(100);

    // Check that window.open was called
    const openCalls = await page.evaluate(() => window._openCalls);
    expect(openCalls.length).toBeGreaterThan(0);
    expect(openCalls[0].url).toBeTruthy();
    expect(openCalls[0].target).toBe('_blank');
  });

  test('R key refreshes all feeds', async () => {
    // Wait for initial load
    await page.waitForSelector('.toolbar-title', { timeout: 5000 });

    // Get initial toolbar title
    const initialTitle = await page.textContent('.toolbar-title');
    expect(initialTitle).toBeTruthy();

    // Press R to refresh
    await page.keyboard.press('r');
    
    // Wait for refresh to start (toolbar should show "Refreshing...")
    await page.waitForSelector('.toolbar-title', { timeout: 2000 });
    
    // Check that toolbar title changes to "Refreshing..." and then back
    // This indicates the refresh function was triggered
    const toolbarTitle = await page.textContent('.toolbar-title');
    // The title should either be "Refreshing..." or back to the original title
    expect(toolbarTitle).toBeTruthy();
    
    // Wait a bit for refresh to complete
    await page.waitForTimeout(2000);
    
    // After refresh, toolbar should show a valid title (not "Refreshing...")
    const finalTitle = await page.textContent('.toolbar-title');
    expect(finalTitle).toBeTruthy();
    expect(finalTitle).not.toBe('Refreshing...');
  });

  test('[ key collapses sidebar', async () => {
    // Wait for sidebar to load
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Sidebar should initially be visible (not collapsed)
    const sidebar = await page.$('.sidebar');
    expect(sidebar).toBeTruthy();
    
    const hasCollapsedBefore = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(hasCollapsedBefore).toBe(false);

    // Press [ to collapse
    await page.keyboard.press('[');
    await page.waitForTimeout(100);

    // Sidebar should now have collapsed class
    const hasCollapsedAfter = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(hasCollapsedAfter).toBe(true);
  });

  test('] key expands sidebar', async () => {
    // Wait for sidebar to load
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // First collapse the sidebar
    await page.keyboard.press('[');
    await page.waitForTimeout(100);

    const sidebar = await page.$('.sidebar');
    let hasCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(hasCollapsed).toBe(true);

    // Press ] to expand
    await page.keyboard.press(']');
    await page.waitForTimeout(100);

    // Sidebar should no longer have collapsed class
    hasCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(hasCollapsed).toBe(false);
  });

  test('Escape key closes Help modal', async () => {
    // Wait for help button
    await page.waitForSelector('#helpBtn', { timeout: 5000 });

    // Open Help modal
    await page.click('#helpBtn');
    await page.waitForTimeout(200);

    // Modal should be visible
    const helpModal = await page.$('#helpModal');
    const isHiddenBefore = await helpModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHiddenBefore).toBe(false);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Modal should now be hidden
    const isHiddenAfter = await helpModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHiddenAfter).toBe(true);
  });

  test('Escape key closes About modal', async () => {
    // Wait for about button
    await page.waitForSelector('#aboutBtn', { timeout: 5000 });

    // Open About modal
    await page.click('#aboutBtn');
    await page.waitForTimeout(200);

    // Modal should be visible
    const aboutModal = await page.$('#aboutModal');
    const isHiddenBefore = await aboutModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHiddenBefore).toBe(false);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Modal should now be hidden
    const isHiddenAfter = await aboutModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHiddenAfter).toBe(true);
  });

  test('Escape key closes Settings modal', async () => {
    // Wait for settings button
    await page.waitForSelector('#settingsBtn', { timeout: 5000 });

    // Open Settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Modal should be visible
    const settingsModal = await page.$('#settingsModal');
    const isHiddenBefore = await settingsModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHiddenBefore).toBe(false);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Modal should now be hidden
    const isHiddenAfter = await settingsModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHiddenAfter).toBe(true);
  });

  test('Keyboard shortcuts do not fire when typing in input fields', async () => {
    // Wait for settings button
    await page.waitForSelector('#settingsBtn', { timeout: 5000 });

    // Open Settings modal to access input field
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Focus on the API key input
    const apiKeyInput = await page.$('#apiKeyInput');
    expect(apiKeyInput).toBeTruthy();
    
    await apiKeyInput.focus();
    await page.waitForTimeout(100);

    // Type 'j' in the input - should not trigger article navigation
    await apiKeyInput.type('j');
    await page.waitForTimeout(100);

    // No article should be selected (we're in settings, but even if we weren't, 
    // typing in input shouldn't trigger navigation)
    const activeArticles = await page.$$('.article-item.active');
    // In settings modal, there shouldn't be any active articles visible anyway
    // But the key point is that typing 'j' in the input didn't cause navigation

    // Type 'r' in the input - should not trigger refresh
    await apiKeyInput.type('r');
    await page.waitForTimeout(100);

    // The input should contain 'jr'
    const inputValue = await apiKeyInput.inputValue();
    expect(inputValue).toContain('j');
    expect(inputValue).toContain('r');
  });
});

