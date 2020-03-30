"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston = __importStar(require("winston"));
const myFormat = winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});
exports.logger = winston.createLogger({
    levels: winston.config.npm.levels,
    format: winston.format.combine(winston.format.colorize(), winston.format.timestamp(), myFormat),
    transports: [
        new winston.transports.Console(),
    ],
});
