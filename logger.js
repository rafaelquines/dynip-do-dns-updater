'use strict';

var util = require('util'),
    winston = require('winston'),
    logger = new winston.Logger();

logger.add(winston.transports.Console, {
    colorize: true,
    timestamp: true,
    level: 'info'
});

function formatArgs(args) {
    return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}

console.log = function() {
    logger.info.apply(logger, formatArgs(arguments));
};
console.info = function() {
    logger.info.apply(logger, formatArgs(arguments));
};
console.warn = function() {
    logger.warn.apply(logger, formatArgs(arguments));
};
console.error = function() {
    logger.error.apply(logger, formatArgs(arguments));
};
console.debug = function() {
    logger.debug.apply(logger, formatArgs(arguments));
};