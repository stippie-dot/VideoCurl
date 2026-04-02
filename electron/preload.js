const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Directory
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openInExplorer: (filePath) => ipcRenderer.invoke('open-in-explorer', filePath),

  // Scanning
  scanDirectory: (dirPath, includeSubfolders) =>
    ipcRenderer.invoke('scan-directory', dirPath, includeSubfolders),
  onScanProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('scan-progress', handler);
    return () => ipcRenderer.removeListener('scan-progress', handler);
  },

  // Thumbnail generation
  generateThumbnails: (videos, dirPath) =>
    ipcRenderer.invoke('generate-thumbnails', videos, dirPath),
  cancelGeneration: () => ipcRenderer.invoke('cancel-generation'),
  getOSThumbnail: (filePath) => ipcRenderer.invoke('get-os-thumbnail', filePath),
  onThumbProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('thumb-progress', handler);
    return () => ipcRenderer.removeListener('thumb-progress', handler);
  },
  onThumbReady: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('thumb-ready', handler);
    return () => ipcRenderer.removeListener('thumb-ready', handler);
  },

  // Cache
  saveCache: (dirPath, videos) => ipcRenderer.invoke('save-cache', dirPath, videos),

  // Actions
  batchDelete: (filePaths) => ipcRenderer.invoke('batch-delete', filePaths),
  openVideo: (filePath) => ipcRenderer.invoke('open-video', filePath),
});
