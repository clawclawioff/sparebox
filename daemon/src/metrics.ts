import * as os from "node:os";
import { exec as execCb } from "node:child_process";

// ---------------------------------------------------------------------------
// CPU Usage — sample over 1 second using os.cpus() delta
// ---------------------------------------------------------------------------

interface CpuSnapshot {
  idle: number;
  total: number;
}

function snapshotCpu(): CpuSnapshot {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measure CPU usage (0–100) by sampling over ~1 second.
 */
export async function getCpuUsage(): Promise<number> {
  const a = snapshotCpu();
  await sleep(1000);
  const b = snapshotCpu();

  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;

  if (totalDelta === 0) return 0;

  const usage = ((totalDelta - idleDelta) / totalDelta) * 100;
  return Math.round(Math.max(0, Math.min(100, usage)));
}

// ---------------------------------------------------------------------------
// RAM Usage
// ---------------------------------------------------------------------------

/**
 * Current RAM usage as a 0–100 percentage.
 */
export function getRamUsage(): number {
  const total = os.totalmem();
  const free = os.freemem();
  if (total === 0) return 0;
  return Math.round(((total - free) / total) * 100);
}

// ---------------------------------------------------------------------------
// Disk Usage
// ---------------------------------------------------------------------------

function execPromise(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execCb(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} failed: ${err.message} — ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Disk usage of the root partition as 0–100.
 * Returns -1 if it can't be determined.
 */
export async function getDiskUsage(): Promise<number> {
  try {
    if (process.platform === "win32") {
      return await getDiskUsageWindows();
    }
    return await getDiskUsageUnix();
  } catch {
    return -1;
  }
}

async function getDiskUsageUnix(): Promise<number> {
  const output = await execPromise("df -P /");
  // Output format:
  // Filesystem  1024-blocks  Used  Available  Capacity  Mounted
  // /dev/sda1   123456789   12345  111111     10%       /
  const lines = output.trim().split("\n");
  if (lines.length < 2) return -1;

  const parts = lines[1]!.trim().split(/\s+/);
  // Capacity is typically column 4 (0-indexed) and looks like "10%"
  const capacityStr = parts[4];
  if (!capacityStr) return -1;

  const pct = parseInt(capacityStr.replace("%", ""), 10);
  return isNaN(pct) ? -1 : pct;
}

async function getDiskUsageWindows(): Promise<number> {
  const output = await execPromise(
    'wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv'
  );
  // CSV output: Node,FreeSpace,Size
  const lines = output.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return -1;

  const parts = lines[lines.length - 1]!.trim().split(",");
  // parts: [NodeName, FreeSpace, Size]
  const freeSpace = parseInt(parts[1] ?? "", 10);
  const totalSize = parseInt(parts[2] ?? "", 10);

  if (isNaN(freeSpace) || isNaN(totalSize) || totalSize === 0) return -1;

  return Math.round(((totalSize - freeSpace) / totalSize) * 100);
}

// ---------------------------------------------------------------------------
// Total Disk (GB)
// ---------------------------------------------------------------------------

/**
 * Total disk space of the root partition in GB (rounded to nearest integer).
 * Returns -1 if it can't be determined.
 */
export async function getTotalDiskGb(): Promise<number> {
  try {
    if (process.platform === "win32") {
      return await getTotalDiskGbWindows();
    }
    return await getTotalDiskGbUnix();
  } catch {
    return -1;
  }
}

async function getTotalDiskGbUnix(): Promise<number> {
  const output = await execPromise("df -k /");
  const lines = output.trim().split("\n");
  if (lines.length < 2) return -1;

  const parts = lines[1]!.trim().split(/\s+/);
  // Column 1 is total 1K-blocks
  const totalKb = parseInt(parts[1] ?? "", 10);
  if (isNaN(totalKb) || totalKb === 0) return -1;

  return Math.round(totalKb / (1024 * 1024)); // KB -> GB
}

async function getTotalDiskGbWindows(): Promise<number> {
  const output = await execPromise(
    'wmic logicaldisk where "DeviceID=\'C:\'" get Size /format:csv'
  );
  const lines = output.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return -1;

  const parts = lines[lines.length - 1]!.trim().split(",");
  const totalBytes = parseInt(parts[parts.length - 1] ?? "", 10);
  if (isNaN(totalBytes) || totalBytes === 0) return -1;

  return Math.round(totalBytes / (1024 ** 3));
}

// ---------------------------------------------------------------------------
// Total RAM (GB)
// ---------------------------------------------------------------------------

/**
 * Total system RAM in GB (rounded to 1 decimal).
 */
export function getTotalRamGb(): number {
  return Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// CPU Core Count
// ---------------------------------------------------------------------------

/**
 * Number of logical CPU cores.
 */
export function getCpuCores(): number {
  return os.cpus().length;
}

/**
 * CPU model string (e.g., "Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz").
 */
export function getCpuModel(): string {
  const cpus = os.cpus();
  return cpus.length > 0 ? cpus[0]!.model : "Unknown";
}

// ---------------------------------------------------------------------------
// OS Info
// ---------------------------------------------------------------------------

/**
 * Returns a string like "Linux 6.6.87" or "Darwin 23.2.0" or "Windows_NT 10.0.22631".
 */
export function getOsInfo(): string {
  return `${os.type()} ${os.release()}`;
}
