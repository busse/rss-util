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
  
  // RSS Feed operations
  fetchFeed: (url) => ipcRenderer.invoke('fetch-feed', url),
  
  // Articles operations
  readArticles: (feedId) => ipcRenderer.invoke('read-articles', feedId),
  writeArticles: (feedId, articlesData) => ipcRenderer.invoke('write-articles', feedId, articlesData)
});
