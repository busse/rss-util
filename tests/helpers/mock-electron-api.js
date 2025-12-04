// Mock Electron API for testing
// This provides a mock implementation of window.electronAPI that the app expects

function createMockElectronAPI() {
  // Test data
  const testFeeds = [
    {
      id: 'feed-1',
      title: 'Test Feed 1',
      url: 'https://example.com/feed1.xml',
      category: null,
      status: 'healthy',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'feed-2',
      title: 'Test Feed 2',
      url: 'https://example.com/feed2.xml',
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
        pubDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        author: 'Author 1',
        categories: []
      },
      {
        id: 'article-2',
        title: 'Article 2 from Feed 1',
        link: 'https://example.com/article2',
        description: 'Description of article 2',
        content: '<p>Content of article 2</p>',
        pubDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        author: 'Author 1',
        categories: []
      },
      {
        id: 'article-3',
        title: 'Article 3 from Feed 1',
        link: 'https://example.com/article3',
        description: 'Description of article 3',
        content: '<p>Content of article 3</p>',
        pubDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        author: 'Author 1',
        categories: []
      }
    ],
    'feed-2': [
      {
        id: 'article-4',
        title: 'Article 1 from Feed 2',
        link: 'https://example.com/article4',
        description: 'Description of article 4',
        content: '<p>Content of article 4</p>',
        pubDate: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        author: 'Author 2',
        categories: []
      },
      {
        id: 'article-5',
        title: 'Article 2 from Feed 2',
        link: 'https://example.com/article5',
        description: 'Description of article 5',
        content: '<p>Content of article 5</p>',
        pubDate: new Date(Date.now() - 129600000).toISOString(), // 1.5 days ago
        author: 'Author 2',
        categories: []
      }
    ]
  };

  const testReadStates = {};
  const testSettings = {
    featureFlags: {
      aiArticleSummary: false,
      dataMirror: false
    }
  };

  // Track function calls for testing
  const callLog = {
    readFeeds: [],
    readCategories: [],
    readReadStates: [],
    readArticles: [],
    writeReadStates: [],
    getFeatureFlags: []
  };

  return {
    // Navigation
    navigateTo: async (file) => ({ success: true }),

    // Feeds operations
    readFeeds: async () => {
      callLog.readFeeds.push(Date.now());
      return { success: true, data: testFeeds };
    },
    writeFeeds: async (feeds) => ({ success: true }),

    // Categories operations
    readCategories: async () => {
      callLog.readCategories.push(Date.now());
      return { success: true, data: testCategories };
    },
    writeCategories: async (categories) => ({ success: true }),

    // Read states operations
    readReadStates: async () => {
      callLog.readReadStates.push(Date.now());
      return { success: true, data: testReadStates };
    },
    writeReadStates: async (readStates) => {
      callLog.writeReadStates.push({ timestamp: Date.now(), data: readStates });
      return { success: true };
    },

    // Settings operations
    readSettings: async () => ({ success: true, data: testSettings }),
    writeSettings: async (settings) => ({ success: true }),

    // Encrypted API key operations
    getEncryptedApiKey: async () => ({ success: true, data: null }),
    setEncryptedApiKey: async (apiKey) => ({ success: true }),

    // Feature flags operations
    getFeatureFlags: async () => {
      callLog.getFeatureFlags.push(Date.now());
      return { success: true, data: testSettings.featureFlags };
    },
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
      callLog.readArticles.push({ timestamp: Date.now(), feedId });
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
    getAppVersion: async () => ({ success: true, version: '1.0.2' }),

    // Test helpers - expose call log for assertions
    _getCallLog: () => callLog,
    _getTestData: () => ({
      feeds: testFeeds,
      categories: testCategories,
      articles: testArticles,
      readStates: testReadStates
    })
  };
}

module.exports = { createMockElectronAPI };

