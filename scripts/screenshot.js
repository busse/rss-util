const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Mock data for screenshots
const mockFeeds = [
  {
    id: 'feed-1',
    title: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'category-1',
    status: 'healthy',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'feed-2',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    category: '',
    status: 'healthy',
    lastUpdated: new Date().toISOString()
  }
];

const mockCategories = [
  {
    id: 'category-1',
    name: 'Technology',
    icon: '💻'
  }
];

const mockArticles = [
  {
    id: 'article-1',
    title: 'The Future of Web Development',
    link: 'https://example.com/article1',
    description: 'Exploring the latest trends in web development and modern frameworks.',
    content: '<p>Web development continues to evolve at a rapid pace. Modern frameworks and tools are making it easier than ever to build powerful applications.</p><p>In this article, we explore the latest trends and technologies shaping the future of web development.</p>',
    pubDate: new Date().toISOString(),
    author: 'John Doe',
    feedId: 'feed-1',
    feedTitle: 'TechCrunch',
    feedIcon: 'T'
  },
  {
    id: 'article-2',
    title: 'Understanding React Hooks',
    link: 'https://example.com/article2',
    description: 'A deep dive into React Hooks and how they simplify component logic.',
    content: '<p>React Hooks have revolutionized how we write React components. They allow us to use state and other React features without writing a class.</p><p>This article covers the most commonly used hooks and best practices.</p>',
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    author: 'Jane Smith',
    feedId: 'feed-1',
    feedTitle: 'TechCrunch',
    feedIcon: 'T'
  },
  {
    id: 'article-3',
    title: 'Building Modern APIs with Node.js',
    link: 'https://example.com/article3',
    description: 'Learn how to build scalable REST APIs using Node.js and Express.',
    content: '<p>Node.js has become the go-to platform for building APIs. In this guide, we cover everything you need to know to build production-ready APIs.</p>',
    pubDate: new Date(Date.now() - 7200000).toISOString(),
    author: 'Bob Johnson',
    feedId: 'feed-2',
    feedTitle: 'Hacker News',
    feedIcon: 'H'
  }
];

const mockReadStates = {
  'article-2': {
    read: true,
    readAt: new Date().toISOString()
  }
};

// Mock AI summary data
const mockAISummary = {
  'article-1': {
    summary: 'This article explores the rapidly evolving landscape of web development, highlighting how modern frameworks and tools are simplifying the creation of powerful applications. The piece examines key trends including component-based architectures, serverless computing, and the growing importance of developer experience. These innovations are making it easier for developers to build scalable, maintainable applications while reducing time-to-market [1].',
    footnotes: [
      { title: 'Modern Web Frameworks', url: 'https://example.com/frameworks' },
      { title: 'Serverless Architecture Guide', url: 'https://example.com/serverless' },
      { title: 'Developer Experience Best Practices', url: 'https://example.com/dx' }
    ],
    generatedAt: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  }
};

