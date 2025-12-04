// Data Mirror Feature Test Suite
// Tests the data mirror feature that enables mirroring data to a second directory

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Data Mirror Feature', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    // Create a new page for each test
    page = await browser.newPage();

    // Inject mock Electron API before page loads
    await page.addInitScript(() => {
      const testFeeds = [
        {
          id: 'feed-1',
          title: 'Test Feed 1',
          url: 'https://example.com/feed1.xml',
          category: null,
          status: 'healthy',
          lastUpdated: new Date().toISOString()
        }
      ];

      const testCategories = [];
      const testArticles = {
        'feed-1': [
          {
            id: 'article-1',
            title: 'Article 1 from Feed 1',
            link: 'https://example.com/article1',
            description: 'Description of article 1',
            content: '<p>Content of article 1</p>',
            pubDate: new Date(Date.now() - 86400000).toISOString(),
            author: 'Author 1',
            categories: []
          }
        ]
      };
      const testReadStates = {};

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
        readSettings: async () => ({ success: true, data: { featureFlags: { aiArticleSummary: false, dataMirror: true } } }),
        writeSettings: async (settings) => ({ success: true }),

        // Encrypted API key operations
        getEncryptedApiKey: async () => ({ success: true, data: null }),
        setEncryptedApiKey: async (apiKey) => ({ success: true }),

        // Feature flags operations
        getFeatureFlags: async () => ({ success: true, data: { aiArticleSummary: false, dataMirror: true } }),
        setFeatureFlag: async (flagName, enabled) => ({ success: true }),

        // Data Mirror operations
        selectMirrorDirectory: async () => ({ success: true, data: '/test/mirror/directory' }),
        getMirrorDirectory: async () => ({ success: true, data: '/existing/mirror/path' }),
        setMirrorDirectory: async (mirrorDirectory) => ({ success: true }),
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
    });

    // Load the index.html file
    const htmlPath = path.join(__dirname, '..', 'index.html');
    await page.goto(`file://${htmlPath}`);

    // Wait for the app to initialize
    await page.waitForSelector('.sidebar', { timeout: 5000 });
    
    // Wait a bit more for all async operations to complete
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Data Mirror feature flag appears in settings', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Check that the settings modal is visible
    const settingsModal = await page.$('#settingsModal');
    const isHidden = await settingsModal.evaluate(el => el.classList.contains('hidden'));
    expect(isHidden).toBe(false);

    // Check that the Data Mirror feature flag exists
    const dataMirrorToggle = await page.$('input[data-flag-name="dataMirror"]');
    expect(dataMirrorToggle).toBeTruthy();
  });

  test('Data Mirror section is visible when feature flag is enabled', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // The data mirror section should be visible since feature flag is enabled
    const dataMirrorSection = await page.$('#dataMirrorSection');
    expect(dataMirrorSection).toBeTruthy();
    
    const isVisible = await dataMirrorSection.evaluate(el => el.style.display !== 'none');
    expect(isVisible).toBe(true);
  });

  test('Mirror directory input displays current path', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Check that the mirror directory input has the expected value
    const mirrorInput = await page.$('#mirrorDirectoryInput');
    expect(mirrorInput).toBeTruthy();
    
    const value = await mirrorInput.inputValue();
    expect(value).toBe('/existing/mirror/path');
  });

  test('Browse button triggers directory selection', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Click the browse button
    await page.click('#selectMirrorDirectoryBtn');
    await page.waitForTimeout(100);

    // Check that the input was updated with the selected directory
    const mirrorInput = await page.$('#mirrorDirectoryInput');
    const value = await mirrorInput.inputValue();
    expect(value).toBe('/test/mirror/directory');
  });

  test('Clear button clears the directory path', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Verify input has a value
    const mirrorInput = await page.$('#mirrorDirectoryInput');
    let value = await mirrorInput.inputValue();
    expect(value).toBe('/existing/mirror/path');

    // Click the clear button
    await page.click('#clearMirrorDirectoryBtn');
    await page.waitForTimeout(100);

    // Check that the input was cleared
    value = await mirrorInput.inputValue();
    expect(value).toBe('');
  });

  test('Sync Now button triggers sync', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // Click the sync now button
    await page.click('#syncNowBtn');
    await page.waitForTimeout(500);

    // Check that a toast notification appeared
    const toast = await page.$('.toast');
    expect(toast).toBeTruthy();
  });

  test('Toggling Data Mirror feature flag shows/hides section', async () => {
    // Open settings modal
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);

    // The data mirror section should be visible (flag is enabled in mock)
    let dataMirrorSection = await page.$('#dataMirrorSection');
    let isVisible = await dataMirrorSection.evaluate(el => el.style.display !== 'none');
    expect(isVisible).toBe(true);

    // Toggle the feature flag off - click on the toggle-slider (parent label contains the checkbox)
    const dataMirrorToggle = await page.$('input[data-flag-name="dataMirror"]');
    const toggleSwitch = await dataMirrorToggle.evaluateHandle(el => el.parentElement);
    await toggleSwitch.click();
    await page.waitForTimeout(100);

    // The section should now be hidden
    isVisible = await dataMirrorSection.evaluate(el => el.style.display !== 'none');
    expect(isVisible).toBe(false);

    // Toggle it back on
    await toggleSwitch.click();
    await page.waitForTimeout(100);

    // The section should be visible again
    isVisible = await dataMirrorSection.evaluate(el => el.style.display !== 'none');
    expect(isVisible).toBe(true);
  });
});
