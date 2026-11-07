import { base44 } from "@/api/base44Client";
import { createZip } from "./zip";
import { BACKUP_ENTITIES, fetchAllRecords, toCsv, collectFileUrls } from "./backupData";

async function fetchFiles(urls, onProgress) {
  const results = [];
  const list = [...urls];
  const used = new Set();
  let done = 0;
  for (let i = 0; i < list.length; i += 4) {
    const batch = await Promise.allSettled(list.slice(i, i + 4).map(async (url) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { url, data: new Uint8Array(await res.arrayBuffer()) };
    }));
    batch.forEach((r, j) => {
      const url = list[i + j];
      if (r.status === "fulfilled") {
        let name = decodeURIComponent(url.split("?")[0].split("/").pop() || "file");
        while (used.has(name)) name = `${used.size}_${name}`;
        used.add(name);
        results.push({ url, path: `files/${name}`, data: r.value.data });
      } else results.push({ url, error: r.reason?.message || "Download failed" });
    });
    done += batch.length;
    onProgress?.(`Downloading uploaded files (${done} of ${list.length})`);
  }
  return results;
}

// Builds a full backup ZIP, saves it to private storage and records it in history.
export async function createBackup({ type = "manual", user, onProgress, downloadLocal = true }) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `FCLDC_${type === "safety" ? "SafetyBackup" : "Backup"}_${stamp}.zip`;
  const record = await base44.entities.BackupRecord.create({
    file_name: fileName, status: "in_progress", backup_type: type,
    backup_created_at: now.toISOString(), created_by_name: user?.full_name || user?.email,
  });

  try {
    const entries = [];
    const tables = {};
    const warnings = [];
    const urls = new Set();
    let recordCount = 0;

    for (const name of BACKUP_ENTITIES) {
      onProgress?.(`Exporting ${name}`);
      const expected = await base44.entities[name].count({});
      const rows = await fetchAllRecords(name);
      if (rows.length < expected) warnings.push(`${name}: exported ${rows.length} of ${expected} records`);
      tables[name] = { records: rows.length, expected };
      recordCount += rows.length;
      rows.forEach((r) => collectFileUrls(r, urls));
      entries.push({ name: `data/${name}.json`, data: JSON.stringify(rows) });
      entries.push({ name: `csv/${name}.csv`, data: toCsv(rows) });
    }

    onProgress?.("Exporting users");
    const users = await base44.entities.User.list();
    tables.User = { records: users.length, expected: users.length };
    entries.push({ name: "data/User.json", data: JSON.stringify(users) });
    entries.push({ name: "csv/User.csv", data: toCsv(users) });

    const files = await fetchFiles(urls, onProgress);
    const failedFiles = files.filter((f) => f.error);
    files.filter((f) => f.data).forEach((f) => entries.push({ name: f.path, data: f.data }));
    if (failedFiles.length) warnings.push(`${failedFiles.length} uploaded file(s) could not be downloaded`);

    const manifest = {
      format: "fcldc-backup", version: 1, backup_created_at: now.toISOString(),
      backup_created_at_local: now.toLocaleString(), backup_type: type,
      created_by: user?.email, tables, record_count: recordCount,
      files: files.filter((f) => f.data).map(({ url, path }) => ({ url, path })),
      missing_files: failedFiles.map(({ url, error }) => ({ url, error })), warnings,
    };
    entries.unshift({ name: "manifest.json", data: JSON.stringify(manifest, null, 2) });

    onProgress?.("Building ZIP file");
    const blob = createZip(entries, now);
    if (downloadLocal) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }

    onProgress?.("Saving backup to secure storage");
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], fileName, { type: "application/zip" }) });

    const result = {
      file_uri, size_bytes: blob.size, table_count: Object.keys(tables).length, record_count: recordCount,
      file_count: files.length - failedFiles.length, missing_file_count: failedFiles.length, warnings,
      status: warnings.length ? "completed_with_warnings" : "completed",
    };
    await base44.entities.BackupRecord.update(record.id, result);
    return { ...record, ...result };
  } catch (error) {
    await base44.entities.BackupRecord.update(record.id, { status: "failed", error_message: error.message });
    throw error;
  }
}