// Turns avr-gcc output into clickable diagnostics that point at the learner's own line numbers.

export type Diagnostic = { line: number; column: number | null; severity: "error" | "warning" | "note"; message: string };

/** compileUnoFirmware prepends `#include <Arduino.h>` when a sketch does not include it. */
export function compileLineOffset(source: string) {
  return /#\s*include\s*[<"]Arduino\.h[>"]/.test(source) ? 0 : 1;
}

const PATTERN = /(?:^|[\s(])(?:[^\s:()]*\.(?:ino|cpp|cc|c|h|hpp))?:(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*([^\n]+)/g;

export function parseCompilerErrors(output: string, source: string): Diagnostic[] {
  const offset = compileLineOffset(source);
  const lineCount = source.split("\n").length;
  const seen = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  for (const match of output.matchAll(PATTERN)) {
    const line = Number(match[1]) - offset;
    if (line < 1 || line > lineCount) continue; // errors inside library headers, not the sketch
    const severity = match[3] === "warning" ? "warning" : match[3] === "note" ? "note" : "error";
    const message = match[4].trim().replace(/\s+/g, " ").slice(0, 240);
    const key = `${line}:${severity}:${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    diagnostics.push({ line, column: match[2] ? Number(match[2]) : null, severity, message });
  }
  return diagnostics.sort((a, b) => (a.severity === b.severity ? a.line - b.line : a.severity === "error" ? -1 : b.severity === "error" ? 1 : 0));
}
