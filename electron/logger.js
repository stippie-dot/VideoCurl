const log = require('electron-log');

log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB per file
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{level}] {text}';

module.exports = log;
