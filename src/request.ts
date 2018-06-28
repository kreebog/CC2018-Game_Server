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
export function doRequest(url: string, callback: Function) {
    request(url, (err, res, body) => {
        if (err) {
            log.error(__filename, 'doRequest()', format('Error from %s \n::ERROR INFO:: %s', url, JSON.stringify(err)));
            return err;
        }
        
        if (res.statusCode != 200) {
            log.warn(__filename, 'doRequest()', format('Response Code %d (%s) recieved! Discarding response from %s', res.statusCode, res.statusMessage, url));
            return;
        }

        // all good, apparently - fire othe callback 
        log.debug(__filename, 'doRequest()', format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}
