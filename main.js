const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Parser = require('rss-parser');
const migrations = require('./migrations');

let mainWindow;

// Get current app version from package.json
const appVersion = require('./package.json').version;

// Get user data directory and data subdirectory
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data');

// Encryption utilities for API key
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SALT = 'rss-reader-api-key-salt-v1'; // Constant salt for key derivation

// Derive encryption key from userData path
function getEncryptionKey() {
  const keyMaterial = userDataPath + SALT;
  return crypto.createHash('sha256').update(keyMaterial).digest();
}

// Encrypt API key
function encryptApiKey(apiKey) {
  if (!apiKey) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, authTag, and encrypted data
    const result = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted: encrypted
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Error encrypting API key:', error);
    return null;
  }
}

// Decrypt API key
function decryptApiKey(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    const key = getEncryptionKey();
    const data = JSON.parse(encryptedData);
    
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    const encrypted = data.encrypted;
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting API key:', error);
    return null;
  }
}

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

// Get app version
ipcMain.handle('get-app-version', async () => {
  return { success: true, version: appVersion };
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
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
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
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
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
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
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
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
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
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error writing settings:', error);
    return { success: false, error: error.message };
  }
});

// Encrypted API key operations
ipcMain.handle('get-encrypted-api-key', async (event) => {
  try {
    const settingsResult = await fs.readFile(path.join(dataDir, 'settings.json'), 'utf-8').catch(() => '{}');
    const settings = JSON.parse(settingsResult);
    
    if (!settings.encryptedApiKey) {
      return { success: true, data: null };
    }
    
    const decrypted = decryptApiKey(settings.encryptedApiKey);
    return { success: true, data: decrypted };
  } catch (error) {
    console.error('Error getting encrypted API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-encrypted-api-key', async (event, apiKey) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    if (apiKey && apiKey.trim()) {
      const encrypted = encryptApiKey(apiKey.trim());
      if (!encrypted) {
        return { success: false, error: 'Failed to encrypt API key' };
      }
      settings.encryptedApiKey = encrypted;
    } else {
      // Remove API key if empty
      delete settings.encryptedApiKey;
    }
    
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error setting encrypted API key:', error);
    return { success: false, error: error.message };
  }
});

// Feature flags operations
ipcMain.handle('get-feature-flags', async (event) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    const featureFlags = settings.featureFlags || {};

    // Ensure default feature flags exist
    if (featureFlags.aiArticleSummary === undefined) {
      featureFlags.aiArticleSummary = false;
    }
    if (featureFlags.dataMirror === undefined) {
      featureFlags.dataMirror = false;
    }
    if (featureFlags.calendarExtraction === undefined) {
      featureFlags.calendarExtraction = false;
    }

    return { success: true, data: featureFlags };
  } catch (error) {
    console.error('Error getting feature flags:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-feature-flag', async (event, flagName, enabled) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    if (!settings.featureFlags) {
      settings.featureFlags = {};
    }
    
    settings.featureFlags[flagName] = enabled;
    
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error setting feature flag:', error);
    return { success: false, error: error.message };
  }
});

