// Preload script for secure IPC communication between main and renderer processes
// This file runs in the renderer process before the page loads

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to communicate
// with the main process securely. Add IPC channels here as needed.
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for future IPC methods
  // Example: fetchFeeds: () => ipcRenderer.invoke('fetch-feeds')
});
