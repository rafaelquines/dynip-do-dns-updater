"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
const winston = __importStar(require("winston"));
const myFormat = winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});
const logger = winston.createLogger({
    format: winston.format.combine(winston.format.colorize(), winston.format.timestamp(), myFormat),
    level: "info",
    transports: [
        new winston.transports.Console(),
    ],
});
module.exports = logger;