// Data Mirror operations
ipcMain.handle('select-mirror-directory', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Mirror Directory',
      properties: ['openDirectory', 'createDirectory']
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: true, data: null };
    }
    
    return { success: true, data: result.filePaths[0] };
  } catch (error) {
    console.error('Error selecting mirror directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-mirror-directory', async (event) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return { success: true, data: settings.mirrorDirectory || null };
  } catch (error) {
    console.error('Error getting mirror directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-sync-as-markdown', async (event) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Default to true (enabled) when dataMirror is enabled
    const syncAsMarkdown = settings.syncAsMarkdown !== undefined ? settings.syncAsMarkdown : true;
    return { success: true, data: syncAsMarkdown };
  } catch (error) {
    console.error('Error getting syncAsMarkdown setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-sync-as-markdown', async (event, enabled) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    settings.syncAsMarkdown = enabled;
    
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    // Trigger sync after changing the setting
    if (settings.featureFlags?.dataMirror && settings.mirrorDirectory) {
      triggerMirrorSync();
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting syncAsMarkdown:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-mirror-directory', async (event, mirrorDirectory) => {
  try {
    const filePath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    if (mirrorDirectory) {
      settings.mirrorDirectory = mirrorDirectory;
    } else {
      delete settings.mirrorDirectory;
    }
    
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    // Trigger immediate sync if directory is set and feature is enabled
    if (mirrorDirectory && settings.featureFlags?.dataMirror) {
      triggerMirrorSync();
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting mirror directory:', error);
    return { success: false, error: error.message };
  }
});

// Helper function to trigger mirror sync with error handling
function triggerMirrorSync() {
  syncToMirror().catch(err => console.error('Mirror sync error:', err));
}

// Helper function to strip HTML tags and decode entities safely while preserving line breaks
function stripHtml(html) {
  if (!html) return '';
  let text = html;
  
  // Convert block-level elements to line breaks before removing tags
  // Replace closing block tags with double newlines for paragraph breaks
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/blockquote>/gi, '\n\n');
  
  // Replace <br> tags with single newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Replace <hr> with a line
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // Repeatedly remove remaining HTML tags until none remain (handles nested/malformed tags)
  let previous = '';
  while (previous !== text) {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  }
  
  // Decode common HTML entities (in correct order - &amp; last to avoid double-decoding)
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  
  // Normalize multiple consecutive newlines to max 2 (paragraph break)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Normalize spaces within lines (but preserve newlines)
  text = text.replace(/[^\S\n]+/g, ' ');
  
  // Trim each line and remove empty lines at start/end
  text = text.split('\n').map(line => line.trim()).join('\n');
  text = text.replace(/^\n+|\n+$/g, '');
  
  return text;
}

// Helper function to escape a string for YAML double-quoted strings
function escapeYamlString(str) {
  if (!str) return '';
  // Escape backslashes first, then double quotes, then newlines
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Helper function to convert article to Markdown with Obsidian frontmatter
function articleToMarkdown(article, feedTitle, readState) {
  const frontmatter = {
    title: article.title || 'Untitled',
    link: article.link || '',
    author: article.author || '',
    feed: feedTitle || '',
    pubDate: article.pubDate || '',
    read: readState?.read || false,
    readAt: readState?.readAt || '',
    tags: article.categories || [],
    type: 'article'
  };
  
  // Build YAML frontmatter with proper escaping
  let yaml = '---\n';
  yaml += `title: "${escapeYamlString(frontmatter.title)}"\n`;
  yaml += `link: "${escapeYamlString(frontmatter.link)}"\n`;
  yaml += `author: "${escapeYamlString(frontmatter.author)}"\n`;
  yaml += `feed: "${escapeYamlString(frontmatter.feed)}"\n`;
  yaml += `pubDate: "${escapeYamlString(frontmatter.pubDate)}"\n`;
  yaml += `read: ${frontmatter.read}\n`;
  if (frontmatter.readAt) {
    yaml += `readAt: "${escapeYamlString(frontmatter.readAt)}"\n`;
  }
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    yaml += `tags:\n`;
    frontmatter.tags.forEach(tag => {
      yaml += `  - "${escapeYamlString(tag || '')}"\n`;
    });
  }
  yaml += `type: article\n`;
  yaml += '---\n\n';
  
  // Add article title as heading
  let content = `# ${article.title || 'Untitled'}\n\n`;
  
  // Add link to original
  if (article.link) {
    content += `[View Original Article](${article.link})\n\n`;
  }
  
  // Add description/summary
  if (article.description) {
    content += `## Summary\n\n${stripHtml(article.description)}\n\n`;
  }
  
  // Add full content (converted from HTML to plain text)
  if (article.content) {
    content += `## Content\n\n${stripHtml(article.content)}\n`;
  }
  
  return yaml + content;
}

// Helper function to convert feed to Markdown with Obsidian frontmatter
function feedToMarkdown(feed) {
  let yaml = '---\n';
  yaml += `title: "${escapeYamlString(feed.title || 'Untitled Feed')}"\n`;
  yaml += `url: "${escapeYamlString(feed.url || '')}"\n`;
  yaml += `category: "${escapeYamlString(feed.category || '')}"\n`;
  yaml += `icon: "${escapeYamlString(feed.icon || '')}"\n`;
  yaml += `lastUpdated: "${escapeYamlString(feed.lastUpdated || '')}"\n`;
  yaml += `status: "${escapeYamlString(feed.status || '')}"\n`;
  yaml += `type: feed\n`;
  yaml += '---\n\n';
  
  let content = `# ${feed.title || 'Untitled Feed'}\n\n`;
  content += `**URL:** ${feed.url || 'N/A'}\n\n`;
  content += `**Status:** ${feed.status || 'unknown'}\n\n`;
  if (feed.lastUpdated) {
    content += `**Last Updated:** ${feed.lastUpdated}\n\n`;
  }
  
  return yaml + content;
}

// Helper function to convert category to Markdown with Obsidian frontmatter
function categoryToMarkdown(category) {
  let yaml = '---\n';
  yaml += `name: "${escapeYamlString(category.name || 'Untitled Category')}"\n`;
  yaml += `icon: "${escapeYamlString(category.icon || '')}"\n`;
  yaml += `type: category\n`;
  yaml += '---\n\n';

  let content = `# ${category.icon || '📁'} ${category.name || 'Untitled Category'}\n\n`;
  content += `This is a category/folder for organizing RSS feeds.\n`;

  return yaml + content;
}

// Helper function to convert calendar event to Markdown with Obsidian frontmatter
function calendarEventToMarkdown(event) {
  let yaml = '---\n';
  yaml += `title: "${escapeYamlString(event.title || 'Untitled Event')}"\n`;
  yaml += `startDate: "${escapeYamlString(event.startDate || '')}"\n`;
  yaml += `endDate: "${escapeYamlString(event.endDate || '')}"\n`;
  yaml += `isAllDay: ${event.isAllDay || false}\n`;
  yaml += `location: "${escapeYamlString(event.location || '')}"\n`;
  yaml += `confidence: "${escapeYamlString(event.confidence || 'medium')}"\n`;
  yaml += `eventType: "${escapeYamlString(event.eventType || 'other')}"\n`;
  yaml += `sourceArticle: "${escapeYamlString(event.sourceArticle?.title || '')}"\n`;
  yaml += `sourceLink: "${escapeYamlString(event.sourceArticle?.link || '')}"\n`;
  yaml += `sourceFeed: "${escapeYamlString(event.sourceArticle?.feedTitle || '')}"\n`;
  yaml += `extractedAt: "${escapeYamlString(event.extractedAt || '')}"\n`;
  yaml += `type: calendar-event\n`;
  yaml += '---\n\n';

  let content = `# 📅 ${event.title || 'Untitled Event'}\n\n`;

  if (event.startDate) {
    const dateStr = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    content += `**Date:** ${dateStr}\n\n`;
  }

  if (event.location) {
    content += `**Location:** ${event.location}\n\n`;
  }

  if (event.description) {
    content += `## Description\n\n${event.description}\n\n`;
  }

  content += `**Confidence:** ${event.confidence || 'medium'}\n`;
  content += `**Event Type:** ${event.eventType || 'other'}\n\n`;

  if (event.sourceArticle) {
    content += `## Source\n\n`;
    if (event.sourceArticle.link) {
      content += `[${event.sourceArticle.title || 'Article'}](${event.sourceArticle.link})`;
    } else {
      content += event.sourceArticle.title || 'Unknown Article';
    }
    content += ` from ${event.sourceArticle.feedTitle || 'Unknown Feed'}\n`;
  }

  return yaml + content;
}

// Helper function to sanitize filename for file system
function sanitizeFilename(name) {
  if (!name) return 'untitled';
  // Remove or replace invalid characters
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) || 'untitled';
}

// Helper function to sync data to mirror directory
async function syncToMirror() {
  try {
    // Check if feature is enabled
    const settingsPath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const data = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return; // No settings file, nothing to sync
    }
    
    // Check if data mirror feature is enabled and directory is set
    if (!settings.featureFlags?.dataMirror || !settings.mirrorDirectory) {
      return;
    }
    
    const mirrorDir = settings.mirrorDirectory;
    const syncAsMarkdown = settings.syncAsMarkdown !== false; // Default to true
    
    // Ensure mirror directory exists
    await fs.mkdir(mirrorDir, { recursive: true });
    
    // Get all files in the data directory
    const files = await fs.readdir(dataDir);
    
    if (syncAsMarkdown) {
      // Create subdirectories for organized Markdown files
      const articlesDir = path.join(mirrorDir, 'articles');
      const feedsDir = path.join(mirrorDir, 'feeds');
      const categoriesDir = path.join(mirrorDir, 'categories');
      const calendarDir = path.join(mirrorDir, 'calendar');

      await Promise.all([
        fs.mkdir(articlesDir, { recursive: true }),
        fs.mkdir(feedsDir, { recursive: true }),
        fs.mkdir(categoriesDir, { recursive: true }),
        fs.mkdir(calendarDir, { recursive: true })
      ]);
      
      // Load read states for article metadata
      let readStates = {};
      try {
        const readStatesData = await fs.readFile(path.join(dataDir, 'read-states.json'), 'utf-8');
        readStates = JSON.parse(readStatesData);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Error reading read states:', error);
        }
      }
      
      // Load feeds for reference
      let feeds = [];
      try {
        const feedsData = await fs.readFile(path.join(dataDir, 'feeds.json'), 'utf-8');
        feeds = JSON.parse(feedsData);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Error reading feeds:', error);
        }
      }
      
      // Process files and convert to Markdown
      const syncPromises = files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const sourcePath = path.join(dataDir, file);
          
          try {
            const content = await fs.readFile(sourcePath, 'utf-8');
            const data = JSON.parse(content);
            
            if (file === 'feeds.json' && Array.isArray(data)) {
              // Convert each feed to a Markdown file
              const feedPromises = data.map(async (feed) => {
                const mdContent = feedToMarkdown(feed);
                const filename = sanitizeFilename(feed.title || feed.id) + '.md';
                await fs.writeFile(path.join(feedsDir, filename), mdContent, 'utf-8');
              });
              await Promise.all(feedPromises);
            } else if (file === 'categories.json' && Array.isArray(data)) {
              // Convert each category to a Markdown file
              const catPromises = data.map(async (category) => {
                const mdContent = categoryToMarkdown(category);
                const filename = sanitizeFilename(category.name || category.id) + '.md';
                await fs.writeFile(path.join(categoriesDir, filename), mdContent, 'utf-8');
              });
              await Promise.all(catPromises);
            } else if (file.startsWith('articles-') && data.articles) {
              // Convert each article to a Markdown file
              const feed = feeds.find(f => f.id === data.feedId);
              const feedTitle = feed?.title || 'Unknown Feed';
              const feedFolder = path.join(articlesDir, sanitizeFilename(feedTitle));
              await fs.mkdir(feedFolder, { recursive: true });

              const articlePromises = data.articles.map(async (article) => {
                const readState = readStates[article.id];
                const mdContent = articleToMarkdown(article, feedTitle, readState);
                const filename = sanitizeFilename(article.title || article.id) + '.md';
                await fs.writeFile(path.join(feedFolder, filename), mdContent, 'utf-8');
              });
              await Promise.all(articlePromises);
            } else if (file === 'calendar-events.json' && data.events) {
              // Convert each calendar event to a Markdown file organized by month
              const eventPromises = data.events.map(async (event) => {
                // Organize events by year-month folder
                let monthFolder = 'no-date';
                if (event.startDate) {
                  const eventDate = new Date(event.startDate);
                  const year = eventDate.getFullYear();
                  const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                  monthFolder = `${year}-${month}`;
                }
                const eventFolder = path.join(calendarDir, monthFolder);
                await fs.mkdir(eventFolder, { recursive: true });

                const mdContent = calendarEventToMarkdown(event);
                const filename = sanitizeFilename(event.title || event.id) + '.md';
                await fs.writeFile(path.join(eventFolder, filename), mdContent, 'utf-8');
              });
              await Promise.all(eventPromises);
            }
            // Skip other files like settings.json, read-states.json, ai-summaries.json in Markdown mode
          } catch (error) {
            console.error(`Error converting ${file} to Markdown:`, error);
          }
        });
      
      await Promise.all(syncPromises);
      console.log('Data synced to mirror directory as Markdown:', mirrorDir);
    } else {
      // Copy JSON files to mirror directory in parallel (original behavior)
      const copyPromises = files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const sourcePath = path.join(dataDir, file);
          const destPath = path.join(mirrorDir, file);
          
          try {
            const content = await fs.readFile(sourcePath, 'utf-8');
            await fs.writeFile(destPath, content, 'utf-8');
          } catch (error) {
            console.error(`Error copying ${file} to mirror:`, error);
          }
        });
      
      await Promise.all(copyPromises);
      console.log('Data synced to mirror directory as JSON:', mirrorDir);
    }
  } catch (error) {
    console.error('Error syncing to mirror:', error);
  }
}

