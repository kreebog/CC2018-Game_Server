"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const consts = __importStar(require("./consts"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import classes
const util_1 = require("util");
const Logger_1 = require("cc2018-ts-lib/dist/Logger");
const svc = __importStar(require("./request"));
const express_1 = __importDefault(require("express"));
const router_1 = __importDefault(require("./router"));
// set module instance references
let httpServer; // will be set with app.listen
const enums = cc2018_ts_lib_1.Enums.getInstance();
const log = cc2018_ts_lib_1.Logger.getInstance();
const app = express_1.default();
// configure modules
log.setLogLevel(consts.NODE_ENV == 'DVLP' ? Logger_1.LOG_LEVELS.TRACE : Logger_1.LOG_LEVELS.INFO);
app.set('views', 'views'); // using pug html rendering engine
app.set('view engine', 'pug'); // using pug html rendering engine
// initialize cache arrays
let mazes = new Array(); // full mazes - added to when requested (TODO: Possible?)
let mazeList = new Array(); // list of available mazes
let scoreList = new Array(); // list of available scores
// initialize team and game tracking arrays
let teams = new Array();
let games = new Array();
// activity tracking vars
let serviceStarted = false; // set true when startup() completes successfully
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
    if (mazeLoaded(mazeId)) {
        log.debug(__filename, 'loadMazeById()', util_1.format('Maze [%s] already loaded, skipping.', mazeId));
    }
    else {
        svc.doRequest(EP['mazeById'].replace(':mazeId', mazeId), function handleGetMaze(res, body) {
            let maze = JSON.parse(body); // this assignment is not totally necessary, but helps debug logging
            mazes.push(maze);
            log.debug(__filename, 'handleGetMaze()', util_1.format('Maze %s loaded.', maze.id));
        });
    }
}
function mazeLoaded(mazeId) {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].id == mazeId)
            return true;
    }
    return false;
}
// Pull the list of available mazes from the maze-service
// cache it locally.  Refreshses as part of the incoming request
// process if consts.CACHE_DELAY is exceeded 
function updateMazesCache() {
    svc.doRequest(EP['mazes'], function handleGetMazes(res, body) {
        mazeList = JSON.parse(body);
        // dumpArray(mazeList, 'id');
        log.debug(__filename, 'handleGetMazes()', util_1.format('%d maze stubs loaded into mazeList array.', mazeList.length));
        // populate the mazes list
        mazeList.forEach(mazeStub => {
            loadMazeById(mazeStub.id);
        });
        // attempt to start the service
        if (!serviceStarted)
            bootstrap();
    });
}
// Same as updateMazesCache, but with scores
function udpateScoresCache() {
    svc.doRequest(EP['scores'], function handleLoadScores(res, body) {
        scoreList = JSON.parse(body);
        // dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'handleLoadScores()', util_1.format('%d scores loaded into scoreList array.', scoreList.length));
        // attempt to start the service
        if (!serviceStarted)
            bootstrap();
    });
}
/**
 * Kicks off the cache refresh interval once base caches are filled
 */
function bootstrap() {
    if (mazeList.length > 0 && scoreList.length > 0) {
        startServer(); // start the express server
    }
    else {
        log.warn(__filename, 'bootstrap()', util_1.format('Maze and Score lists must be populated.  mazeList Length=%d, scoreList Length=%d', mazeList.length, scoreList.length));
    }
}
/**
 * Find and return the game with the matching ID
 *
 * @param gameId
 */
function findGame(gameId) {
    games.forEach(game => {
        if (game.getId() == gameId) {
            return game;
        }
    });
    throw new Error('Game Not Found');
}
/**
 * Find and return the maze with the matching ID
 *
 * @param mazeId
 */
function findMaze(mazeId) {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].id == mazeId) {
            return mazes[n];
        }
    }
    throw new Error(util_1.format('Maze [%s] not found.', mazeId));
}
// initialize the server & cache refresh processes
updateMazesCache();
udpateScoresCache();
function startServer() {
    // open the service port
    httpServer = app.listen(consts.GAME_SVC_PORT, function () {
        log.info(__filename, 'startServer()', util_1.format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT));
        serviceStarted = true;
        // allow CORS for this application
        app.use(function (req, res, next) {
            log.trace(__filename, 'app.listen()', util_1.format('New request: %s', req.url));
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            // check for cache update needs
            if (Date.now() - lastMazeListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', util_1.format('mazeList cache expired - calling refresh.'));
                lastMazeListFill = Date.now();
                updateMazesCache();
            }
            if (Date.now() - lastScoreListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', util_1.format('scoreList cache expired - calling refresh.'));
                lastScoreListFill = Date.now();
                udpateScoresCache();
            }
            // move on to the next route
            next();
        });
        // send list of available games
        app.get('/games', function (req, res) {
            res.status(200).json(games);
        });
        app.get('/game/:gameId', function (req, res) {
            // find game in games array
            let gameId = req.params.gameId;
            let game;
            try {
                game = findGame(gameId);
                res.status(200).json(game);
            }
            catch (_a) {
                res.status(404).json({ "status": util_1.format('Game [%s] not found.', gameId) });
            }
        });
        app.get('/game/new/:mazeId/:teamId', function (req, res) {
            try {
                // create and return a new game against the given maze
                let maze = findMaze(req.params.mazeId);
                let game = new cc2018_ts_lib_1.Game(maze, team, new cc2018_ts_lib_1.Score());
                games.push(game);
                res.status(200).json(game);
            }
            catch (err) {
                res.status(404).json({ "status": util_1.format('Error creating game: %s', JSON.stringify(err)) });
            }
        });
        app.use('/*', router_1.default);
    });
}
/**
 * Watch for SIGINT (process interrupt signal) and trigger shutdown
 */
process.on('SIGINT', function onSigInt() {
    // all done, close the db connection
    log.info(__filename, 'onSigInt()', 'Got SIGINT - Exiting applicaton...');
    doShutdown();
});
/**
 * Watch for SIGTERM (process terminate signal) and trigger shutdown
 */
process.on('SIGTERM', function onSigTerm() {
    // all done, close the db connection
    log.info(__filename, 'onSigTerm()', 'Got SIGTERM - Exiting applicaton...');
    doShutdown();
});
/**
 * Gracefully shut down the service
 */
function doShutdown() {
    log.info(__filename, 'doShutDown()', 'Closing HTTP Server connections...');
    httpServer.close();
}
//# sourceMappingURL=server.js.map