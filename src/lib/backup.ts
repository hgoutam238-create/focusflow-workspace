import { create } from "zustand";
import { useData } from "./store";
import { audioDb } from "./audio";
import { localRead, localWrite } from "./local-storage";

interface DirectoryHandle {
  name: string;
  queryPermission: (options: { mode: "readwrite" }) => Promise<string>;
  requestPermission: (options: { mode: "readwrite" }) => Promise<string>;
  getFileHandle: (name: string, options: { create: boolean }) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
}
let directory: DirectoryHandle | null = null;
let writes = Promise.resolve();
export const useBackup = create<{ folder: string; status: string }>(() => ({ folder: "", status: "Not linked" }));

export async function snapshot() {
  const { projects, tasks, habits, timeLogs, brainDump, reminders, notes, settings } = useData.getState();
  return JSON.stringify({ app: "OmniFocus Matrix Engine", version: 2, savedAt: new Date().toISOString(), projects, tasks, habits, timeLogs, brainDump, reminders, notes, settings, customAudio: await audioDb.all() }, null, 2);
}

export async function writeBackup() {
  if (!directory) return;
  const target = directory;
  const data = await snapshot();
  writes = writes.catch(() => undefined).then(async () => {
    try {
      if (await target.queryPermission({ mode: "readwrite" }) !== "granted") {
        useBackup.setState({ status: "Reconnect to allow backup" }); return;
      }
      const file = await target.getFileHandle("omnifocus_matrix_backup.json", { create: true });
      const stream = await file.createWritable();
      await stream.write(data); await stream.close();
      useBackup.setState({ status: "Saved " + new Date().toLocaleTimeString() });
    } catch { useBackup.setState({ status: "Backup failed — reconnect folder" }); }
  });
  await writes;
}

export async function linkBackupFolder() {
  const picker = (window as unknown as { showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<DirectoryHandle> }).showDirectoryPicker;
  if (!picker) throw new Error("Folder linking needs desktop Chrome or Edge. Use Download Backup in this browser.");
  const saved = directory ?? await localRead<DirectoryHandle>("backup-directory").catch(() => undefined);
  directory = saved && await saved.requestPermission({ mode: "readwrite" }) === "granted" ? saved : await picker({ mode: "readwrite" });
  await localWrite("backup-directory", directory).catch(() => undefined);
  useBackup.setState({ folder: directory.name, status: "Linked" });
  await writeBackup();
}

export async function initializeBackups() {
  directory = await localRead<DirectoryHandle>("backup-directory").catch(() => undefined) ?? null;
  if (directory) useBackup.setState({ folder: directory.name, status: await directory.queryPermission({ mode: "readwrite" }) === "granted" ? "Linked" : "Reconnect to allow backup" });
  return useData.subscribe((state, previous) => {
    if (state.notes !== previous.notes || state.habits !== previous.habits || state.timeLogs !== previous.timeLogs) void writeBackup().catch(() => useBackup.setState({ status: "Backup failed" }));
  });
}

export async function downloadBackup() {
  const url = URL.createObjectURL(new Blob([await snapshot()], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "omnifocus_matrix_backup.json"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}