ipcMain.handle('sync-to-mirror', async (event) => {
  try {
    await syncToMirror();
    return { success: true };
  } catch (error) {
    console.error('Error syncing to mirror:', error);
    return { success: false, error: error.message };
  }
});

// AI Summary operations - store summaries by article ID
ipcMain.handle('read-ai-summary', async (event, articleId) => {
  const filePath = path.join(dataDir, 'ai-summaries.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const summaries = JSON.parse(data);
    return { success: true, data: summaries[articleId] || null };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: null };
    }
    console.error('Error reading AI summary:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-ai-summary', async (event, articleId, summaryData) => {
  const filePath = path.join(dataDir, 'ai-summaries.json');
  try {
    let summaries = {};
    try {
      const existingData = await fs.readFile(filePath, 'utf-8');
      summaries = JSON.parse(existingData);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    summaries[articleId] = summaryData;
    await fs.writeFile(filePath, JSON.stringify(summaries, null, 2), 'utf-8');
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error writing AI summary:', error);
    return { success: false, error: error.message };
  }
});

// Calendar Events operations
ipcMain.handle('read-calendar-events', async (event) => {
  const filePath = path.join(dataDir, 'calendar-events.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: { events: [], lastExtraction: null } };
    }
    console.error('Error reading calendar events:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-calendar-events', async (event, calendarData) => {
  const filePath = path.join(dataDir, 'calendar-events.json');
  try {
    await fs.writeFile(filePath, JSON.stringify(calendarData, null, 2), 'utf-8');
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error writing calendar events:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-calendar-event', async (event, eventId) => {
  const filePath = path.join(dataDir, 'calendar-events.json');
  try {
    let calendarData = { events: [], lastExtraction: null };
    try {
      const existingData = await fs.readFile(filePath, 'utf-8');
      calendarData = JSON.parse(existingData);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    calendarData.events = calendarData.events.filter(e => e.id !== eventId);
    await fs.writeFile(filePath, JSON.stringify(calendarData, null, 2), 'utf-8');
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-past-calendar-events', async (event) => {
  const filePath = path.join(dataDir, 'calendar-events.json');
  try {
    let calendarData = { events: [], lastExtraction: null };
    try {
      const existingData = await fs.readFile(filePath, 'utf-8');
      calendarData = JSON.parse(existingData);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const now = new Date();
    calendarData.events = calendarData.events.filter(e => {
      if (!e.startDate) return true; // Keep events without dates
      const eventDate = new Date(e.startDate);
      return eventDate >= now;
    });

    await fs.writeFile(filePath, JSON.stringify(calendarData, null, 2), 'utf-8');
    triggerMirrorSync();
    return { success: true };
  } catch (error) {
    console.error('Error clearing past calendar events:', error);
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
    // Trigger mirror sync in background (don't await to avoid blocking)
    triggerMirrorSync();
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

// Auto-updater configuration
function setupAutoUpdater() {
  // Lazy load electron-updater after app is ready
  const { autoUpdater } = require('electron-updater');
  
  // Auto-updater is configured via package.json "publish" field
  // It will automatically use GitHub releases from the configured repository
  
  // Check for updates on startup (after a short delay to not block app startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Error checking for updates:', err);
    });
  }, 5000);
  
  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Error checking for updates:', err);
    });
  }, 4 * 60 * 60 * 1000); // 4 hours
  
  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'checking' });
    }
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'not-available' });
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });
  
  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: error.message
      });
    }
  });
}

// IPC handlers for update operations
ipcMain.handle('check-for-updates', async () => {
  try {
    const { autoUpdater } = require('electron-updater');
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-update-status', async () => {
  // Return current update status
  // This is a simple implementation - you might want to track state more explicitly
  return { success: true, status: 'idle' };
});

ipcMain.handle('install-update', async () => {
  try {
    const { autoUpdater } = require('electron-updater');
    // Quit and install update
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    console.error('Error installing update:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  // Initialize data directory
  await ensureDataDir();
  
  // Run migrations before creating window
  try {
    const storedVersion = await migrations.getStoredVersion(dataDir);
    console.log(`Current app version: ${appVersion}, Stored data version: ${storedVersion}`);
    
    const migrationSuccess = await migrations.runMigrations(dataDir, appVersion, storedVersion);
    if (!migrationSuccess) {
      console.error('Migration failed, but continuing with app startup');
    }
  } catch (error) {
    console.error('Error during migration:', error);
    // Continue with app startup even if migration fails
  }
  
  createWindow();
  
  // Setup auto-updater after window is created
  setupAutoUpdater();
  
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
