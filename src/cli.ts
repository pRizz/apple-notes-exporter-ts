#!/usr/bin/env node
/**
 * Apple Notes Exporter CLI
 *
 * A command-line tool for exporting Apple Notes folders to the file system via AppleScript.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Exporter } from "./exporter";
import { ExportError } from "./errors";

/** Relative path to the vendored AppleScript (used when running from source). */
const VENDORED_SCRIPT_PATH = path.join(
  "vendor",
  "apple-notes-exporter",
  "scripts",
  "export_notes.applescript"
);

interface ParsedArgs {
  command: "list" | "export" | "help" | "version";
  folder?: string;
  outputDir?: string;
  scriptPath?: string;
}

function getPackageRoot(): string {
  // When compiled, this file is at dist/cli.js
  // Package root is one level up
  return path.resolve(__dirname, "..");
}

function getVersion(): string {
  const packageJsonPath = path.resolve(getPackageRoot(), "package.json");
  try {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version = parsed.version;
    if (typeof version === "string" && version.trim() !== "") {
      return version;
    }
  } catch {
    // Ignore errors
  }
  return "unknown";
}

function printUsage(): void {
  const message = `apple-notes-exporter ${getVersion()}
Export Apple Notes folders via AppleScript

USAGE:
    apple-notes-exporter <COMMAND>

COMMANDS:
    list, ls                          List all available top-level folders across all accounts
    export <FOLDER> <OUTPUT_DIR>      Export a folder recursively to HTML files
    help                              Print this help message
    version                           Print version information

EXAMPLES:
    apple-notes-exporter list
    apple-notes-exporter export "My Notes" ./output
    apple-notes-exporter export "iCloud:Work" ./output

NOTES:
    - Use "AccountName:FolderName" format if folder name exists in multiple accounts
    - Requires Automation permissions for Notes app (System Settings > Privacy & Security)
`;
  process.stdout.write(message);
}

function printVersion(): void {
  process.stdout.write(`apple-notes-exporter ${getVersion()}\n`);
}

function parseArgs(argv: string[]): ParsedArgs {
  // Skip node and script path
  const args = argv.slice(2);

  if (args.length === 0) {
    return { command: "help" };
  }

  const command = args[0];

  // Handle flags anywhere in args
  if (args.includes("-h") || args.includes("--help") || command === "help") {
    return { command: "help" };
  }

  if (args.includes("-V") || args.includes("--version") || command === "version") {
    return { command: "version" };
  }

  // Parse --script option
  let scriptPath: string | undefined;
  const scriptIndex = args.indexOf("--script");
  if (scriptIndex !== -1 && scriptIndex + 1 < args.length) {
    scriptPath = args[scriptIndex + 1];
  }

  if (command === "list" || command === "ls") {
    return { command: "list", scriptPath };
  }

  if (command === "export") {
    if (args.length < 3) {
      process.stderr.write(
        "Error: 'export' requires a folder name and output directory.\n\n"
      );
      printUsage();
      process.exit(1);
    }

    // Find folder and outputDir (skip --script and its value)
    const remainingArgs: string[] = [];
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--script") {
        i++; // Skip value
        continue;
      }
      remainingArgs.push(args[i]);
    }

    if (remainingArgs.length < 2) {
      process.stderr.write(
        "Error: 'export' requires a folder name and output directory.\n\n"
      );
      printUsage();
      process.exit(1);
    }

    return {
      command: "export",
      folder: remainingArgs[0],
      outputDir: remainingArgs[1],
      scriptPath,
    };
  }

  // Unknown command
  process.stderr.write(`Error: Unknown command '${command}'\n\n`);
  printUsage();
  process.exit(1);
}

function createExporter(scriptPath?: string): Exporter {
  // If custom script path provided, use it
  if (scriptPath) {
    return Exporter.withScriptPath(scriptPath);
  }

  // Try to use vendored script if available (when running from source)
  const vendoredPath = path.resolve(getPackageRoot(), VENDORED_SCRIPT_PATH);
  if (fs.existsSync(vendoredPath)) {
    return Exporter.withScriptPath(vendoredPath);
  }

  // Fall back to default (will use vendored script via Exporter.create())
  return Exporter.create();
}

async function run(parsedArgs: ParsedArgs): Promise<void> {
  if (parsedArgs.command === "help") {
    printUsage();
    return;
  }

  if (parsedArgs.command === "version") {
    printVersion();
    return;
  }

  const exporter = createExporter(parsedArgs.scriptPath);

  if (parsedArgs.command === "list") {
    await exporter.listFolders();
    return;
  }

  if (parsedArgs.command === "export") {
    await exporter.exportFolder(parsedArgs.folder!, parsedArgs.outputDir!);
    return;
  }
}

async function main(): Promise<void> {
  try {
    const parsedArgs = parseArgs(process.argv);
    await run(parsedArgs);
  } catch (error) {
    if (error instanceof ExportError) {
      process.stderr.write(`Error: ${error.message}\n`);
      process.exit(1);
    }

    // Re-throw unknown errors
    throw error;
  }
}

main();
