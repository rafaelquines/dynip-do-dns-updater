import * as util from "util";
import * as winston from "winston";

const logger = new winston.Logger();
logger.add(winston.transports.Console, {
    colorize: true,
    level: "info",
    timestamp: true,
});

export = logger;
