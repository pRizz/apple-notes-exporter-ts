# Apple Notes Exporter

[![npm version](https://img.shields.io/npm/v/apple-notes-exporter.svg)](https://www.npmjs.com/package/apple-notes-exporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A TypeScript library and CLI for exporting Apple Notes folders to HTML files via AppleScript.

## Quick Start

```bash
# List all your Notes folders
npx apple-notes-exporter list

# Export a folder to HTML files
npx apple-notes-exporter export "My Notes" ./output
```

## Features

- Export Apple Notes folders recursively to HTML files
- Preserve folder hierarchy in the exported directory structure
- Support for multiple accounts (iCloud, Google, On My Mac, etc.)
- Both async and sync APIs
- TypeScript types included

## Requirements

- **macOS only** - This tool relies on AppleScript and the Notes app
- **Node.js 18+**
- Automation permissions for Notes app (System Settings > Privacy & Security > Automation)

## Installation

```bash
npm install apple-notes-exporter
# or
pnpm add apple-notes-exporter
# or
yarn add apple-notes-exporter
```

## CLI Usage

### List all folders

```bash
apple-notes-exporter list
# or
apple-notes-exporter ls
```

Output:
```
=== Available Top-Level Folders ===
iCloud > Notes
iCloud > Work
Google > Notes
====================================
```

### Export a folder

```bash
# Export a folder (searches all accounts)
apple-notes-exporter export "My Notes" ./output

# Export from a specific account (use when folder names are duplicated)
apple-notes-exporter export "iCloud:Work" ./output
apple-notes-exporter export "Google:Notes" ./google-notes
```

### Help

```bash
apple-notes-exporter help
apple-notes-exporter --help
```

## Library Usage

### Quick Start

```typescript
import { listFolders, exportFolder, exportFolderFromAccount } from 'apple-notes-exporter';

// List all available folders
await listFolders();

// Export a folder to a directory (searches all accounts)
await exportFolder('My Notes', './exports');

// Export from a specific account (useful when folder names are duplicated)
await exportFolderFromAccount('iCloud', 'Work', './exports');
await exportFolderFromAccount('Google', 'Notes', './google-exports');
```

### Using the Exporter Class

For more control, use the `Exporter` class directly:

```typescript
import { Exporter } from 'apple-notes-exporter';

// Create an exporter with the default vendored script
const exporter = Exporter.create();

await exporter.listFolders();
await exporter.exportFolder('My Notes', './exports');
await exporter.exportFolderFromAccount('iCloud', 'Work', './exports');
```

### Using a Custom AppleScript

```typescript
import { Exporter } from 'apple-notes-exporter';

const exporter = Exporter.withScriptPath('./my-custom-script.applescript');
await exporter.exportFolder('My Notes', './exports');
```

### Synchronous API

All methods have synchronous versions:

```typescript
import { listFoldersSync, exportFolderSync, exportFolderFromAccountSync } from 'apple-notes-exporter';

listFoldersSync();
exportFolderSync('My Notes', './exports');
exportFolderFromAccountSync('iCloud', 'Work', './exports');
```

### Error Handling

```typescript
import {
  exportFolder,
  ExportError,
  UnsupportedPlatformError,
  ScriptNotFoundError,
  ScriptFailedError
} from 'apple-notes-exporter';

try {
  await exportFolder('My Notes', './exports');
} catch (error) {
  if (error instanceof UnsupportedPlatformError) {
    console.error('This tool only works on macOS');
  } else if (error instanceof ScriptNotFoundError) {
    console.error('AppleScript not found:', error.scriptPath);
  } else if (error instanceof ScriptFailedError) {
    console.error('Export failed with exit code:', error.exitCode);
  } else if (error instanceof ExportError) {
    console.error('Export error:', error.message);
  } else {
    throw error;
  }
}
```

## API Reference

### Convenience Functions

| Function | Description |
|----------|-------------|
| `listFolders()` | List all top-level folders across all accounts |
| `exportFolder(folder, outputDir)` | Export a folder recursively (searches all accounts) |
| `exportFolderFromAccount(account, folder, outputDir)` | Export a folder from a specific account |

All functions have `*Sync` variants for synchronous execution.

### Exporter Class

| Method | Description |
|--------|-------------|
| `Exporter.create()` | Create an exporter with the vendored AppleScript |
| `Exporter.withScriptPath(path)` | Create an exporter with a custom AppleScript |
| `exporter.listFolders()` | List all top-level folders |
| `exporter.exportFolder(folder, outputDir)` | Export a folder recursively |
| `exporter.exportFolderFromAccount(account, folder, outputDir)` | Export from a specific account |

### Error Types

| Error | Description |
|-------|-------------|
| `ExportError` | Base class for all export errors |
| `UnsupportedPlatformError` | Thrown when not running on macOS |
| `ScriptNotFoundError` | Thrown when the AppleScript file is not found |
| `TempFileError` | Thrown when temp file creation fails |
| `InvalidPathError` | Thrown when the output path is invalid |
| `LaunchError` | Thrown when osascript fails to launch |
| `ScriptFailedError` | Thrown when the AppleScript exits with non-zero status |

## Output Format

Exported notes are saved as HTML files with the format:

```
{output_dir}/
  {folder_name}/
    {note_title} -- {id}.html
    {subfolder_name}/
      {note_title} -- {id}.html
      ...
```

The `id` suffix ensures unique filenames when notes have the same title.

## Permissions

On first run, macOS will prompt you to grant automation permissions. You can also configure this manually:

1. Open **System Settings**
2. Go to **Privacy & Security** > **Automation**
3. Enable **Notes** access for **Terminal** (or your application)

## License

MIT
