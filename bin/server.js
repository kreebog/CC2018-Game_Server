"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const consts = __importStar(require("./consts"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import classes
const util_1 = require("util");
const Logger_1 = require("cc2018-ts-lib/dist/Logger");
const svc = __importStar(require("./request"));
// get singleton enums + helpers
const enums = cc2018_ts_lib_1.Enums.getInstance();
// get singleton logger instance
const log = cc2018_ts_lib_1.Logger.getInstance();
log.setLogLevel(consts.NODE_ENV == 'DVLP' ? Logger_1.LOG_LEVELS.DEBUG : Logger_1.LOG_LEVELS.INFO);
// cache arrays
let mazes = new Array(); // full mazes - added to when requested (TODO: Possible?)
let mazeList = new Array(); // list of available mazes
let scoreList = new Array(); // list of available scores
// activity tracking vars
let serviceStarted = false; // set true when startup() completes successfully
let activityDetected = true; // set true on new request, set false by refreshData()
let lastMazeListFill = 0; // updated by Date.now() after cache request fulfillment 
let lastScoreListFill = 0; // updated by Date.now() after cache request fulfillment 
// Service End Points
const EP = {
    'mazes': util_1.format('%s/%s', consts.MAZE_SVC_URL, 'get'),
    'mazeById': util_1.format('%s/%s', consts.MAZE_SVC_URL, 'get/:mazeId'),
    'scores': util_1.format('%s/%s', consts.SCORE_SVC_URL, 'get'),
};
/**
 * Useful debug tool - dumps key/val array to debug/trace logs
 *
 * @param list
 * @param key
 */
function dumpArray(list, key) {
    list.forEach(item => {
        log.debug(__filename, 'dumpArray()', util_1.format('%s=%s', key, item[key]));
        log.trace(__filename, 'dumpArray()', JSON.stringify(item));
    });
}
/**
 * Gets a maze (as a data object only) from the maze service and puts it into the mazes array
 *
 * @param mazeId
 */
function loadMazeById(mazeId) {
    svc.doRequest(EP['mazeById'].replace(':mazeId', '10:15:SimpleSample'), function handleGetMaze(res, body) {
        let maze = JSON.parse(body); // this assignment is not totally necessary, but helps debug logging
        mazes.push(maze);
        log.debug(__filename, 'handleGetMaze()', util_1.format('Maze %s loaded. \n%s', maze.id, maze.textRender));
    });
}
/**
 * Gets the list of available mazes and stores it locally
 */
function getMazes() {
    svc.doRequest(EP['mazes'], function handleGetMazes(res, body) {
        mazeList = JSON.parse(body);
        // dumpArray(mazeList, 'id');
        log.debug(__filename, 'handleGetMazes()', util_1.format('%d maze stubs loaded into mazeList array.', mazeList.length));
        // attempt to start the service
        if (!serviceStarted)
            doStartUp();
    });
}
function getScores() {
    svc.doRequest(EP['scores'], function handleLoadScores(res, body) {
        scoreList = JSON.parse(body);
        // dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'handleLoadScores()', util_1.format('%d scores loaded into scoreList array.', scoreList.length));
        // attempt to start the service
        if (!serviceStarted)
            doStartUp();
    });
}
// called on interval 
function refreshData() {
    // refresh cache only if...
    // ... there's been a request since the last refresh
    if (activityDetected) {
        // reset the request activity flag - there is a chance of inaccuracy here, 
        // but shouldn't have much of an impact
        activityDetected = false;
        // ... and the cache is potentially stale
        if (lastMazeListFill < Date.now())
            getMazes();
        if (lastScoreListFill < Date.now())
            getScores();
    }
    else {
        log.debug(__filename, 'refreshData()', 'No recent activity detected, cache refresh cycle skipped.');
    }
}
/**
 * Kicks off the cache refresh interval once base caches are filled
 */
function doStartUp() {
    if (mazeList.length > 0 && scoreList.length > 0) {
        serviceStarted = true;
        setInterval(refreshData, consts.REFRESH_TIMER); // start the data refresh
        log.info(__filename, 'doStartUp()', util_1.format('Service starting. Cache refressing every %dms.', consts.REFRESH_TIMER));
    }
    else {
        log.warn(__filename, 'doStartup()', util_1.format('Maze and Score lists must be populated.  mazeList Length=%d, scoreList Length=%d', mazeList.length, scoreList.length));
    }
}
// initialize the server & cache refresh processes
getMazes();
getScores();
//# sourceMappingURL=server.js.map