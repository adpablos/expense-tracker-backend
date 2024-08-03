// src/utils/logger.ts
// Configure colors for each log level
import winston, {createLogger, format, transports} from 'winston';

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

const customFormat = format.printf(({timestamp, level, message, ...metadata}) => {
    const coloredLevel = format.colorize().colorize(level, level.toUpperCase());
    let msg = `${timestamp} ${coloredLevel}: ${message}`;
    if (Object.keys(metadata).length > 1) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({stack: true}),
        format.splat(),
        customFormat
    ),
    defaultMeta: {service: 'expense-tracker'},
    transports: [
        new transports.Console(),
        new transports.File({filename: 'logs/error.log', level: 'error'}),
        new transports.File({filename: 'logs/combined.log'})
    ]
});

winston.addColors(colors);

export default logger;
