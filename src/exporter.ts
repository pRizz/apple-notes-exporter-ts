/**
 * Apple Notes Exporter
 *
 * A library for exporting Apple Notes folders to the file system via AppleScript.
 *
 * This library provides functions to list available Apple Notes folders and export them
 * recursively to HTML files. It works by invoking an AppleScript that interacts
 * with the Notes app.
 *
 * ## Requirements
 *
 * - **macOS only** - This library relies on AppleScript and the Notes app, which are
 *   only available on macOS.
 * - Automation permissions for the Notes app must be granted in System Settings
 *
 * @module
 */

import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ExportError,
  InvalidPathError,
  LaunchError,
  ScriptFailedError,
  ScriptNotFoundError,
  TempFileError,
  UnsupportedPlatformError,
} from "./errors";

/** Relative path to the vendored AppleScript from package root */
const VENDORED_SCRIPT_PATH = path.join(
  "vendor",
  "apple-notes-exporter",
  "scripts",
  "export_notes.applescript"
);

/**
 * Source for the AppleScript to execute.
 */
type ScriptSource =
  | { type: "embedded" }
  | { type: "path"; path: string };

/**
 * Checks if the current platform is macOS.
 * @throws {UnsupportedPlatformError} If not running on macOS.
 */
function checkPlatform(): void {
  if (process.platform !== "darwin") {
    throw new UnsupportedPlatformError(process.platform);
  }
}

/**
 * Gets the package root directory.
 * Works both when running from source and when installed as a dependency.
 */
function getPackageRoot(): string {
  // When compiled, this file is at dist/exporter.js
  // Package root is one level up
  return path.resolve(__dirname, "..");
}

/**
 * Gets the path to the vendored AppleScript.
 */
function getVendoredScriptPath(): string {
  return path.resolve(getPackageRoot(), VENDORED_SCRIPT_PATH);
}

/**
 * An Apple Notes exporter that can list folders and export notes.
 *
 * Use `Exporter.create()` for the default vendored script, or
 * `Exporter.withScriptPath()` for a custom script.
 *
 * @example
 * ```typescript
 * import { Exporter } from 'apple-notes-exporter';
 *
 * const exporter = Exporter.create();
 * await exporter.listFolders();
 * await exporter.exportFolder('My Notes', './exports');
 * ```
 */
export class Exporter {
  private readonly scriptSource: ScriptSource;

  private constructor(scriptSource: ScriptSource) {
    this.scriptSource = scriptSource;
  }

  /**
   * Creates a new exporter using the vendored AppleScript.
   *
   * This is the recommended way to create an exporter for most use cases.
   *
   * @returns A new Exporter instance.
   *
   * @example
   * ```typescript
   * const exporter = Exporter.create();
   * await exporter.listFolders();
   * ```
   */
  static create(): Exporter {
    return new Exporter({ type: "embedded" });
  }

  /**
   * Creates a new exporter using a custom AppleScript at the specified path.
   *
   * @param scriptPath - Path to the AppleScript file.
   * @returns A new Exporter instance.
   * @throws {ScriptNotFoundError} If the script file does not exist.
   *
   * @example
   * ```typescript
   * const exporter = Exporter.withScriptPath('./custom_script.applescript');
   * ```
   */
  static withScriptPath(scriptPath: string): Exporter {
    const resolvedPath = path.resolve(scriptPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new ScriptNotFoundError(resolvedPath);
    }
    return new Exporter({ type: "path", path: resolvedPath });
  }

  /**
   * Lists all available top-level folders across all Apple Notes accounts.
   *
   * The output is printed to stdout by the AppleScript.
   *
   * @example
   * ```typescript
   * const exporter = Exporter.create();
   * await exporter.listFolders();
   * ```
   */
  async listFolders(): Promise<void> {
    await this.runScript(["list"]);
  }

  /**
   * Lists all available top-level folders (synchronous version).
   */
  listFoldersSync(): void {
    this.runScriptSync(["list"]);
  }

  /**
   * Exports a folder recursively to HTML files.
   *
   * The folder search uses breadth-first search and looks at all levels
   * (not just top-level) to find the folder. Once found, it exports that
   * folder and all its subfolders recursively.
   *
   * This method searches all accounts for the folder. If a folder with the
   * same name exists in multiple accounts, use `exportFolderFromAccount`
   * to specify which account to use.
   *
   * @param folder - The folder name to export.
   * @param outputDir - The directory where exported notes will be saved.
   *   Will be created if it doesn't exist.
   *
   * @example
   * ```typescript
   * const exporter = Exporter.create();
   * await exporter.exportFolder('My Notes', './exports');
   * ```
   */
  async exportFolder(folder: string, outputDir: string): Promise<void> {
    await this.exportFolderImpl(folder, outputDir);
  }

