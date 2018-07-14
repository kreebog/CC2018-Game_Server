import { Logger } from 'cc2018-ts-lib'; // import classes
import { LOG_LEVELS } from 'cc2018-ts-lib/dist/Logger';
import { format } from 'util';
import request from 'request';

// get singleton logger instance
const log = Logger.getInstance();

/**
 * Wraps http request functionality in a call-back enabled function
 *
 * @param url - URL to request
 * @param callback - Callback to send response data to
 */
export function doGet(url: string, callback: Function) {
    log.debug(__filename, 'doGet()', format('Requesting [%s] with callback to [%s]', url, callback.name));

    request(url, (err, res, body) => {
        if (err) {
            log.error(__filename, 'doGet()', format('Error from %s \n::ERROR INFO:: %s', url, JSON.stringify(err)));
            return err;
        }

        if (res.statusCode != 200) {
            log.warn(__filename, 'doGet()', format('Response Code %d (%s) recieved! Discarding response from %s', res.statusCode, res.statusMessage, url));
            return;
        }

        // all good, apparently - fire othe callback
        log.debug(__filename, 'doGet()', format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}

/**
 * Wraps http request functionality in a call-back enabled function
 *
 * @param url - URL to request
 * @param callback - Callback to send response data to
 */
export function doPost(url: string, body: any, callback: Function) {
    log.debug(__filename, format('doPost(%s, %s, %s)', url, body, callback.name), format('Requesting [%s] with callback to [%s]', url, callback.name));
    let options = {
        url: url,
        json: body
    };

    request.post(options, (err, res, body) => {
        if (err) {
            log.error(__filename, 'doPost()', format('Error from %s \n::ERROR INFO:: %s', url, JSON.stringify(err)));
            return err;
        }

        if (res.statusCode != 200) {
            log.warn(__filename, 'doPost()', format('Response Code %d (%s) recieved! Discarding response from %s', res.statusCode, res.statusMessage, url));
            return;
        }

        // all good, apparently - fire othe callback
        log.debug(__filename, 'doPost()', format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}
