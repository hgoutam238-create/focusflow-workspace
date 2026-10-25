import type { StateStorage } from "zustand/middleware";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("omnifocus-engine", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("workspace");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function localRead<T>(key: string): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readonly");
    const request = transaction.objectStore("workspace").get(key);
    request.onsuccess = () => { resolve(request.result as T | undefined); db.close(); };
    request.onerror = () => { reject(request.error); db.close(); };
  });
}

export async function localWrite(key: string, value: unknown): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    transaction.objectStore("workspace").put(value, key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export const workspaceStorage: StateStorage = {
  getItem: async (name) => {
    try { return await localRead<string>(name) ?? localStorage.getItem(name); }
    catch { return localStorage.getItem(name); }
  },
  setItem: async (name, value) => {
    try { await localWrite(name, value); }
    catch {
      try { localStorage.setItem(name, value); }
      catch { window.dispatchEvent(new CustomEvent("omni:storage-error")); }
    }
  },
  removeItem: async (name) => {
    localStorage.removeItem(name);
    try { await localWrite(name, undefined); } catch { /* fallback already cleared */ }
  },
};