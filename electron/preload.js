const { contextBridge, ipcRenderer } = require("electron");
console.log("Electron preload script");

contextBridge.exposeInMainWorld("electronAPI", {
  loadCandidates: (keyword, sortBy, pageIndex) => ipcRenderer.invoke("load-candidates", keyword, sortBy, pageIndex),
  uploadCV: () => ipcRenderer.invoke("upload-cv"),
  saveCandidates: (candidates) =>
    ipcRenderer.invoke("save-candidates", candidates),
  previewFile: (file) => ipcRenderer.invoke("preview-file", file),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  deleteCandidate: (id) => ipcRenderer.invoke("delete-candidate", id),
  updateCandidate: (candidate) =>
    ipcRenderer.invoke("update-candidate", candidate),

  setKey: (key) => ipcRenderer.invoke("set-key", key),
  getKey: () => ipcRenderer.invoke("get-key"),
});
