/**
 * Persistence Layer for Real-Time Collaboration State
 * Handles local storage, IndexedDB, and optional backend persistence
 */

export class PersistenceLayer {
  constructor(config = {}) {
    this.config = {
      dbName: config.dbName || 'kaizen_collab_db',
      version: config.version || 1,
      storeName: config.storeName || 'collaboration_state',
      useIndexedDB: config.useIndexedDB !== false,
      useLocalStorage: config.useLocalStorage !== false,
      enableRemoteSync: config.enableRemoteSync || false,
      remoteEndpoint: config.remoteEndpoint || '/api/persist',
      maxLocalStorageSize: config.maxLocalStorageSize || 5 * 1024 * 1024, // 5MB
      ...config
    };

    this.db = null;
    this.isReady = false;
    this.pendingSync = [];
    this.init();
  }

  async init() {
    if (typeof window === 'undefined') return; // Skip in non-browser environments

    try {
      if (this.config.useIndexedDB && 'indexedDB' in window) {
        await this.initIndexedDB();
      }
      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize PersistenceLayer:', error);
      this.isReady = false;
    }
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('documentId', 'documentId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Save document state
  async saveDocumentState(documentId, content, metadata = {}) {
    const state = {
      documentId,
      content,
      metadata,
      timestamp: Date.now(),
      version: metadata.version || 1
    };

    // Try IndexedDB first
    if (this.db) {
      await this.saveToIndexedDB(state);
    }

    // Fallback to localStorage
    if (this.config.useLocalStorage) {
      this.saveToLocalStorage(documentId, state);
    }

    // Sync to remote if enabled
    if (this.config.enableRemoteSync) {
      this.pendingSync.push(state);
      await this.syncToRemote();
    }

    return state;
  }

  async saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  saveToLocalStorage(documentId, state) {
    const key = `collab_${documentId}`;
    const json = JSON.stringify(state);

    // Check size before saving
    const currentSize = this.getLocalStorageSize();
    if (currentSize + json.length > this.config.maxLocalStorageSize) {
      console.warn('Local storage quota exceeded, pruning old entries');
      this.pruneLocalStorage();
    }

    try {
      localStorage.setItem(key, json);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  // Load document state
  async loadDocumentState(documentId) {
    // Try IndexedDB first
    if (this.db) {
      const state = await this.loadFromIndexedDB(documentId);
      if (state) return state;
    }

    // Fallback to localStorage
    if (this.config.useLocalStorage) {
      const state = this.loadFromLocalStorage(documentId);
      if (state) return state;
    }

    return null;
  }

  async loadFromIndexedDB(documentId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => {
        const results = request.result;
        // Return most recent version
        const latest = results.sort((a, b) => b.timestamp - a.timestamp)[0];
        resolve(latest || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  loadFromLocalStorage(documentId) {
    const key = `collab_${documentId}`;
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  }

  // Save collaboration operations
  async saveOperation(documentId, operation) {
    const opRecord = {
      documentId,
      operation,
      type: operation.type,
      timestamp: Date.now(),
      deviceId: operation.deviceId,
      vectorClock: operation.vectorClock
    };

    if (this.db) {
      await this.saveToIndexedDB(opRecord);
    }

    if (this.config.useLocalStorage) {
      const key = `ops_${documentId}`;
      const existing = localStorage.getItem(key) || '[]';
      const ops = JSON.parse(existing);
      ops.push(opRecord);
      localStorage.setItem(key, JSON.stringify(ops.slice(-100))); // Keep last 100 ops
    }

    if (this.config.enableRemoteSync) {
      this.pendingSync.push(opRecord);
    }

    return opRecord;
  }

  // Load operations for document
  async loadOperations(documentId, since = 0) {
    const operations = [];

    // Load from IndexedDB
    if (this.db) {
      const dbOps = await this.loadOperationsFromIndexedDB(documentId, since);
      operations.push(...dbOps);
    }

    // Load from localStorage
    if (this.config.useLocalStorage && operations.length === 0) {
      const key = `ops_${documentId}`;
      const json = localStorage.getItem(key);
      if (json) {
        const ops = JSON.parse(json);
        operations.push(...ops.filter(op => op.timestamp >= since));
      }
    }

    return operations;
  }

  async loadOperationsFromIndexedDB(documentId, since) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => {
        const results = request.result.filter(r => r.timestamp >= since && r.operation);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Save presence data
  async savePresence(documentId, userId, presence) {
    const presenceRecord = {
      documentId,
      userId,
      presence,
      timestamp: Date.now()
    };

    // Store in memory-only for presence (don't persist to storage)
    if (this.config.enableRemoteSync) {
      this.pendingSync.push(presenceRecord);
      await this.syncPresenceToRemote(presenceRecord);
    }

    return presenceRecord;
  }

  // Sync pending changes to remote
  async syncToRemote() {
    if (!this.config.enableRemoteSync || this.pendingSync.length === 0) return;

    try {
      const batch = this.pendingSync.splice(0, 50); // Sync in batches of 50
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch })
      });

      if (!response.ok) {
        // Put items back if sync failed
        this.pendingSync.unshift(...batch);
      }
    } catch (error) {
      console.error('Failed to sync to remote:', error);
    }
  }

  async syncPresenceToRemote(presenceRecord) {
    if (!this.config.enableRemoteSync) return;

    try {
      await fetch(`${this.config.remoteEndpoint}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presenceRecord)
      });
    } catch (error) {
      console.error('Failed to sync presence:', error);
    }
  }

  // Get storage statistics
  getLocalStorageSize() {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('collab_')) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  }

  getStorageStats() {
    return {
      localStorageUsed: this.getLocalStorageSize(),
      localStorageQuota: this.config.maxLocalStorageSize,
      pendingSyncItems: this.pendingSync.length,
      indexedDBReady: this.db !== null,
      isReady: this.isReady
    };
  }

  // Cleanup old entries
  pruneLocalStorage(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const now = Date.now();
    const keysToDelete = [];

    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('collab_')) {
        try {
          const state = JSON.parse(localStorage[key]);
          if (now - state.timestamp > maxAge) {
            keysToDelete.push(key);
          }
        } catch (error) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
    return keysToDelete.length;
  }

  // Clear all data
  async clear() {
    // Clear IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          // Also clear localStorage
          const keysToDelete = [];
          for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('collab_')) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(key => localStorage.removeItem(key));
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    }
  }

  // Export data for backup
  async exportData() {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      documents: [],
      operations: []
    };

    if (this.db) {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const records = request.result;
          records.forEach(record => {
            if (record.operation) {
              data.operations.push(record);
            } else {
              data.documents.push(record);
            }
          });
          resolve(data);
        };
      });
    }

    return data;
  }

  // Import data from backup
  async importData(data) {
    if (!this.db) return false;

    const transaction = this.db.transaction([this.config.storeName], 'readwrite');
    const store = transaction.objectStore(this.config.storeName);

    data.documents?.forEach(doc => store.put(doc));
    data.operations?.forEach(op => store.put(op));

    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
    });
  }
}

// Global persistence instance
export const persistence = new PersistenceLayer({
  useIndexedDB: true,
  useLocalStorage: true,
  enableRemoteSync: process.env.ENABLE_REMOTE_PERSISTENCE === 'true'
});
