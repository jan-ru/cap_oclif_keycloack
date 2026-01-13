import { execute } from '@oclif/core';

import { ErrorResponse } from './types/index.js';

/**
 * Global CLI configuration and error handling
 * Implements comprehensive error handling and logging for the entire application
 */

/**
 * Global error handler for uncaught exceptions and unhandled rejections
 * Ensures the CLI always exits gracefully with appropriate error codes
 */
function setupGlobalErrorHandling(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('\n🚨 Uncaught Exception:');
    console.error(error.message);
    console.error(
      '\nThis is likely a bug in the application. Please report it.'
    );
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      console.error('\n🚨 Unhandled Promise Rejection:');
      console.error('Reason:', reason);
      console.error('Promise:', promise);
      console.error(
        '\nThis is likely a bug in the application. Please report it.'
      );
      process.exit(1);
    }
  );

  // Handle SIGINT (Ctrl+C) gracefully
  process.on('SIGINT', () => {
    console.log('\n\n👋 Received interrupt signal. Exiting gracefully...');
    process.exit(0);
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    console.log('\n\n👋 Received termination signal. Exiting gracefully...');
    process.exit(0);
  });
}

/**
 * Enhanced CLI execution with global error handling and logging
 * This function wraps oclif's execute function with additional error handling
 */
export async function executeCLI(options?: {
  development?: boolean;
  dir?: string | URL;
}): Promise<void> {
  // Set up global error handling
  setupGlobalErrorHandling();

  // Set up environment-specific logging
  if (options?.development) {
    console.log('🔧 Running in development mode');
  }

  try {
    // Execute the CLI with oclif
    await execute({
      development: options?.development || false,
      dir: typeof options?.dir === 'string' ? options.dir : import.meta.url,
    });
  } catch (error) {
    // Handle CLI execution errors
    if (isErrorResponse(error)) {
      // Handle structured error responses
      console.error(`\n❌ ${error.error.message}`);

      if (error.error.details) {
        console.error(`Details: ${error.error.details}`);
      }

      if (error.error.suggestions && error.error.suggestions.length > 0) {
        console.error('\nSuggestions:');
        for (const [index, suggestion] of error.error.suggestions.entries()) {
          console.error(`  ${index + 1}. ${suggestion}`);
        }
      }

      // Exit with appropriate code based on error type
      const exitCode = getExitCodeForErrorCode(error.error.code);
      process.exit(exitCode);
    } else if (error instanceof Error) {
      // Handle standard errors
      console.error(`\n❌ ${error.message}`);
      console.error('\nUse --verbose for more detailed error information.');
      process.exit(1);
    } else {
      // Handle unknown errors
      console.error('\n❌ An unexpected error occurred.');
      console.error('Error:', error);
      console.error('\nPlease report this issue with the above error details.');
      process.exit(1);
    }
  }
}

/**
 * Maps error codes to appropriate exit codes
 * Implements consistent exit code handling across the application
 */
function getExitCodeForErrorCode(errorCode: string): number {
  const errorCodeMap: Record<string, number> = {
    ACCESS_DENIED: 5,
    AUTHENTICATION_ERROR: 4,
    // Network/connection errors (exit code 4)
    CONNECTION_ERROR: 4,

    DATA_RETRIEVAL_ERROR: 4,
    ENTITY_NOT_FOUND: 2,
    FILE_NOT_FOUND: 2,
    FILE_WRITE_ERROR: 5,
    INTERNAL_ERROR: 1,
    INVALID_PERIOD_FORMAT: 3,

    MALFORMED_SPECIFICATION: 3,
    NETWORK_ERROR: 4,
    ODATA_SERVICE_ERROR: 4,
    PARSE_ERROR: 3,
    // Permission/access errors (exit code 5)
    PERMISSION_ERROR: 5,
    // General application errors (exit code 1)
    REPORT_GENERATION_ERROR: 1,

    // Validation/input errors (exit code 3)
    SPECIFICATION_INVALID: 3,
    // File/resource not found (exit code 2)
    SPECIFICATION_NOT_FOUND: 2,
    TIMEOUT_ERROR: 4,
    UNAUTHORIZED: 5,

    UNKNOWN_ERROR: 1,
    UNSUPPORTED_REPORT_TYPE: 3,
    VALIDATION_ERROR: 3,
  };

  return errorCodeMap[errorCode] || 1; // Default to general error
}

/**
 * Type guard to check if an object is an ErrorResponse
 */
function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return Boolean(
    obj &&
    typeof obj === 'object' &&
    'error' in obj &&
    typeof (obj as ErrorResponse).error.code === 'string' &&
    typeof (obj as ErrorResponse).error.message === 'string' &&
    'timestamp' in obj
  );
}

/**
 * Logging utility for consistent CLI output
 */
export class CLILogger {
  private isVerbose: boolean;

  constructor(verbose: boolean = false) {
    this.isVerbose = verbose;
  }

  /**
   * Log a debug message (only in verbose mode)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.isVerbose) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`❌ ${message}`, ...args);
  }

  /**
   * Log an informational message
   */
  info(message: string, ...args: unknown[]): void {
    console.log(`ℹ️  ${message}`, ...args);
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.isVerbose = verbose;
  }

  /**
   * Log a success message
   */
  success(message: string, ...args: unknown[]): void {
    console.log(`✅ ${message}`, ...args);
  }

  /**
   * Log a verbose message (only in verbose mode)
   */
  verboseLog(message: string, ...args: unknown[]): void {
    if (this.isVerbose) {
      console.log(`📝 ${message}`, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`⚠️  ${message}`, ...args);
  }
}

/**
 * Global logger instance
 */
export const logger = new CLILogger();
