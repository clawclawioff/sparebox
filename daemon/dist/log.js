/**
 * Simple timestamped logger.
 *
 * Format: [2026-02-10 10:30:00] LEVEL  message
 */
function pad(n) {
    return n.toString().padStart(2, "0");
}
function timestamp() {
    const d = new Date();
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${date} ${time}`;
}
export function log(level, message) {
    const prefix = `[${timestamp()}] ${level.padEnd(5)}`;
    if (level === "ERROR") {
        console.error(`${prefix} ${message}`);
    }
    else {
        console.log(`${prefix} ${message}`);
    }
}
