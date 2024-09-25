import chalk from 'chalk';
import winston from 'winston';

// Extender la interfaz Logger de Winston
interface TestLogger extends winston.Logger {
  testSuite(message: string, metadata?: Record<string, unknown>): void;
  testCase(message: string, metadata?: Record<string, unknown>): void;
}

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(({ timestamp, level, message, testName, testSuite, ...metadata }) => {
      const coloredLevel = winston.format.colorize().colorize(level, level.toUpperCase());
      let msg = `${chalk.gray(timestamp)} ${coloredLevel}: `;

      if (testSuite) {
        msg = `\n${chalk.cyan('='.repeat(80))}\n${msg}${chalk.yellow('[TEST SUITE]')} ${chalk.bold(testSuite)}\n${chalk.cyan('='.repeat(80))}\n`;
      } else if (testName) {
        msg = `\n${chalk.cyan('-'.repeat(80))}\n${msg}${chalk.yellow('[TEST]')} ${chalk.bold(testName)}\n${chalk.cyan('-'.repeat(80))}\n`;
      }

      msg += message;

      if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
      }

      return msg;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/test.log' }),
  ],
}) as TestLogger;

// Añadir métodos de conveniencia para logging de suites y tests
logger.testSuite = function (message: string, metadata: Record<string, unknown> = {}) {
  this.info(message, { ...metadata, testSuite: metadata.testSuite || message });
};

logger.testCase = function (message: string, metadata: Record<string, unknown> = {}) {
  this.info(message, { ...metadata, testName: metadata.testName || message });
};

export default logger;
