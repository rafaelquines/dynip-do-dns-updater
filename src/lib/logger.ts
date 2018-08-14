import * as util from "util";
import * as winston from "winston";

const myFormat = winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        myFormat,
    ),
    level: "info",
    transports: [
        new winston.transports.Console(),
    ],
});

export = logger;
