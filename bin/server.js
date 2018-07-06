"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const path_1 = __importDefault(require("path"));
const consts = __importStar(require("./consts"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import classes
const cc2018_ts_lib_2 = require("cc2018-ts-lib"); // import classes
const util_1 = require("util");
const svc = __importStar(require("./request"));
const express_1 = __importDefault(require("express"));
// set module instance references
let httpServer; // will be set with app.listen
const enums = cc2018_ts_lib_1.Enums.getInstance();
const log = cc2018_ts_lib_1.Logger.getInstance();
const app = express_1.default();
// configure modules
log.setLogLevel(parseInt(process.env['LOG_LEVEL'] || '3')); // defaults to "INFO"
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
let lastTeamListFill = 0; // updated by Date.now() after cache request fulfillment
// Service End Points
const EP = {
    mazes: util_1.format('%s/%s', consts.MAZE_SVC_URL, 'get'),
    mazeById: util_1.format('%s/%s', consts.MAZE_SVC_URL, 'get/:mazeId'),
    scores: util_1.format('%s/%s', consts.SCORE_SVC_URL, 'get'),
    teams: util_1.format('%s/%s', consts.TEAM_SVC_URL, 'get')
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
        log.trace(__filename, 'loadMazeById()', util_1.format('Maze [%s] already loaded, skipping.', mazeId));
    }
    else {
        svc.doRequest(EP['mazeById'].replace(':mazeId', mazeId), function handleGetMaze(res, body) {
            let maze = JSON.parse(body); // this assignment is not totally necessary, but helps debug logging
            mazes.push(maze);
            log.trace(__filename, 'handleGetMaze()', util_1.format('Maze %s loaded.', maze.id));
        });
    }
}
/**
 * Quick scan of mazes array to determine if the maze is already cached
 * @param mazeId
 */
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
            mazeStub.url = util_1.format('%s/maze/%d:%d:%s', consts.GAME_SVC_EXT_URL, mazeStub.height, mazeStub.width, mazeStub.seed);
        });
        // attempt to start the service
        if (!serviceStarted)
            bootstrap();
    });
}
// Same as updateMazesCache, but with teams
function updateTeamsCache() {
    svc.doRequest(EP['teams'], function handleLoadScores(res, body) {
        teams = JSON.parse(body);
        // dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'handleLoadScores()', util_1.format('%d teams loaded into scoreList array.', scoreList.length));
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
    if (mazeList.length > 0 && scoreList.length > 0 && teams.length > 0) {
        log.debug(__filename, 'bootstrap()', util_1.format('Caches populated, starting server.  mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
        startServer(); // start the express server
    }
    else {
        log.warn(__filename, 'bootstrap()', util_1.format('Maze, Score, and Team lists must be populated.  mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
    }
}
/**
 * Find and return the game with the matching ID
 *
 * @param gameId
 */
function findGame(gameId) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            return games[n];
        }
    }
    log.debug(__filename, 'findGame()', 'Game not found: ' + gameId);
    throw new Error('Game Not Found: ' + gameId);
}
/**
 * Quickly find and return the game id for the first game
 * in progress for the given team
 *
 * @param teamId
 */
function findGameInProgress(teamId) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getTeam().getId() == teamId) {
            log.debug(__filename, 'findGameInProgress()', 'Game found: ' + games[n].getId());
            return games[n].getId();
        }
    }
    return '';
}
/**
 * Find and return the team with the matching ID
 *
 * @param teamId
 */
