import chalk from 'chalk';
import winston from 'winston';

// Extender la interfaz Logger de Winston
interface ExtendedLogger extends winston.Logger {
  testSuite(message: string, metadata?: Record<string, unknown>): void;
  testDescribe(message: string, metadata?: Record<string, unknown>): void;
  testCase(message: string, metadata?: Record<string, unknown>): void;
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(
    ({ timestamp, level, message, testSuite, testDescribe, testName, ...metadata }) => {
      const coloredLevel = winston.format.colorize().colorize(level, level.toUpperCase());
      let msg = `${chalk.gray(timestamp)} ${coloredLevel}: `;

      if (testSuite) {
        msg = `\n${chalk.cyan('='.repeat(100))}\n${msg}${chalk.yellow.bold('[TEST SUITE]')} ${chalk.cyan.bold(testSuite)}\n${chalk.cyan('='.repeat(100))}`;
      } else if (testDescribe) {
        msg = `\n${chalk.green('*'.repeat(80))}\n${msg}${chalk.magenta.bold('[DESCRIBE]')} ${chalk.green.bold(testDescribe)}\n${chalk.green('*'.repeat(80))}`;
      } else if (testName) {
        msg = `\n${msg}${chalk.blue.bold('[TEST]')} ${chalk.blue(testName)}\n${chalk.blue('-'.repeat(80))}`;
      } else {
        msg += message;
      }

      if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
      }

      return msg;
    }
  )
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
}) as ExtendedLogger;

winston.addColors(colors);

// Modificar los métodos de conveniencia
logger.testSuite = function (message: string, metadata: Record<string, unknown> = {}) {
  this.info('', { ...metadata, testSuite: message });
};

logger.testDescribe = function (message: string, metadata: Record<string, unknown> = {}) {
  this.info('', { ...metadata, testDescribe: message });
};

logger.testCase = function (message: string, metadata: Record<string, unknown> = {}) {
  this.info('', { ...metadata, testName: message });
};

export default logger;
