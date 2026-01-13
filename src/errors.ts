/**
 * Base error class for all Apple Notes export errors.
 */
export abstract class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when attempting to run on a non-macOS platform.
 */
export class UnsupportedPlatformError extends ExportError {
  readonly platform: string;

  constructor(platform: string) {
    super(
      `This tool only works on macOS. It relies on AppleScript and the Notes app, ` +
        `which are not available on ${platform}.`
    );
    this.platform = platform;
  }
}

/**
 * Error thrown when the AppleScript file is not found at the specified path.
 */
export class ScriptNotFoundError extends ExportError {
  readonly scriptPath: string;

  constructor(scriptPath: string) {
    super(`AppleScript not found at ${scriptPath}`);
    this.scriptPath = scriptPath;
  }
}

/**
 * Error thrown when failed to create a temporary file for the embedded script.
 */
export class TempFileError extends ExportError {
  readonly cause: Error;

  constructor(cause: Error) {
    super(`Failed to create temporary script file: ${cause.message}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when the output directory path is not valid.
 */
export class InvalidPathError extends ExportError {
  readonly path: string;

  constructor(path: string) {
    super(`Invalid path: ${path}`);
    this.path = path;
  }
}

/**
 * Error thrown when failed to launch the osascript process.
 */
export class LaunchError extends ExportError {
  readonly cause: Error;

  constructor(cause: Error) {
    super(`Failed to launch osascript: ${cause.message}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when the AppleScript exited with a non-zero status code.
 */
export class ScriptFailedError extends ExportError {
  readonly exitCode: number;
  readonly stderr?: string;

  constructor(exitCode: number, stderr?: string) {
    const message = stderr
      ? `AppleScript exited with status ${exitCode}: ${stderr}`
      : `AppleScript exited with status ${exitCode}`;
    super(message);
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}
