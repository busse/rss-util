// Preload script for secure IPC communication between main and renderer processes
// This file runs in the renderer process before the page loads

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to communicate
// with the main process securely. Add IPC channels here as needed.
contextBridge.exposeInMainWorld('electronAPI', {
  // Navigate to a different HTML file
  navigateTo: (file) => ipcRenderer.invoke('navigate-to', file),
  
  // File operations - all return promises with {success: boolean, data?: any, error?: string}
  
  // Generic JSON operations
  readJSON: (filename) => ipcRenderer.invoke('read-json', filename),
  writeJSON: (filename, data) => ipcRenderer.invoke('write-json', filename, data),
  
  // Feeds operations
  readFeeds: () => ipcRenderer.invoke('read-feeds'),
  writeFeeds: (feeds) => ipcRenderer.invoke('write-feeds', feeds),
  
  // Categories operations
  readCategories: () => ipcRenderer.invoke('read-categories'),
  writeCategories: (categories) => ipcRenderer.invoke('write-categories', categories),
  
  // Read states operations
  readReadStates: () => ipcRenderer.invoke('read-read-states'),
  writeReadStates: (readStates) => ipcRenderer.invoke('write-read-states', readStates),
  
  // Settings operations
  readSettings: () => ipcRenderer.invoke('read-settings'),
  writeSettings: (settings) => ipcRenderer.invoke('write-settings', settings),
  
  // Encrypted API key operations
  getEncryptedApiKey: () => ipcRenderer.invoke('get-encrypted-api-key'),
  setEncryptedApiKey: (apiKey) => ipcRenderer.invoke('set-encrypted-api-key', apiKey),
  
  // Feature flags operations
  getFeatureFlags: () => ipcRenderer.invoke('get-feature-flags'),
  setFeatureFlag: (flagName, enabled) => ipcRenderer.invoke('set-feature-flag', flagName, enabled),
  
  // RSS Feed operations
  fetchFeed: (url) => ipcRenderer.invoke('fetch-feed', url),
  
  // Articles operations
  readArticles: (feedId) => ipcRenderer.invoke('read-articles', feedId),
  writeArticles: (feedId, articlesData) => ipcRenderer.invoke('write-articles', feedId, articlesData),
  
  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Update event listeners
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, data) => callback(data));
  },
  
  // Remove update event listeners
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-status');
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.removeAllListeners('update-error');
  },
  
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