async function setupMockAPI(page, feeds, categories, articles, readStates, options = {}) {
  const { 
    featureFlags = {}, 
    aiSummaries = {}, 
    encryptedApiKey = null,
    showApiKey = false 
  } = options;

  await page.addInitScript((mockFeeds, mockCategories, mockArticles, mockReadStates, mockFeatureFlags, mockAISummaries, mockApiKey, mockShowApiKey) => {
    window.electronAPI = {
      navigateTo: async () => ({ success: true }),
      readFeeds: async () => ({ success: true, data: mockFeeds }),
      readCategories: async () => ({ success: true, data: mockCategories }),
      readReadStates: async () => ({ success: true, data: mockReadStates }),
      readArticles: async (feedId) => {
        const feedArticles = mockArticles.filter(a => a.feedId === feedId);
        return { 
          success: true, 
          data: { 
            feedId: feedId,
            lastFetched: new Date().toISOString(),
            articles: feedArticles 
          } 
        };
      },
      writeFeeds: async () => ({ success: true }),
      writeCategories: async () => ({ success: true }),
      writeReadStates: async () => ({ success: true }),
      fetchFeed: async () => ({ success: true, data: { articles: [] } }),
      writeArticles: async () => ({ success: true }),
      getFeatureFlags: async () => ({ success: true, data: mockFeatureFlags }),
      getEncryptedApiKey: async () => ({ 
        success: true, 
        data: mockApiKey ? (mockShowApiKey ? mockApiKey : 'sk-proj-...') : null 
      }),
      readAISummary: async (articleId) => {
        const summary = mockAISummaries[articleId] || null;
        return { success: true, data: summary };
      },
      writeAISummary: async () => ({ success: true }),
      getAppVersion: async () => ({ success: true, version: '1.0.2' })
    };
  }, feeds || [], categories || [], articles || [], readStates || {}, featureFlags, aiSummaries, encryptedApiKey, showApiKey);
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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  const basePath = path.join(__dirname, '..');

  // Screenshot 1: Main reader interface with articles
  console.log('Taking screenshot of main reader interface...');
  await setupMockAPI(page, mockFeeds, mockCategories, mockArticles, mockReadStates);
  await page.goto(`file://${basePath}/index.html`);
  
  // Wait for content to render
  await page.waitForSelector('.feed-list', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  
  // Select the first article to show it in the preview
  await page.evaluate(() => {
    const articleItem = document.querySelector('.article-item');
    if (articleItem) {
      articleItem.click();
    }
  });
  
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'main-interface.png', { fullPage: false });

  // Screenshot 2: Feed management interface
  console.log('Taking screenshot of feed management interface...');
  await setupMockAPI(page, mockFeeds, mockCategories, [], {});
  await page.goto(`file://${basePath}/manage.html`);
  
  // Wait for content to render
  await page.waitForSelector('.feed-panel', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await takeScreenshot(page, 'feed-management.png', { fullPage: false });

  // Screenshot 3: Empty state (no feeds)
  console.log('Taking screenshot of empty state...');
  await setupMockAPI(page, [], [], [], {});
  await page.goto(`file://${basePath}/index.html`);
  
  // Wait for content to render
  await page.waitForSelector('.sidebar', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await takeScreenshot(page, 'empty-state.png', { fullPage: false });

  // Screenshot 4: AI Article Summary
  console.log('Taking screenshot of AI article summary...');
  await setupMockAPI(page, mockFeeds, mockCategories, mockArticles, mockReadStates, {
    featureFlags: { aiArticleSummary: true },
    aiSummaries: mockAISummary,
    encryptedApiKey: 'sk-proj-mock-key-for-screenshot'
  });
  await page.goto(`file://${basePath}/index.html`);
  
  // Wait for content to render
  await page.waitForSelector('.feed-list', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  
  // Select the first article (which has an AI summary)
  await page.evaluate(() => {
    const articleItem = document.querySelector('.article-item');
    if (articleItem) {
      articleItem.click();
    }
  });
  
  // Wait for AI summary to render
  await page.waitForSelector('.ai-summary-container', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await takeScreenshot(page, 'ai-summary.png', { fullPage: false });

  // Screenshot 5: Settings Modal
  console.log('Taking screenshot of settings modal...');
  await setupMockAPI(page, mockFeeds, mockCategories, mockArticles, mockReadStates, {
    featureFlags: { aiArticleSummary: true },
    encryptedApiKey: 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
    showApiKey: false // Keep it obfuscated
  });
  await page.goto(`file://${basePath}/index.html`);
  
  // Wait for content to render
  await page.waitForSelector('.sidebar', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  
  // Open settings modal
  await page.evaluate(() => {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.click();
    }
  });
  
  // Wait for modal to appear
  await page.waitForSelector('.modal-overlay:not(.hidden)', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('#settingsModal:not(.hidden)', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  
  // Ensure API key input shows obfuscated value
  await page.evaluate(() => {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput && apiKeyInput.type === 'password') {
      // Keep it as password type to show obfuscated
      apiKeyInput.value = 'sk-proj-...';
    }
  });
  
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'settings.png', { fullPage: false });

  await browser.close();
  console.log('All screenshots completed!');
}

main().catch(console.error);

