type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: unknown): void {
    const entry = this.createLogEntry('debug', message, data);
    this.addLog(entry);

    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message), data);
    }
  }

  info(message: string, data?: unknown): void {
    const entry = this.createLogEntry('info', message, data);
    this.addLog(entry);

    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message), data);
    }
  }

  warn(message: string, data?: unknown): void {
    const entry = this.createLogEntry('warn', message, data);
    this.addLog(entry);

    console.warn(this.formatMessage('warn', message), data);
  }

  error(message: string, error?: Error, data?: unknown): void {
    const entry = this.createLogEntry('error', message, data, error);
    this.addLog(entry);

    console.error(this.formatMessage('error', message), error, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
