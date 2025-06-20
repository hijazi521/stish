import type { LogEntry } from '@/types';

const DB_NAME = 'StishDB';
const DB_VERSION = 1;
const LOG_STORE_NAME = 'logs';

export interface StishDB extends IDBDatabase {
  // Define structure if needed, but typically not required for basic use
}

// 1. Open/Upgrade DB
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
        db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' });
        // Example of adding an index:
        // store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
  });
};

// 2. Add Log Entry
export const addLogToDB = async (db: IDBDatabase, logEntry: LogEntry): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(LOG_STORE_NAME);
    const request = store.add(logEntry);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error adding log to DB:', request.error);
      reject(request.error);
    };
  });
};

// 3. Get All Logs
export const getLogsFromDB = async (db: IDBDatabase): Promise<LogEntry[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOG_STORE_NAME, 'readonly');
    const store = transaction.objectStore(LOG_STORE_NAME);
    const request = store.getAll(); // Gets all logs

    request.onsuccess = () => {
      // Sort logs by timestamp in descending order (newest first)
      const sortedLogs = request.result.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      resolve(sortedLogs);
    };

    request.onerror = () => {
      console.error('Error getting logs from DB:', request.error);
      reject(request.error);
    };
  });
};

// 4. Clear All Logs
export const clearLogsFromDB = async (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(LOG_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error clearing logs from DB:', request.error);
      reject(request.error);
    };
  });
};
