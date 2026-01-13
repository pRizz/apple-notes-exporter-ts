#!/usr/bin/env node

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type ParsedArgs = {
  maybeScriptPathOverride: string | null;
  passthroughArgs: string[];
  wantsHelp: boolean;
  wantsPrintScriptPath: boolean;
  wantsVersion: boolean;
};

const DEFAULT_SCRIPT_RELATIVE_PATH = path.join(
  "vendor",
  "apple-notes-exporter",
  "scripts",
  "export_notes_recursive.applescript",
);

function parseArgs(rawArgs: string[]): ParsedArgs {
  const passthroughArgs: string[] = [];
  let maybeScriptPathOverride: string | null = null;
  let wantsHelp = false;
  let wantsPrintScriptPath = false;
  let wantsVersion = false;

  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg === "--") {
      passthroughArgs.push(...rawArgs.slice(i + 1));
      break;
    }

    if (arg === "-h" || arg === "--help") {
      wantsHelp = true;
      i += 1;
      continue;
    }

    if (arg === "-v" || arg === "--version") {
      wantsVersion = true;
      i += 1;
      continue;
    }

    if (arg === "--print-script-path") {
      wantsPrintScriptPath = true;
      i += 1;
      continue;
    }

    if (arg === "--script") {
      const maybeValue = rawArgs[i + 1];
      if (!maybeValue || maybeValue.startsWith("--")) {
        throw new Error("--script requires a path value");
      }

      maybeScriptPathOverride = maybeValue;
      i += 2;
      continue;
    }

    passthroughArgs.push(arg);
    i += 1;
  }

  return {
    maybeScriptPathOverride,
    passthroughArgs,
    wantsHelp,
    wantsPrintScriptPath,
    wantsVersion,
  };
}

function getRepoRootFromDistDir(): string {
  // dist/cli.js -> repo root is one directory up
  return path.resolve(__dirname, "..");
}

function getDefaultScriptPath(): string {
  return path.resolve(getRepoRootFromDistDir(), DEFAULT_SCRIPT_RELATIVE_PATH);
}

function readPackageVersion(): string {
  const packageJsonPath = path.resolve(getRepoRootFromDistDir(), "package.json");
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: unknown };

  const maybeVersion = parsed.version;
  if (typeof maybeVersion !== "string" || maybeVersion.trim() === "") {
    return "unknown";
  }

  return maybeVersion;
}

function printHelp(resolvedScriptPath: string): void {
  const help = [
    "apple-notes-exporter",
    "",
    "A small wrapper around an AppleScript that exports Apple Notes recursively.",
    "",
    "Usage:",
    "  apple-notes-exporter",
    "  apple-notes-exporter \"Folder Name\" \"/path/to/output\"",
    "  apple-notes-exporter \"AccountName:FolderName\" \"/path/to/output\"",
    "",
    "Options:",
    "  --script <path>           Override the AppleScript path",
    "  --print-script-path       Print the resolved AppleScript path and exit",
    "  -h, --help                Show help",
    "  -v, --version             Show version",
    "",
    "Resolved AppleScript path:",
    `  ${resolvedScriptPath}`,
    "",
    "Notes:",
    "  - This must be run on macOS (requires the Notes.app scripting interface).",
    "  - You may need to grant Automation permissions to Terminal/osascript.",
    "",
  ].join("\n");

  process.stdout.write(help);
}

function ensureMacOsOrExit(): void {
  if (process.platform === "darwin") {
    return;
  }

  process.stderr.write(
    "Error: This command must be run on macOS (it invokes `osascript` and controls Notes.app).\n",
  );
  process.exit(1);
}

function ensureScriptExistsOrExit(scriptPath: string): void {
  if (fs.existsSync(scriptPath)) {
    return;
  }

  process.stderr.write(`Error: AppleScript not found at: ${scriptPath}\n`);
  process.stderr.write(
    `If you are in the repo, make sure the submodule is initialized:\n` +
      `  git submodule update --init --recursive\n`,
  );
  process.exit(1);
}

function runOsaScript(scriptPath: string, passthroughArgs: string[]): void {
  const child = spawn("osascript", [scriptPath, ...passthroughArgs], {
    stdio: "inherit",
  });

  child.on("error", (error) => {
    const maybeErrno = (error as NodeJS.ErrnoException).code;
    if (maybeErrno === "ENOENT") {
      process.stderr.write("Error: `osascript` not found in PATH.\n");
      process.exit(1);
    }

    process.stderr.write(`Error: Failed to start osascript: ${String(error)}\n`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (typeof code === "number") {
      process.exit(code);
    }

    if (signal) {
      process.stderr.write(`osascript terminated with signal: ${signal}\n`);
    }
    process.exit(1);
  });
}

function main(): void {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n\n`);
    printHelp(getDefaultScriptPath());
    process.exit(1);
    return;
  }

  const scriptPath = parsed.maybeScriptPathOverride
    ? path.resolve(process.cwd(), parsed.maybeScriptPathOverride)
    : getDefaultScriptPath();

  if (parsed.wantsVersion) {
    process.stdout.write(`${readPackageVersion()}\n`);
    return;
  }

  if (parsed.wantsPrintScriptPath) {
    process.stdout.write(`${scriptPath}\n`);
    return;
  }

  if (parsed.wantsHelp) {
    printHelp(scriptPath);
    return;
  }

  ensureMacOsOrExit();
  ensureScriptExistsOrExit(scriptPath);
  runOsaScript(scriptPath, parsed.passthroughArgs);
}

main();

