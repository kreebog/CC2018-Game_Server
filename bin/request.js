"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import classes
const util_1 = require("util");
const request_1 = __importDefault(require("request"));
var rp = require('request-promise-native');
// get singleton logger instance
const log = cc2018_ts_lib_1.Logger.getInstance();
/**
 * Wraps http request functionality in a call-back enabled function
 *
 * @param url - URL to request
 * @param callback - Callback to send response data to
 */
function doRequest(url, callback) {
    request_1.default(url, (err, res, body) => {
        if (err) {
            log.error(__filename, 'doRequest()', util_1.format('Error from %s \n::ERROR INFO:: %s', url, JSON.stringify(err)));
            return err;
        }
        if (res.statusCode != 200) {
            log.warn(__filename, 'handleMazeGetResponse()', util_1.format('Response Code %d (%s) recieved!  Discarding response.', res.statusCode, res.statusMessage));
            return;
        }
        // all good, apparently - fire othe callback 
        log.debug(__filename, 'doRequest()', util_1.format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}
exports.doRequest = doRequest;
function rpTest(url) {
    console.log('start');
    let data = '';
    rp(url).then(function (body) {
        data = body;
        console.log('work');
    });
    console.log('end');
    return data;
}
exports.rpTest = rpTest;
function rpTest2(url) {
    let data = '';
    var options = {
        uri: url,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
    };
    console.log('1');
    rp(options)
        .then(function (json) {
        console.log('2');
        console.log('Got json: ', json);
    })
        .catch(function (err) {
        console.log('ERROR: ' + JSON.stringify(err));
    });
    console.log('3');
    console.log('returning ' + data);
    return data;
}
exports.rpTest2 = rpTest2;
//# sourceMappingURL=request.js.map