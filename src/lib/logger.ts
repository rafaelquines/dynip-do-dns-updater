import * as winston from "winston";

const myFormat = winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});

export const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        myFormat,
    ),
    transports: [
        new winston.transports.Console(),
    ],
});
