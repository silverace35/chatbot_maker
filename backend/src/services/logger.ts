/**
 * Structured logging service using Winston
 * Provides consistent logging across the application with context
 */

import winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get and validate logs directory
 * Validates that the path is safe and doesn't allow directory traversal
 */
function getLogsDirectory(): string {
  const cwd = process.cwd();
  
  if (process.env.LOG_DIR) {
    // Resolve the path
    const requestedPath = path.resolve(process.env.LOG_DIR);
    
    // Security: Ensure the resolved path is within or at the application directory
    // This prevents directory traversal attacks via '../../../etc/passwd'
    if (!requestedPath.startsWith(cwd)) {
      console.warn(`[Logger] LOG_DIR "${process.env.LOG_DIR}" is outside application directory. Using default logs/ directory.`);
      return path.join(cwd, 'logs');
    }
    
    return requestedPath;
  }
  
  return path.join(cwd, 'logs');
}

// Ensure logs directory exists
const logsDir = getLogsDirectory();

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let log = `[${timestamp}] ${level}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Remove internal winston properties
      const { splat, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        log += `\n  ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }
    
    return log;
  })
);

// Custom format for file output (JSON for easier parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport (colorized)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Logger interface for structured logging
 */
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Create a child logger with context
 */
export function createLogger(context: string): Logger {
  return {
    info: (message: string, meta?: Record<string, any>) => {
      logger.info(message, { context, ...meta });
    },
    warn: (message: string, meta?: Record<string, any>) => {
      logger.warn(message, { context, ...meta });
    },
    error: (message: string, meta?: Record<string, any>) => {
      logger.error(message, { context, ...meta });
    },
    debug: (message: string, meta?: Record<string, any>) => {
      logger.debug(message, { context, ...meta });
    },
  };
}

// Export the base logger
export default logger;
