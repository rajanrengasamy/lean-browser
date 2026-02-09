import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
};

const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level] ?? LOG_LEVELS.info;
    this.debugMode = options.debugMode ?? false;
    this.logFile = options.logFile ?? null;
    this.module = options.module ?? 'lean-browser';
    this.fileStream = null;
    this.useColor = options.color ?? process.stdout.isTTY;

    // If debug mode is explicitly enabled, set level to debug
    if (this.debugMode) {
      this.level = Math.min(this.level, LOG_LEVELS.debug);
    }

    // Support DEBUG env var for module-specific debugging
    const debugEnv = process.env.DEBUG;
    if (debugEnv) {
      const patterns = debugEnv.split(',').map((p) => p.trim());
      for (const pattern of patterns) {
        if (pattern === '*' || pattern === this.module || this.module.startsWith(pattern.replace('*', ''))) {
          this.debugMode = true;
          this.level = Math.min(this.level, LOG_LEVELS.debug);
          break;
        }
      }
    }
  }

  async initFileStream() {
    if (this.logFile && !this.fileStream) {
      try {
        await mkdir(dirname(this.logFile), { recursive: true });
        this.fileStream = createWriteStream(this.logFile, { flags: 'a' });
      } catch (err) {
        console.error(`Failed to open log file ${this.logFile}: ${err.message}`);
      }
    }
  }

  timestamp() {
    return new Date().toISOString();
  }

  shouldLog(level) {
    return LOG_LEVELS[level] >= this.level;
  }

  formatMessage(level, msg, meta = {}) {
    const ts = this.timestamp();
    const prefix = `[${ts}] [${this.module}] [${level.toUpperCase()}]`;
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${prefix} ${msg}${metaStr}`;
  }

  colorize(text, color) {
    if (!this.useColor) return text;
    return `${color}${text}${colors.reset}`;
  }

  writeToFile(formatted) {
    if (this.fileStream) {
      this.fileStream.write(formatted + '\n');
    }
  }

  trace(msg, meta = {}) {
    if (!this.shouldLog('trace')) return;
    const formatted = this.formatMessage('trace', msg, meta);
    console.log(this.colorize(formatted, colors.gray));
    this.writeToFile(formatted);
  }

  debug(msg, meta = {}) {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', msg, meta);
    console.log(this.colorize(formatted, colors.cyan));
    this.writeToFile(formatted);
  }

  info(msg, meta = {}) {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', msg, meta);
    console.log(this.colorize(formatted, colors.blue));
    this.writeToFile(formatted);
  }

  warn(msg, meta = {}) {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', msg, meta);
    console.warn(this.colorize(formatted, colors.yellow));
    this.writeToFile(formatted);
  }

  error(msg, meta = {}) {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', msg, meta);

    // In debug mode, include stack trace if available
    if (this.debugMode && meta.error instanceof Error) {
      console.error(this.colorize(formatted, colors.red));
      console.error(this.colorize(meta.error.stack, colors.red));
      this.writeToFile(formatted);
      this.writeToFile(meta.error.stack);
    } else {
      console.error(this.colorize(formatted, colors.red));
      this.writeToFile(formatted);
    }
  }

  // Helper for progress indicators
  progress(msg) {
    if (this.shouldLog('info')) {
      process.stderr.write(this.colorize(`${msg}\r`, colors.green));
    }
  }

  // Clear progress line
  clearProgress() {
    if (this.shouldLog('info')) {
      process.stderr.write('\r\x1b[K');
    }
  }

  // Success message
  success(msg, meta = {}) {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', msg, meta);
    console.log(this.colorize(formatted, colors.green));
    this.writeToFile(formatted);
  }

  close() {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }
}

// Global logger instance
let globalLogger = null;

export function createLogger(options = {}) {
  return new Logger(options);
}

export function initLogger(options = {}) {
  globalLogger = new Logger(options);
  if (options.logFile) {
    globalLogger.initFileStream().catch(() => {});
  }
  return globalLogger;
}

export function getLogger() {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

export { Logger };
