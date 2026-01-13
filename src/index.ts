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
 *   only available on macOS. Attempting to run on other platforms will throw an error.
 * - Automation permissions for the Notes app must be granted in System Settings
 *
 * ## Quick Start
 *
 * ```typescript
 * import { listFolders, exportFolder, exportFolderFromAccount } from 'apple-notes-exporter';
 *
 * // List all available folders
 * await listFolders();
 *
 * // Export a folder to a directory (searches all accounts)
 * await exportFolder('My Notes', './exports');
 *
 * // Export from a specific account (useful when folder names are duplicated)
 * await exportFolderFromAccount('iCloud', 'Work', './exports');
 * ```
 *
 * ## Using a Custom Script
 *
 * If you need to use a custom AppleScript (e.g., a modified version), use the Exporter class:
 *
 * ```typescript
 * import { Exporter } from 'apple-notes-exporter';
 *
 * const exporter = Exporter.withScriptPath('./my_custom_script.applescript');
 *
 * await exporter.listFolders();
 * await exporter.exportFolder('My Notes', './exports');
 * ```
 *
 * @packageDocumentation
 */

// Re-export the Exporter class
export { Exporter } from "./exporter";

// Re-export error types
export {
  ExportError,
  UnsupportedPlatformError,
  ScriptNotFoundError,
  TempFileError,
  InvalidPathError,
  LaunchError,
  ScriptFailedError,
} from "./errors";

import { Exporter } from "./exporter";

/**
 * Lists all available top-level folders across all Apple Notes accounts.
 *
 * This is a convenience function that uses the vendored AppleScript.
 * For more control, use the `Exporter` class.
 *
 * @example
 * ```typescript
 * import { listFolders } from 'apple-notes-exporter';
 *
 * await listFolders();
 * ```
 */
export async function listFolders(): Promise<void> {
  const exporter = Exporter.create();
  await exporter.listFolders();
}

/**
 * Lists all available top-level folders (synchronous version).
 */
export function listFoldersSync(): void {
  const exporter = Exporter.create();
  exporter.listFoldersSync();
}

/**
 * Exports a folder recursively to HTML files.
 *
 * This is a convenience function that uses the vendored AppleScript.
 * For more control, use the `Exporter` class.
 *
 * This function searches all accounts for the folder. If a folder with the
 * same name exists in multiple accounts, use `exportFolderFromAccount`
 * to specify which account to use.
 *
 * @param folder - The folder name to export.
 * @param outputDir - The directory where exported notes will be saved.
 *
 * @example
 * ```typescript
 * import { exportFolder } from 'apple-notes-exporter';
 *
 * await exportFolder('My Notes', './exports');
 * ```
 */
export async function exportFolder(
  folder: string,
  outputDir: string
): Promise<void> {
  const exporter = Exporter.create();
  await exporter.exportFolder(folder, outputDir);
}

/**
 * Exports a folder recursively to HTML files (synchronous version).
 */
export function exportFolderSync(folder: string, outputDir: string): void {
  const exporter = Exporter.create();
  exporter.exportFolderSync(folder, outputDir);
}

/**
 * Exports a folder from a specific account recursively to HTML files.
 *
 * This is a convenience function that uses the vendored AppleScript.
 * For more control, use the `Exporter` class.
 *
 * This is useful when a folder with the same name exists in multiple accounts.
 *
 * @param account - The account name (e.g., "iCloud", "Google", "On My Mac").
 * @param folder - The folder name to export.
 * @param outputDir - The directory where exported notes will be saved.
 *
 * @example
 * ```typescript
 * import { exportFolderFromAccount } from 'apple-notes-exporter';
 *
 * // Export "Work" folder from iCloud account
 * await exportFolderFromAccount('iCloud', 'Work', './exports');
 *
 * // Export "Work" folder from Google account
 * await exportFolderFromAccount('Google', 'Work', './google_exports');
 * ```
 */
export async function exportFolderFromAccount(
  account: string,
  folder: string,
  outputDir: string
): Promise<void> {
  const exporter = Exporter.create();
  await exporter.exportFolderFromAccount(account, folder, outputDir);
}

/**
 * Exports a folder from a specific account (synchronous version).
 */
export function exportFolderFromAccountSync(
  account: string,
  folder: string,
  outputDir: string
): void {
  const exporter = Exporter.create();
  exporter.exportFolderFromAccountSync(account, folder, outputDir);
}