  /**
   * Exports a folder recursively to HTML files (synchronous version).
   */
  exportFolderSync(folder: string, outputDir: string): void {
    this.exportFolderImplSync(folder, outputDir);
  }

  /**
   * Exports a folder from a specific account recursively to HTML files.
   *
   * This is useful when a folder with the same name exists in multiple accounts.
   * The folder search uses breadth-first search and looks at all levels
   * (not just top-level) to find the folder within the specified account.
   *
   * @param account - The account name (e.g., "iCloud", "Google", "On My Mac").
   * @param folder - The folder name to export.
   * @param outputDir - The directory where exported notes will be saved.
   *   Will be created if it doesn't exist.
   *
   * @example
   * ```typescript
   * const exporter = Exporter.create();
   *
   * // Export "Work" folder from iCloud account
   * await exporter.exportFolderFromAccount('iCloud', 'Work', './exports');
   *
   * // Export "Work" folder from Google account
   * await exporter.exportFolderFromAccount('Google', 'Work', './google_exports');
   * ```
   */
  async exportFolderFromAccount(
    account: string,
    folder: string,
    outputDir: string
  ): Promise<void> {
    const folderSpec = `${account}:${folder}`;
    await this.exportFolderImpl(folderSpec, outputDir);
  }

  /**
   * Exports a folder from a specific account (synchronous version).
   */
  exportFolderFromAccountSync(
    account: string,
    folder: string,
    outputDir: string
  ): void {
    const folderSpec = `${account}:${folder}`;
    this.exportFolderImplSync(folderSpec, outputDir);
  }

  private async exportFolderImpl(
    folderSpec: string,
    outputDir: string
  ): Promise<void> {
    const resolvedOutputDir = this.prepareOutputDir(outputDir);
    await this.runScript(["export", folderSpec, resolvedOutputDir]);
  }

  private exportFolderImplSync(folderSpec: string, outputDir: string): void {
    const resolvedOutputDir = this.prepareOutputDir(outputDir);
    this.runScriptSync(["export", folderSpec, resolvedOutputDir]);
  }

  private prepareOutputDir(outputDir: string): string {
    // Create the directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });

    // Resolve to absolute path
    const resolved = path.resolve(outputDir);
    if (!resolved) {
      throw new InvalidPathError(outputDir);
    }

    return resolved;
  }

  private async runScript(args: string[]): Promise<void> {
    checkPlatform();

    if (this.scriptSource.type === "embedded") {
      await this.runEmbeddedScript(args);
    } else {
      await this.runScriptFile(this.scriptSource.path, args);
    }
  }

  private runScriptSync(args: string[]): void {
    checkPlatform();

    if (this.scriptSource.type === "embedded") {
      this.runEmbeddedScriptSync(args);
    } else {
      this.runScriptFileSync(this.scriptSource.path, args);
    }
  }

  private async runEmbeddedScript(args: string[]): Promise<void> {
    const scriptPath = getVendoredScriptPath();
    if (!fs.existsSync(scriptPath)) {
      throw new ScriptNotFoundError(scriptPath);
    }
    await this.runScriptFile(scriptPath, args);
  }

  private runEmbeddedScriptSync(args: string[]): void {
    const scriptPath = getVendoredScriptPath();
    if (!fs.existsSync(scriptPath)) {
      throw new ScriptNotFoundError(scriptPath);
    }
    this.runScriptFileSync(scriptPath, args);
  }

  private runScriptFile(scriptPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("osascript", [scriptPath, ...args], {
        stdio: "inherit",
      });

      child.on("error", (error) => {
        reject(new LaunchError(error));
      });

      child.on("exit", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        if (code !== null) {
          reject(new ScriptFailedError(code));
          return;
        }

        if (signal) {
          reject(
            new ScriptFailedError(-1, `Process terminated by signal: ${signal}`)
          );
          return;
        }

        reject(new ScriptFailedError(-1, "Unknown error"));
      });
    });
  }

  private runScriptFileSync(scriptPath: string, args: string[]): void {
    const result = spawnSync("osascript", [scriptPath, ...args], {
      stdio: "inherit",
    });

    if (result.error) {
      throw new LaunchError(result.error);
    }

    if (result.status !== 0) {
      throw new ScriptFailedError(result.status ?? -1);
    }
  }
}
