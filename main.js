const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Parser = require('rss-parser');

let mainWindow;

// Get user data directory and data subdirectory
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

// Handle navigation requests from renderer
ipcMain.handle('navigate-to', (event, file) => {
  // Get the window that sent the request
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && !window.isDestroyed()) {
    window.loadFile(file);
    return { success: true };
  }
  return { success: false, error: 'Window not found' };
});

// Generic JSON file operations
ipcMain.handle('read-json', async (event, filename) => {
  const filePath = path.join(dataDir, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default based on filename
      if (filename === 'feeds.json' || filename === 'categories.json') {
        return { success: true, data: [] };
      } else if (filename === 'read-states.json') {
        return { success: true, data: {} };
      } else if (filename === 'settings.json') {
        return { success: true, data: {} };
      }
      return { success: true, data: null };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-json', async (event, filename, data) => {
  const filePath = path.join(dataDir, filename);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing JSON file:', error);
    return { success: false, error: error.message };
  }
});

// Feeds operations
ipcMain.handle('read-feeds', async (event) => {
  const filePath = path.join(dataDir, 'feeds.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: [] };
    }
    console.error('Error reading feeds:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-feeds', async (event, feeds) => {
  const filePath = path.join(dataDir, 'feeds.json');
  try {
    await fs.writeFile(filePath, JSON.stringify(feeds, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing feeds:', error);
    return { success: false, error: error.message };
  }
});

// Categories operations
ipcMain.handle('read-categories', async (event) => {
  const filePath = path.join(dataDir, 'categories.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: [] };
    }
    console.error('Error reading categories:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-categories', async (event, categories) => {
  const filePath = path.join(dataDir, 'categories.json');
  try {
    await fs.writeFile(filePath, JSON.stringify(categories, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing categories:', error);
    return { success: false, error: error.message };
  }
});

// Read states operations
ipcMain.handle('read-read-states', async (event) => {
  const filePath = path.join(dataDir, 'read-states.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: {} };
    }
    console.error('Error reading read states:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-read-states', async (event, readStates) => {
  const filePath = path.join(dataDir, 'read-states.json');
  try {
    await fs.writeFile(filePath, JSON.stringify(readStates, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing read states:', error);
    return { success: false, error: error.message };
  }
});

// Settings operations
ipcMain.handle('read-settings', async (event) => {
  const filePath = path.join(dataDir, 'settings.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: {} };
    }
    console.error('Error reading settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-settings', async (event, settings) => {
  const filePath = path.join(dataDir, 'settings.json');
  try {
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing settings:', error);
    return { success: false, error: error.message };
  }
});

// RSS Feed operations
const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'description']
  }
});

ipcMain.handle('fetch-feed', async (event, url) => {
  try {
    const feed = await parser.parseURL(url);
    
    // Transform feed items to our article format
    const articles = feed.items.map(item => {
      // Generate unique ID from guid or link
      const id = item.guid || item.link || `article-${Date.now()}-${Math.random()}`;
      
      // Parse pubDate to ISO string
      let pubDate = null;
      if (item.pubDate) {
        try {
          pubDate = new Date(item.pubDate).toISOString();
        } catch (e) {
          console.warn('Error parsing pubDate:', item.pubDate);
        }
      }
      
      return {
        id: id,
        title: item.title || 'Untitled',
        link: item.link || '',
        description: item.contentSnippet || item.description || '',
        content: item['content:encoded'] || item.content || item.description || '',
        pubDate: pubDate,
        author: item.creator || item.author || '',
        categories: item.categories || []
      };
    });
    
    return {
      success: true,
      data: {
        feedTitle: feed.title || '',
        feedDescription: feed.description || '',
        feedLink: feed.link || '',
        articles: articles
      }
    };
  } catch (error) {
    console.error('Error fetching feed:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch feed'
    };
  }
});

ipcMain.handle('read-articles', async (event, feedId) => {
  const filename = `articles-${feedId}.json`;
  const filePath = path.join(dataDir, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty structure
      return {
        success: true,
        data: {
          feedId: feedId,
          lastFetched: null,
          articles: []
        }
      };
    }
    console.error('Error reading articles:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-articles', async (event, feedId, articlesData) => {
  const filename = `articles-${feedId}.json`;
  const filePath = path.join(dataDir, filename);
  try {
    // Ensure feedId is set in the data
    const dataToWrite = {
      ...articlesData,
      feedId: feedId
    };
    await fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing articles:', error);
    return { success: false, error: error.message };
  }
});

// Helper function to fetch a single feed and update its status
async function fetchFeedAndUpdate(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    
    // Transform feed items to our article format
    const articles = result.items.map(item => {
      const id = item.guid || item.link || `article-${Date.now()}-${Math.random()}`;
      
      let pubDate = null;
      if (item.pubDate) {
        try {
          pubDate = new Date(item.pubDate).toISOString();
        } catch (e) {
          console.warn('Error parsing pubDate:', item.pubDate);
        }
      }
      
      return {
        id: id,
        title: item.title || 'Untitled',
        link: item.link || '',
        description: item.contentSnippet || item.description || '',
        content: item['content:encoded'] || item.content || item.description || '',
        pubDate: pubDate,
        author: item.creator || item.author || '',
        categories: item.categories || []
      };
    });
    
    // Save articles to file
    const articlesData = {
      feedId: feed.id,
      lastFetched: new Date().toISOString(),
      articles: articles
    };
    
    const filename = `articles-${feed.id}.json`;
    const filePath = path.join(dataDir, filename);
    await fs.writeFile(filePath, JSON.stringify(articlesData, null, 2), 'utf-8');
    
    // Update feed status and lastUpdated
    const feedsResult = await fs.readFile(path.join(dataDir, 'feeds.json'), 'utf-8');
    const feeds = JSON.parse(feedsResult);
    const feedIndex = feeds.findIndex(f => f.id === feed.id);
    if (feedIndex !== -1) {
      feeds[feedIndex].lastUpdated = new Date().toISOString();
      feeds[feedIndex].status = 'healthy';
      await fs.writeFile(path.join(dataDir, 'feeds.json'), JSON.stringify(feeds, null, 2), 'utf-8');
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error fetching feed ${feed.id}:`, error);
    
    // Update feed status to error
    try {
      const feedsResult = await fs.readFile(path.join(dataDir, 'feeds.json'), 'utf-8');
      const feeds = JSON.parse(feedsResult);
      const feedIndex = feeds.findIndex(f => f.id === feed.id);
      if (feedIndex !== -1) {
        feeds[feedIndex].status = 'error';
        await fs.writeFile(path.join(dataDir, 'feeds.json'), JSON.stringify(feeds, null, 2), 'utf-8');
      }
    } catch (updateError) {
      console.error('Error updating feed status:', updateError);
    }
    
    return { success: false, error: error.message };
  }
}

// Automatically fetch all feeds on startup (runs in background)
async function fetchAllFeedsOnStartup() {
  try {
    const feedsResult = await fs.readFile(path.join(dataDir, 'feeds.json'), 'utf-8');
    const feeds = JSON.parse(feedsResult);
    
    if (feeds.length === 0) {
      return;
    }
    
    // Fetch all feeds in parallel, but don't wait for completion
    Promise.all(feeds.map(feed => fetchFeedAndUpdate(feed)))
      .then(() => {
        console.log('All feeds fetched on startup');
      })
      .catch(error => {
        console.error('Error during startup feed fetch:', error);
      });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error reading feeds on startup:', error);
    }
  }
}

app.whenReady().then(async () => {
  // Initialize data directory
  await ensureDataDir();
  
  createWindow();
  
  // Fetch all feeds in the background after window is created
  fetchAllFeedsOnStartup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
