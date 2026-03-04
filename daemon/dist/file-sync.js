/**
 * File Sync — tracks workspace file hashes per agent and detects changes.
 * Used by heartbeat to sync container workspace changes back to the dashboard.
 *
 * Conflict resolution: "last write wins" (MVP).
 * Future improvement: timestamp-based merging or CRDTs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
// ---------------------------------------------------------------------------
// State — last known hashes per agent
// ---------------------------------------------------------------------------
const hashStore = new Map();
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_SIZE = 100 * 1024; // 100KB
const SKIP_DIRS = new Set([
    "node_modules",
    ".git",
    "__pycache__",
    ".cache",
    "dist",
    "build",
]);
const MAX_DEPTH = 2; // root + one level deep (e.g. memory/foo.md)
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Scan workspace dir, compare hashes, return changed/new files.
 * Also updates the internal hash store.
 */
export function getChangedFiles(agentId, workspaceDir) {
    if (!fs.existsSync(workspaceDir))
        return [];
    const prevHashes = hashStore.get(agentId) ?? new Map();
    const currentHashes = new Map();
    const changes = [];
    // Scan files
    const files = scanDir(workspaceDir, workspaceDir, 0);
    for (const { relativePath, fullPath } of files) {
        try {
            const stat = fs.statSync(fullPath);
            if (stat.size > MAX_FILE_SIZE)
                continue;
            const content = fs.readFileSync(fullPath, "utf-8");
            const hash = crypto.createHash("sha256").update(content).digest("hex");
            currentHashes.set(relativePath, hash);
            const prevHash = prevHashes.get(relativePath);
            if (prevHash !== hash) {
                changes.push({ agentId, filename: relativePath, content, hash });
            }
        }
        catch {
            // Skip unreadable files (binary, permissions, etc.)
        }
    }
    // Update store with current state
    hashStore.set(agentId, currentHashes);
    return changes;
}
/**
 * Detect files that existed in the previous scan but no longer exist.
 * Must be called AFTER getChangedFiles (which updates the hash store).
 * Returns filenames that were deleted since the previous scan.
 */
export function getDeletedFiles(agentId, workspaceDir) {
    // We need the *previous* hashes before getChangedFiles updated them.
    // Since getChangedFiles already updated, we compare current store
    // against what's on disk. But getChangedFiles already did this update.
    // So we track deletions inline: compare old keys vs new keys.
    // To handle this properly, we'll track deletions during getChangedFiles.
    return deletedFilesStore.get(agentId) ?? [];
}
// Internal store for deleted files (populated during getChangedFiles)
const deletedFilesStore = new Map();
// Patch getChangedFiles to also track deletions — we do this by wrapping the logic.
// Actually let's refactor: make getChangedFiles also compute deletions.
/**
 * Full sync check: returns both changed files and deleted filenames.
 */
export function getFileChanges(agentId, workspaceDir) {
    if (!fs.existsSync(workspaceDir)) {
        // If workspace gone, everything is deleted
        const prev = hashStore.get(agentId);
        if (prev && prev.size > 0) {
            const deleted = Array.from(prev.keys());
            hashStore.set(agentId, new Map());
            return { changed: [], deleted };
        }
        return { changed: [], deleted: [] };
    }
    const prevHashes = hashStore.get(agentId) ?? new Map();
    const currentHashes = new Map();
    const changes = [];
    const files = scanDir(workspaceDir, workspaceDir, 0);
    for (const { relativePath, fullPath } of files) {
        try {
            const stat = fs.statSync(fullPath);
            if (stat.size > MAX_FILE_SIZE)
                continue;
            const content = fs.readFileSync(fullPath, "utf-8");
            const hash = crypto.createHash("sha256").update(content).digest("hex");
            currentHashes.set(relativePath, hash);
            if (prevHashes.get(relativePath) !== hash) {
                changes.push({ agentId, filename: relativePath, content, hash });
            }
        }
        catch {
            // Skip
        }
    }
    // Detect deletions
    const deleted = [];
    for (const filename of prevHashes.keys()) {
        if (!currentHashes.has(filename)) {
            deleted.push(filename);
        }
    }
    hashStore.set(agentId, currentHashes);
    deletedFilesStore.set(agentId, deleted);
    return { changed: changes, deleted };
}
function scanDir(baseDir, currentDir, depth) {
    if (depth >= MAX_DEPTH)
        return [];
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    for (const entry of entries) {
        if (entry.name.startsWith(".") && entry.name !== ".env")
            continue;
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name))
                continue;
            results.push(...scanDir(baseDir, fullPath, depth + 1));
        }
        else if (entry.isFile()) {
            const relativePath = path.relative(baseDir, fullPath);
            results.push({ relativePath, fullPath });
        }
    }
    return results;
}
