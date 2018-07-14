"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import classes
const util_1 = require("util");
const request_1 = __importDefault(require("request"));
// get singleton logger instance
const log = cc2018_ts_lib_1.Logger.getInstance();
/**
 * Wraps http request functionality in a call-back enabled function
 *
 * @param url - URL to request
 * @param callback - Callback to send response data to
 */
function doGet(url, callback) {
    log.debug(__filename, 'doGet()', util_1.format('Requesting [%s] with callback to [%s]', url, callback.name));
    request_1.default(url, (err, res, body) => {
        if (err) {
            log.error(__filename, 'doGet()', util_1.format('Error from %s \n::ERROR INFO:: %s', url, JSON.stringify(err)));
            return err;
        }
        if (res.statusCode != 200) {
            log.warn(__filename, 'doGet()', util_1.format('Response Code %d (%s) recieved! Discarding response from %s', res.statusCode, res.statusMessage, url));
            return;
        }
        // all good, apparently - fire othe callback
        log.debug(__filename, 'doGet()', util_1.format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}
exports.doGet = doGet;
/**
 * Wraps http request functionality in a call-back enabled function
 *
 * @param url - URL to request
 * @param callback - Callback to send response data to
 */
function doPost(url, body, callback) {
    log.debug(__filename, util_1.format('doPost(%s, %s, %s)', url, body, callback.name), util_1.format('Requesting [%s] with callback to [%s]', url, callback.name));
    let options = {
        url: url,
        json: body
    };
    request_1.default.post(options, (err, res, body) => {
        if (err) {
            log.error(__filename, 'doPost()', util_1.format('Error from %s \n::ERROR INFO:: %s', url, JSON.stringify(err)));
            return err;
        }
        if (res.statusCode != 200) {
            log.warn(__filename, 'doPost()', util_1.format('Response Code %d (%s) recieved! Discarding response from %s', res.statusCode, res.statusMessage, url));
            return;
        }
        // all good, apparently - fire othe callback
        log.debug(__filename, 'doPost()', util_1.format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}
exports.doPost = doPost;
//# sourceMappingURL=request.js.map