function findTeam(teamId) {
    for (let n = 0; n < teams.length; n++) {
        if (teams[n].id == teamId) {
            return teams[n];
        }
    }
    log.debug(__filename, 'findTeam()', 'Team not found: ' + teamId);
    throw new Error('Team Not Found: ' + teamId);
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
    log.warn(__filename, 'findMaze()', 'Maze not found: ' + mazeId);
    throw new Error('Maze not found: ' + mazeId);
}
// initialize the server & cache refresh processes
updateMazesCache();
udpateScoresCache();
updateTeamsCache();
function startServer() {
    // open the service port
    httpServer = app.listen(consts.GAME_SVC_PORT, function () {
        log.info(__filename, 'startServer()', util_1.format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT));
        serviceStarted = true;
        // allow CORS for this application
        app.use(function (req, res, next) {
            log.trace(__filename, 'app.listen()', util_1.format('New request: %s', req.url));
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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
            if (Date.now() - lastTeamListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', util_1.format('teams cache expired - calling refresh.'));
                lastTeamListFill = Date.now();
                updateTeamsCache();
            }
            // make all  querystring arguments upper case
            if (req.query !== undefined) {
                for (var key in req.query) {
                    if (key == 'dir') {
                        req.query[key] = req.query[key].toUpperCase();
                    }
                }
            }
            // move on to the next route
            next();
        });
        app.get('/favicon.ico', (req, res) => {
            res.status(200).sendFile(path_1.default.resolve('/views/favicon.ico'));
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
                res.status(404).json({ status: util_1.format('Game [%s] not found.', gameId) });
            }
        });
        /**
         * Sends JSON list of all current games with url to full /get/GameId link
         */
        app.get('/games', function (req, res) {
            log.debug(__filename, req.url, 'Returning list of active games.');
            if (games.length == 0) {
                res.status(200).json({ status: 'No active games found.' });
            }
            else {
                let data = new Array();
                for (let n = 0; n < games.length; n++) {
                    data.push({
                        id: games[n].getId(),
                        teamId: games[n].getTeam().getId(),
                        teamName: games[n].getTeam().getName(),
                        gameState: games[n].getState(),
                        moveCount: games[n].getScore().getMoveCount(),
                        url: util_1.format('http://%s:%d%s/%s', req.hostname, consts.GAME_SVC_PORT, req.url, games[n].getId())
                    });
                }
                res.status(200).json(data);
            }
        });
        /**
         * Attempts to create a new game using the given Team and Maze
         * -- If team is already in a game, redirects to /get/GameID
         * -- If team or maze not found, returns error.
         */
        app.get('/game/new/:mazeId/:teamId', function (req, res) {
            try {
                // create and return a new game against the given maze
                let teamId = req.params.teamId;
                let gameId = findGameInProgress(teamId);
                if (gameId != '') {
                    log.debug(__filename, req.url, util_1.format('Redirecting to /get/gameId - Team %d already in game %s.', teamId, gameId));
                    return res.redirect('/get/' + gameId);
                }
                let maze = findMaze(req.params.mazeId);
                let score = new cc2018_ts_lib_1.Score();
                let teamStub = findTeam(teamId);
                let team = new cc2018_ts_lib_1.Team(teamStub);
                if (team) {
                    let game = new cc2018_ts_lib_1.Game(maze, team, score);
                    games.push(game);
                    log.info(__filename, req.url, 'New game added to games list: ' + game.getId());
                    res.status(200).json(game);
                }
                else {
                    log.error(__filename, req.url, 'Unable to add new game. Invalid teamId: ' + teamId);
                    res.status(500).json({ status: util_1.format('Invalid teamId: %s', teamId) });
                }
                //let game: Game = new Game(maze, team, new Score());
            }
            catch (err) {
                log.error(__filename, req.url, 'Error creating game: ' + err.toString());
                res.status(404).json({ status: util_1.format('Error creating game: %s', err.toString()) });
            }
        });
        // move the team's AI in the given direction (if possible)
        app.get('/game/action/move/:gameId/:direction', function (req, res) {
            try {
                if (req.params.gameId === undefined || req.params.direction === undefined) {
                    return res.status(400).json({ status: 'Missing argument(s).  Format=/game/action/move/<GameID>/<Direction>' });
                }
                let gameId = req.params.gameId;
                let argDir = util_1.format('%s', req.params.direction).toUpperCase();
                let dir = parseInt(cc2018_ts_lib_2.DIRS[argDir]); // value will be NaN if not a valid direction name
                if (isNaN(dir)) {
                    throw new Error(util_1.format('Invalid Direction: %s.  Valid directions are NONE, NORTH, SOUTH, EAST, and WEST', req.params.direction));
                }
                let game = findGame(gameId); // will throw error if game not found - drops to catch block
                res.status(200).json({ status: util_1.format('Move %s completed.', argDir) });
            }
            catch (err) {
                log.error(__filename, req.url, 'Error executing move: ' + err.toString());
                return res.status(500).json({ status: err.toString() });
            }
        });
        /**
         * Performs an action (MOVE, LOOK, JUMP, WRITE, SAY)
         * Format: /game/action/<gameId>?act=[move|look|jump|write|say]&arg1=[direction|message]
         *
         * Returns the results of the action and an engram describing
         * new state.
         */
        app.get('/game/action/:gameId*', function (req, res) {
            try {
                // make sure we have the right arguments
                if (req.query.act === undefined || req.query.gameId === undefined) {
                    return res.status(400).json({
                        status: 'Missing querystring argument(s). Format=?act=[move|look|jump|write|say][&dir=<none|north|south|east|west>][&message=text]'
                    });
                }
                let gameId = req.params.gameId;
                let argAct = util_1.format('%s', req.query.act).toUpperCase();
                let argDir = util_1.format('%s', req.query.dir).toUpperCase();
                let dir = parseInt(cc2018_ts_lib_2.DIRS[argDir]); // value will be NaN if not a valid direction name
                let game = findGame(gameId); // will throw error if game not found - drops to catch block
                switch (argAct) {
                    case 'MOVE':
                        if (isNaN(dir))
                            return res.status(400).json({ status: 'Invalid direction.' });
                        if (game.isOpenDir(dir)) {
                            game.doMove(dir);
                            console.log("NOPE CAN't GO THAT WAY!");
                        }
                        else {
                            console.log("NOPE CAN't GO THAT WAY!");
                        }
                        break;
                    case 'LOOK':
                        if (isNaN(dir))
                            return res.status(400).json({ status: 'Invalid direction. Options: NONE|NORTH|SOUTH|EAST|WEST' });
                        break;
                    case 'JUMP':
                        if (isNaN(dir))
                            return res.status(400).json({ status: 'Invalid direction. Options: NONE|NORTH|SOUTH|EAST|WEST' });
                        break;
                    case 'WRITE':
                        break;
                    case 'SAY':
                        break;
                    default:
                        log.warn(__filename, req.url, 'Invalid Action: ' + argAct);
                        return res.status(400).json({
                            status: util_1.format('Invalid action: %s.  Expected act=[ MOVE | LOOK | JUMP | WRITE | SAY ]', argAct)
                        });
                }
            }
            catch (err) {
                log.error(__filename, req.url, 'Error executing action: ' + err.toString());
                return res.status(500).json({ status: err.toString() });
            }
            res.status(200).json({ status: 'ok' });
        });
        /** MAZE ROUTES **/
        app.get('/mazes', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of mazes.');
            res.status(200).json(mazeList);
        });
        app.get('/maze/:mazeId', (req, res) => {
            log.trace(__filename, req.url, 'Searching for MazeID ' + req.params.mazeId);
            try {
                let maze = findMaze(req.params.mazeId);
                res.status(200).json(maze);
            }
            catch (err) {
                res.status(404).json({ status: 'Maze Not Found: ' + req.params.mazeId });
            }
        });
        /** TEAM ROUTES **/
        app.get('/teams', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of teams.');
            res.status(200).json(teams);
        });
        app.get('/team', (req, res) => {
            log.trace(__filename, req.url, 'Searching for TeamID ' + req.params.teamId);
            try {
                let team = findTeam(req.params.teamId);
                res.status(200).json(team);
            }
            catch (err) {
                res.status(404).json({ status: 'Team Not Found: ' + req.params.mazeId });
            }
        });
        /** SCORE ROUTES **/
        app.get('/scores', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of scores.');
            res.status(200).json(scoreList);
        });
        // Bad Routes
        app.get('/*', function (req, res) {
            log.trace(__filename, req.url, 'Bad route - rendering index.');
            res.render('index', {
                contentType: 'text/html',
                responseCode: 404,
                host: req.headers.host
            });
        });
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