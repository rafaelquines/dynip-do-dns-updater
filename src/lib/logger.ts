import * as winston from "winston";

const myFormat = winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});

export const logger = winston.createLogger({
    format:
        winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            myFormat,
        ),
    levels: winston.config.npm.levels,
    transports: [
        new winston.transports.Console(),
    ],
});
