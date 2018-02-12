import * as winston from 'winston';
import * as util from 'util';

let logger = new winston.Logger();
logger.add(winston.transports.Console, {
    colorize: true,
    timestamp: true,
    level: 'info'
});

export = logger;