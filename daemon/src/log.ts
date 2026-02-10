/**
 * Simple timestamped logger.
 *
 * Format: [2026-02-10 10:30:00] LEVEL  message
 */

export type LogLevel = "INFO" | "WARN" | "ERROR";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function timestamp(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date} ${time}`;
}

export function log(level: LogLevel, message: string): void {
  const prefix = `[${timestamp()}] ${level.padEnd(5)}`;
  if (level === "ERROR") {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}
