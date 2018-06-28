require('dotenv').config();
import * as consts from './consts';
import { IMazeStub, IMaze, ICell, IScore, GAME_RESULTS } from 'cc2018-ts-lib'; // import class interfaces
import  {Logger, Maze, Cell, Score, Enums } from 'cc2018-ts-lib'; // import classes
import { format } from 'util';
import { LOG_LEVELS } from 'cc2018-ts-lib/dist/Logger';
import { Server } from 'http';
import * as svc from './request';
import express from 'express';
import router from './router';

// set module instance references
let httpServer: Server; // will be set with app.listen
const enums = Enums.getInstance();
const log = Logger.getInstance();
const app = express();

// configure modules
log.setLogLevel(consts.NODE_ENV == 'DVLP' ? LOG_LEVELS.TRACE: LOG_LEVELS.INFO);
app.set('views', 'views');      // using pug html rendering engine
app.set('view engine', 'pug');  // using pug html rendering engine

// initialize cache arrays
let mazes:Array<IMaze> = new Array<IMaze>();                // full mazes - added to when requested (TODO: Possible?)
let mazeList:Array<IMazeStub> = new Array<IMazeStub>();     // list of available mazes
let scoreList:Array<IScore> = new Array<IScore>();          // list of available scores

// activity tracking vars
let serviceStarted: boolean = false;  // set true when startup() completes successfully
let activityDetected: boolean = true; // set true on new request, set false by refreshData()
let lastMazeListFill: number = 0;     // updated by Date.now() after cache request fulfillment 
let lastScoreListFill: number = 0;    // updated by Date.now() after cache request fulfillment 

// Service End Points
const EP = {
    'mazes': format('%s/%s', consts.MAZE_SVC_URL, 'get'),
    'mazeById': format('%s/%s', consts.MAZE_SVC_URL, 'get/:mazeId'),
    'scores': format('%s/%s', consts.SCORE_SVC_URL, 'get'),
} 

/**
 * Useful debug tool - dumps key/val array to debug/trace logs
 * 
 * @param list 
 * @param key 
 */
function dumpArray(list:Array<any>, key: string) {
    list.forEach(item => {
        log.debug(__filename, 'dumpArray()', format('%s=%s', key, item[key]));
        log.trace(__filename, 'dumpArray()', JSON.stringify(item));
    });
}

/**
 * Gets a maze (as a data object only) from the maze service and puts it into the mazes array
 * 
 * @param mazeId 
 */
function loadMazeById(mazeId: string) {
    svc.doRequest(EP['mazeById'].replace(':mazeId', '10:15:SimpleSample'), function handleGetMaze(res: Response, body:any) {
        let maze: IMaze = JSON.parse(body); // this assignment is not totally necessary, but helps debug logging
        mazes.push(maze);
        log.debug(__filename, 'handleGetMaze()', format('Maze %s loaded. \n%s', maze.id, maze.textRender));
    });
}

/**
 * Gets the list of available mazes and stores it locally
 */
function getMazes() {
    svc.doRequest(EP['mazes'], function handleGetMazes(res: Response, body:any) {
        mazeList = JSON.parse(body);
        // dumpArray(mazeList, 'id');
        log.debug(__filename, 'handleGetMazes()', format('%d maze stubs loaded into mazeList array.', mazeList.length));

        // attempt to start the service
        if (!serviceStarted) bootstrap();
    });
}

function getScores() {
    svc.doRequest(EP['scores'], function handleLoadScores(res: Response, body:any) {
        scoreList = JSON.parse(body);
        // dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'handleLoadScores()', format('%d scores loaded into scoreList array.', scoreList.length));

        // attempt to start the service
        if (!serviceStarted) bootstrap();
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
        if (lastMazeListFill < Date.now()) getMazes();
        if (lastScoreListFill < Date.now()) getScores();
    } else {
        log.debug(__filename, 'refreshData()', 'No recent activity detected, cache refresh cycle skipped.');
    }

}

/**
 * Kicks off the cache refresh interval once base caches are filled
 */
function bootstrap() {
    if (mazeList.length > 0 && scoreList.length > 0) {
        serviceStarted = true;
        setInterval(refreshData, consts.REFRESH_TIMER); // start the data refresh
        log.info(__filename, 'bootstrap()', format('Service starting. Cache refressing every %dms.', consts.REFRESH_TIMER));

        // start the express server
        startServer();
    } else {
        log.warn(__filename, 'bootstrap()', format('Maze and Score lists must be populated.  mazeList Length=%d, scoreList Length=%d', mazeList.length, scoreList.length));
    }
}

// initialize the server & cache refresh processes
getMazes();
getScores();

function startServer() {
    // create the express app reference
    // so far so good - let's start the service
    httpServer = app.listen(consts.GAME_SVC_PORT, function() {
        log.info(__filename, 'startServer()', format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT))

        // allow CORS for this application
        app.use(function(req, res, next) {
            log.trace(__filename, 'app.listen()', format('New request: %s', req.url));
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            // incoming request - set activity detected flag true
            activityDetected = true; 

            // move on to the next route
            next();
        });

        app.use('/*', router);
    });
}
