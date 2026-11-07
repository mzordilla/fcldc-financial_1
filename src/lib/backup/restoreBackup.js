import { base44 } from "@/api/base44Client";
import { readZip, readZipJson } from "./zip";
import { BACKUP_ENTITIES, NON_RESTORABLE, SYSTEM_FIELDS, fetchAllRecords } from "./backupData";

const CHUNK = 200;
const chunks = (arr) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, (i + 1) * CHUNK));
const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !SYSTEM_FIELDS.includes(k)));

function remap(value, idMap) {
  if (typeof value === "string") return idMap[value] || value;
  if (Array.isArray(value)) return value.map((v) => remap(v, idMap));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v, idMap)]));
  return value;
}

export async function inspectBackup(file) {
  const files = await readZip(file);
  const manifest = await readZipJson(files, "manifest.json");
  if (!manifest || manifest.format !== "fcldc-backup") throw new Error("This ZIP is not a System Backup file created by this app.");
  return { files, manifest };
}

// Restores tables so they match the backup: updates existing records, re-creates missing ones
// (re-linking references to their new IDs) and removes records that were not in the backup.
export async function restoreBackup({ files, manifest, onProgress }) {
  const tables = Object.keys(manifest.tables).filter((t) => BACKUP_ENTITIES.includes(t) && !NON_RESTORABLE.includes(t));
  const plan = [];
  const idMap = {};
  const summary = [];

  for (const name of tables) {
    onProgress?.(`Reading ${name}`);
    const backupRows = (await readZipJson(files, `data/${name}.json`)) || [];
    const current = await fetchAllRecords(name);
    const currentById = Object.fromEntries(current.map((r) => [r.id, r]));
    const backupIds = new Set(backupRows.map((r) => r.id));
    const missing = backupRows.filter((r) => !currentById[r.id]);
    for (const batch of chunks(missing)) {
      onProgress?.(`Re-creating ${name} records`);
      const created = await base44.entities[name].bulkCreate(batch.map(strip));
      batch.forEach((r, i) => { idMap[r.id] = created[i].id; });
    }
    plan.push({ name, backupRows, currentById, missing, toDelete: current.filter((r) => !backupIds.has(r.id)).map((r) => r.id) });
  }

  for (const { name, backupRows, currentById, missing, toDelete } of plan) {
    const updates = backupRows.map((r) => {
      const data = remap(strip(r), idMap);
      const existing = currentById[r.id];
      if (existing) Object.keys(strip(existing)).forEach((k) => { if (!(k in data)) data[k] = null; });
      return { id: idMap[r.id] || r.id, ...data };
    });
    for (const batch of chunks(updates)) {
      onProgress?.(`Restoring ${name}`);
      await base44.entities[name].bulkUpdate(batch);
    }
    for (const batch of chunks(toDelete)) {
      onProgress?.(`Removing records added after the backup from ${name}`);
      await base44.entities[name].deleteMany({ id: { $in: batch } });
    }
    summary.push({ name, restored: backupRows.length, recreated: missing.length, removed: toDelete.length });
  }
  return summary;
}