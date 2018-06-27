import { Logger } from 'cc2018-ts-lib'; // import classes
import { LOG_LEVELS } from 'cc2018-ts-lib/dist/Logger';
import { format } from 'util';
import request from 'request';

var rp = require('request-promise-native');

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
            log.warn(__filename, 'handleMazeGetResponse()', format('Response Code %d (%s) recieved!  Discarding response.', res.statusCode, res.statusMessage));
            return;
        }

        // all good, apparently - fire othe callback 
        log.debug(__filename, 'doRequest()', format('Response %d (%s) recieved. Calling back to [%s]', res.statusCode, res.statusMessage, callback.name));
        callback(res, body);
    });
}

export function rpTest(url: string): string {
    console.log('start');
    let data = '';
    rp(url).then(function (body: string) {
        data = body;
        console.log('work');
     });

     console.log('end');
     return data;
}

export function rpTest2(url: string): string {
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
        .then(function (json: any) {
            console.log('2');
            console.log('Got json: ', json);
        })
        .catch(function (err: any) {
            console.log('ERROR: ' + JSON.stringify(err));
        });
    console.log('3');
    console.log('returning ' + data);
    return data;
}