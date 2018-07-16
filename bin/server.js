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
let bodyParser = require('body-parser');
const path_1 = __importDefault(require("path"));
const consts = __importStar(require("./consts"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import class interfaces
const cc2018_ts_lib_2 = require("cc2018-ts-lib"); // import classes
const cc2018_ts_lib_3 = require("cc2018-ts-lib"); // import classes
const compression_1 = __importDefault(require("compression"));
const act = __importStar(require("./actions"));
const util_1 = require("util");
const request = __importStar(require("./request"));
const express_1 = __importDefault(require("express"));
const Enums_1 = require("../node_modules/cc2018-ts-lib/dist/Enums");
// set module instance references
let httpServer; // will be set with app.listen
const enums = cc2018_ts_lib_2.Enums.getInstance();
const log = cc2018_ts_lib_2.Logger.getInstance();
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
let lastMazeListFill = 0; // updated by Date.now() after cache request fulfillment
let lastScoreListFill = 0; // updated by Date.now() after cache request fulfillment
let lastTeamListFill = 0; // updated by Date.now() after cache request fulfillment
// start the bootstrap - keeps trying until all cache refresh functions return
let bootstrapTimer = setInterval(bootstrap, 3000);
// Service End Points
// TODO: I hate this ... should just use consts/env vars
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
        request.doGet(EP['mazeById'].replace(':mazeId', mazeId), function handleGetMaze(res, body) {
            let maze = new cc2018_ts_lib_2.Maze(JSON.parse(body)); // this assignment is not totally necessary, but helps debug logging
            mazes.push(maze);
            log.trace(__filename, 'handleGetMaze()', util_1.format('Maze %s loaded.', maze.getId()));
        });
    }
}
/**
 * Quick scan of mazes array to determine if the maze is already cached
 * @param mazeId
 */
function mazeLoaded(mazeId) {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].getId() == mazeId)
            return true;
    }
    return false;
}
// Pull the list of available mazes from the maze-service
// cache it locally. Refreshses as part of the incoming request
// process if consts.CACHE_DELAY is exceeded
function updateMazesCache() {
    request.doGet(EP['mazes'], function handleGetMazes(res, body) {
        lastMazeListFill = Date.now();
        let data = JSON.parse(body);
        if (data.result !== undefined) {
            log.warn(__filename, 'handleLoadMazes()', 'No mazes were found.');
            mazeList = new Array();
        }
        else {
            mazeList = data;
            log.trace(__filename, 'handleLoadScores()', util_1.format('%d maze stubs loaded into mazeList array.', mazeList.length));
        }
        // populate the mazes list
        mazeList.forEach(mazeStub => {
            loadMazeById(mazeStub.id);
            mazeStub.url = util_1.format('%s/maze/%d:%d:%s', consts.GAME_SVC_EXT_URL, mazeStub.height, mazeStub.width, mazeStub.seed);
        });
    });
}
// Same as updateMazesCache, but with teams
function updateTeamsCache() {
    request.doGet(EP['teams'], function handleLoadScores(res, body) {
        lastTeamListFill = Date.now();
        let data = JSON.parse(body);
        if (data.status !== undefined) {
            teams = new Array();
            log.warn(__filename, 'handleLoadTeams()', 'No teams were found.');
        }
        else {
            teams = data;
            log.trace(__filename, 'handleLoadTeams()', util_1.format('%d teams loaded into teams array.', teams.length));
        }
    });
}
// Same as updateMazesCache, but with scores
function udpateScoresCache() {
    request.doGet(EP['scores'], function handleLoadScores(res, body) {
        lastScoreListFill = Date.now();
        let data = JSON.parse(body);
        if (data.status !== undefined) {
            scoreList = new Array();
            log.warn(__filename, 'handleLoadScores()', 'No scores were found.');
        }
        else {
            scoreList = data;
            log.trace(__filename, 'handleLoadScores()', util_1.format('%d scores loaded into scoreList array.', scoreList.length));
        }
    });
}
/**
 * Kicks off the cache refresh interval once base caches are filled
 */
function bootstrap() {
    log.debug(__filename, 'bootstrap()', util_1.format('Attempting to fill cache arrays before server start...'));
    if (lastMazeListFill == 0)
        updateMazesCache();
    if (lastTeamListFill == 0)
        updateTeamsCache();
    if (lastScoreListFill == 0)
        udpateScoresCache();
    if (lastMazeListFill > 0 && lastScoreListFill > 0 && lastTeamListFill > 0) {
        log.debug(__filename, 'bootstrap()', util_1.format('Caches populated, starting server. mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
        clearInterval(bootstrapTimer); // kill the timer
        startServer(); // start the express server
    }
    else {
        // initialize the server & cache refresh processes
        log.warn(__filename, 'bootstrap()', util_1.format('Maze, Score, and Team lists must be populated. mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
    }
}
/**
 * Removes games from the top of the array to make room for new games at the bottom
 */
function gcGames() {
    let gcTrigger = Math.floor(consts.MAX_GAMES_IN_MEMORY * 0.9); // if array is 90% full, trigger collection
    if (games.length >= gcTrigger) {
        log.debug(__filename, 'gcGames()', util_1.format('Active games garbage collection triggered. GC_TriggerSize: %s, Current Size: %s, Max Size: %s', gcTrigger, games.length, consts.MAX_GAMES_IN_MEMORY));
        let cleanGames = new Array();
        // remove all of the aborted games
        games.forEach(game => {
            if (game.getState() != cc2018_ts_lib_3.GAME_STATES.ABORTED) {
                cleanGames.push(game);
                log.trace(__filename, 'gcGames()', util_1.format('Active game preserved in games array: %s', game.getId()));
            }
            else {
                log.trace(__filename, 'gcGames()', util_1.format('Abandoned game removed from games array: %s', game.getId()));
            }
        });
        // reassign the games array
        log.debug(__filename, 'gcGames()', util_1.format('Collection complete. GC_TriggerSize: %s, Original Size: %s, New Size: %s', gcTrigger, games.length, cleanGames.length));
        games = cleanGames;
    }
    else {
        log.debug(__filename, 'gcGames()', util_1.format('Games array garbage collection not necessary. GC_TriggerSize: %s, Current Size: %s, Max Size: %s', gcTrigger, games.length, consts.MAX_GAMES_IN_MEMORY));
    }
}
/**
 * Find and return the game with the matching ID
 *
 * @param gameId
 */
function getGame(gameId) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            return games[n];
        }
    }
    log.debug(__filename, 'getGame()', 'GAME NOT FOUND');
    throw new Error('GAME NOT FOUND');
}
/**
 * Returns true if the gameId is in the games array
 *
 * @param gameId
 */
function gameExists(gameId) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            return true;
        }
    }
    return false;
}
/**
 * Find and return the game with the matching ID
 *
 * @param gameId
 */
function isGameInProgress(gameId) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            return true;
        }
    }
    return false;
}
function abortGame(gameId) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            games[n].setState(cc2018_ts_lib_3.GAME_STATES.ABORTED);
            games[n].getScore().setGameResult(cc2018_ts_lib_3.GAME_RESULTS.ABANDONED);
            // allow the game ID to be reused at some point
            games[n].forceSetId('_aborted_' + games[n].getId());
        }
    }
}
/**
 * Quickly find and return the game id for the first game
 * in progress for the given team
 *
 * @param teamId
 */
function getActiveGameIdByTeam(teamId) {
    for (let n = 0; n < games.length; n++) {
        let g = games[n];
        if (g.getTeam().getId() == teamId) {
            let gs = g.getState();
            if (gs < cc2018_ts_lib_3.GAME_STATES.FINISHED) {
                log.debug(__filename, 'getActiveGameIdByTeam()', 'Game found: ' + games[n].getId());
                return games[n].getId();
            }
        }
    }
    return '';
}
/**
 * Find and return the team with the matching ID
 *
 * @param teamId
 */
function getTeamData(teamId) {
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
        if (mazes[n].getId() == mazeId) {
            return mazes[n];
        }
    }
    log.warn(__filename, 'findMaze()', 'Maze not found: ' + mazeId);
    throw new Error('Maze not found: ' + mazeId);
}
function newTeamGame(mazeId, teamId, forcedGameId) {
    let fnName = util_1.format('newTeamGame(%s, %s, %s)', mazeId, teamId, forcedGameId);
    let gameUrl = consts.GAME_SVC_EXT_URL + '/game/';
    let maze;
    let team;
    // get the maze
    try {
        maze = findMaze(mazeId); // throws error if not found
    }
    catch (err) {
        log.warn(__filename, fnName, 'Maze not found in Maze Cache: ' + mazeId);
        return { status: 'Unable to create game. Maze not found: ' + mazeId };
    }
    // get the team
    try {
        team = new cc2018_ts_lib_2.Team(getTeamData(teamId)); // throws error if not found
    }
    catch (err) {
        log.warn(__filename, fnName, 'Team not found in Team Cache: ' + teamId);
        return { status: 'Unable to create game. Team not found: ' + teamId };
    }
    // create player and score objects
    let player = new cc2018_ts_lib_1.Player(maze.getStartCell(), Enums_1.PLAYER_STATES.STANDING);
    let score = new cc2018_ts_lib_2.Score();
    // configure game
    let game = new cc2018_ts_lib_2.Game(maze, team, player, score);
    // set game state to new
    game.setState(cc2018_ts_lib_3.GAME_STATES.NEW);
    // set the score key elements
    game.getScore().setMazeId(game.getMaze().getId());
    game.getScore().setTeamId(game.getTeam().getId());
    game.getScore().setGameId(game.getId());
    // add a visit to the start cell
    game.getMaze()
        .getCell(game.getPlayer().Location)
        .addVisit(0);
    // handle forced game id override
    if (forcedGameId != '') {
        log.warn(__filename, fnName, 'New Game(): ID generation overridden with: ' + forcedGameId);
        game.forceSetId(forcedGameId);
        game.getScore().setGameId(forcedGameId); // update score key
    }
    // make some room in the games array if it's full
    gcGames();
    // store the game
    if (games.length > consts.MAX_GAMES_IN_MEMORY) {
        log.warn(__filename, fnName, util_1.format('Active Games Array is full with %s active games. Try again later.', games.length));
        return { status: util_1.format('Active Games Array is full with %s active games. Try again later.', games.length) };
    }
    games.push(game);
    // log and return status
    log.info(__filename, fnName, 'New game added to games list: ' + game.getId());
    return { status: 'Game created.', url: gameUrl + game.getId() };
}
function startServer() {
    // open the service port
    httpServer = app.listen(consts.GAME_SVC_PORT, function () {
        log.info(__filename, 'startServer()', util_1.format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT));
        app.use(compression_1.default());
        app.use(bodyParser.json());
        // allow CORS for this application
        app.use(function (req, res, next) {
            log.trace(__filename, 'app.listen()', util_1.format('New request: %s', req.url));
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            // check for cache update needs
            if (Date.now() - lastMazeListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', util_1.format('mazeList cache expired - calling refresh.'));
                updateMazesCache();
            }
            if (Date.now() - lastScoreListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', util_1.format('scoreList cache expired - calling refresh.'));
                udpateScoresCache();
            }
            if (Date.now() - lastTeamListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', util_1.format('teams cache expired - calling refresh.'));
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
            res.sendFile(path_1.default.resolve('./views/favicon.ico'));
        });
        app.get('/game/:gameId', function (req, res) {
            // find game in games array
            let gameId = req.params.gameId;
            let game;
            if (!gameExists(gameId)) {
                return res.status(404).json({ status: util_1.format('Game [%s] not found.', gameId) });
            }
            try {
                game = getGame(gameId);
                res.json(game);
            }
            catch (err) {
                res.status(404).json({ status: util_1.format('Game [%s] not found.', gameId) });
            }
        });
        /**
         * Sends JSON list of all current, active games with url to full /get/GameId link
         */
        app.get('/games', function (req, res) {
            log.trace(__filename, req.url, 'Returning list of active games (stub data).');
            let data = new Array();
            // only return active games
            if (games.length > 0) {
                for (let n = 0; n < games.length; n++) {
                    if (games[n].getState() < cc2018_ts_lib_3.GAME_STATES.FINISHED)
                        data.push(games[n].getStub(consts.GAME_SVC_EXT_URL));
                }
                if (data.length > 0)
                    return res.json(data);
            }
            res.json({ status: 'No games found.' });
        });
        /**
         * Sends JSON list of ALL game stubs full /get/GameId link
         */
        app.get('/games/all', function (req, res) {
            log.debug(__filename, req.url, 'Returning list of ALL games (stub data).');
            let data = new Array();
            // only return active games
            if (games.length > 0) {
                for (let n = 0; n < games.length; n++) {
                    data.push(games[n].getStub(consts.GAME_SVC_EXT_URL));
                }
                if (data.length > 0)
                    return res.json(data);
            }
            res.json({ status: 'No games found.' });
        });
        /**
         * Renders an HTML list of all games, all states
         */
        app.get('/games/list', function (req, res) {
            log.debug(__filename, req.url, 'Rendering list of active games.');
            res.render('list', {
                games: games,
                extUrl: consts.GAME_SVC_EXT_URL
            });
        });
        // old end point
        app.get(['/game/abort/:gameId/', '/game/abandon/:gameId/'], function (req, res) {
            res.status(401).json({ status: 'Password is required. Try again using /game/abort/<gameId>/<password>' });
        });
        // cancel a game in progress
        app.get(['/game/abort/:gameId/:password', '/game/abandon/:gameId/:password'], function (req, res) {
            let gameId = req.params.gameId;
            if (req.params.password != consts.DELETE_PASSWORD)
                return res.status(401).json({ status: 'Missing or incorrect password' });
            if (!isGameInProgress(gameId)) {
                res.json({ status: 'Game not current running:' + gameId });
            }
            else {
                abortGame(gameId);
                res.json({ status: 'Game aborted:' + gameId });
            }
        });
        /**
         * Attempts to create a new game using the given Team and Maze
         * -- If team is already in a game, 400 + status:already running
         * -- If team or maze not found, returns error.
         * -- passing /gameId attempts to force the game ID value - useful for testing
         */
        app.get(['/game/new/:mazeId/:teamId', '/game/new/:mazeId/:teamId/:forcedGameId'], function (req, res) {
            try {
                // create and return a new game against the given maze
                let teamId = req.params.teamId;
                let mazeId = req.params.mazeId;
                let gameId = getActiveGameIdByTeam(teamId);
                let forcedGameId = req.params.forcedGameId !== undefined ? req.params.forcedGameId : '';
                let gameUrl = consts.GAME_SVC_EXT_URL + '/game/';
                // make the team isn't already playing
                if (gameId != '') {
                    log.debug(__filename, req.url, util_1.format('Team %s already in game %s.', teamId, gameId));
                    return res.status(400).json({ status: util_1.format('Team %s already in game %s.', teamId, gameId), url: gameUrl + gameId });
                }
                // check for a forced game id
                if (forcedGameId != '' && isGameInProgress(forcedGameId)) {
                    log.debug(__filename, req.url, util_1.format('Game %s already exists - force a different gameId.', forcedGameId));
                    return res.status(400).json({ status: util_1.format('Game %s already exists - force a different gameId.', forcedGameId), url: gameUrl + forcedGameId });
                }
                // create new Team Game
                res.json(newTeamGame(mazeId, teamId, forcedGameId));
            }
            catch (err) {
                log.error(__filename, req.url, 'Error creating game: ' + err.toString());
                res.status(500).json({ status: util_1.format('Error creating game: %s', err.toString()) });
            }
        });
        app.post('/game/action', function (req, res) {
            let start = Date.now();
            let gameId = '';
            log.debug(__filename, req.url, 'Action posted from: ' + req.rawHeaders.join(' :: '));
            log.debug(__filename, req.url, 'Request Body: ' + JSON.stringify(req.body));
            // {
            //     "gameId":"c440d650-733e-4db9-9814-59061b737df7",
            //     "action":"look",
            //     "direction":"north",
            //     "message":"test",
            //     "cohesionScores":[1,0.5,1,0.5,null,null]
            //  }
            let tmp = { gameId: 'c440d650-733e-4db9-9814-59061b737df7', action: 'look', direction: 'north', message: 'test', cohesionScores: [1, 0.5, 1, 0.5, null, null] };
            //curl -i -X POST http://localhost:8082/game/action -H 'Content-Type: application/json' -d '{"gameId":"c440d650-733e-4db9-9814-59061b737df7","action":"look","direction":"north","message":"test","cohesionScores":[1,0.5,1,0.5,null,null]}'
            try {
                // get and parse incoming data
                let data = req.body;
                gameId = data.gameId;
                let argAct = data.action;
                let argDir = util_1.format('%s', data.direction + '').toUpperCase();
                let message = data.message;
                let botCsn = data.cohesionScores;
                // initialize required elements
                let game = getGame(gameId);
                let direction = parseInt(cc2018_ts_lib_3.DIRS[argDir]);
                argAct = argAct.toUpperCase();
                let action = {
                    action: argAct,
                    mazeId: game.getMaze().getId(),
                    direction: cc2018_ts_lib_3.DIRS[direction],
                    location: game.getPlayer().Location,
                    score: game.getScore().toJSON(),
                    playerState: game.getPlayer().State,
                    botCohesion: botCsn,
                    engram: { sight: '', sound: '', smell: '', touch: '', taste: '' },
                    outcome: new Array(),
                    trophies: new Array()
                };
                // now remove turn-based states that might have been set in the last turn
                if (!!(game.getPlayer().State & Enums_1.PLAYER_STATES.STUNNED)) {
                    act.doStunned(game, direction, action);
                }
                else {
                    // perform the appropriate action
                    switch (argAct) {
                        case 'MOVE': {
                            act.doMove(game, direction, action);
                            break;
                        }
                        case 'JUMP': {
                            act.doJump(game, direction, action);
                            break;
                        }
                        case 'WRITE': {
                            act.doWrite(game, action, message);
                            break;
                        }
                        case 'LOOK': {
                            // looking into another room is free, but looking in dir.none or at a wall costs a move
                            act.doLook(game, direction, action);
                            break;
                        }
                        case 'STAND': {
                            // looking into another room is free, but looking in dir.none or at a wall costs a move
                            act.doStand(game, direction, action);
                            break;
                        }
                        default:
                            return res.status(400).json({ status: 'Invalid action: ' + argAct });
                    }
                }
                // refresh some duplicated action values
                action.score = game.getScore().toJSON();
                action.location = game.getPlayer().Location;
                // store the action on the game action stack and return it to the requester as json
                game.addAction(action);
                // check for move limit
                let maxMoveCount = game.getMaze().getWidth() * game.getMaze().getHeight() * 3;
                if (game.getScore().getMoveCount() >= maxMoveCount) {
                    // whip up a new action for end of game - out of moves
                    let oom = {
                        action: '',
                        mazeId: game.getMaze().getId(),
                        direction: 'N/A',
                        engram: { sight: '', sound: '', smell: '', touch: '', taste: '' },
                        location: game.getPlayer().Location,
                        score: game.getScore().toJSON(),
                        playerState: game.getPlayer().State,
                        outcome: new Array(),
                        botCohesion: new Array(),
                        trophies: new Array()
                    };
                    act.doAddTrophy(game, oom, Enums_1.TROPHY_IDS.OUT_OF_MOVES);
                    oom.outcome.push('Your poor little mouse body has fallen over from fatigue after running around the maze long enough to have visited every room three times over.');
                    oom.outcome.push('GAME OVER - OUT OF MOVES');
                    // refresh some duplicated action values
                    oom.score = game.getScore().toJSON();
                    game.getScore().setGameResult(cc2018_ts_lib_3.GAME_RESULTS.OUT_OF_MOVES);
                    game.setState(cc2018_ts_lib_3.GAME_STATES.FINISHED);
                    game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                    game.addAction(oom);
                }
                // handle game end states - don't track scores or trophies on abort
                if (game.getState() > cc2018_ts_lib_3.GAME_STATES.IN_PROGRESS && game.getState() != cc2018_ts_lib_3.GAME_STATES.ABORTED) {
                    log.debug(__filename, req.url, util_1.format('Game [%s] with result [%s]', cc2018_ts_lib_3.GAME_STATES[game.getState()], cc2018_ts_lib_3.GAME_RESULTS[game.getScore().getGameResult()]));
                    // save the score
                    request.doPost(consts.SCORE_SVC_URL + '/score', game.getScore(), function handlePostScore(res, body) {
                        log.debug(__filename, req.url, util_1.format('New score posted to DB -> Scores collection.'));
                    });
                    // update the team to save trophies
                    request.doPut(consts.TEAM_SVC_URL + '/team', game.getTeam(), function handlePutTeam(res, body) {
                        log.debug(__filename, req.url, util_1.format('Team updates put to DB -> Teams collection.'));
                    });
                }
                // log action response
                log.debug(__filename, req.url, util_1.format('ACTION REQUEST COMPLETED: %s completed in %sms. Sending response.', argAct, Date.now() - start));
                res.json(action);
            }
            catch (err) {
                if (err.message == 'GAME NOT FOUND') {
                    log.error(__filename, req.url, util_1.format('Game not found: %s', gameId));
                    res.status(500).json({ status: 'GAME NOT FOUND: ' + gameId });
                }
                else {
                    log.error(__filename, req.url, util_1.format('Unable to handle posted action.  Data: %s, Error: %s ', JSON.stringify(req.body), err.stack));
                    res.status(500).json({ status: 'Unable to handle posted action.', data: req.body, error: err });
                }
            }
        });
        /**
         * Performs an action (MOVE, LOOK, JUMP, MARK)
         * Format: /game/action/<gameId>?act=[move|look|jump|write|stand]&[dir|msg]=[direction|message]
         *
         * Returns the results of the action and an engram describing
         * new state.
         */
        app.get(['/game/action/:gameId', '/game/action/:gameId/:botId'], function (req, res) {
            log.debug(__filename, req.url, 'ACTION REQUEST RECIEVED');
            let start = Date.now();
            try {
                // make sure we have the right arguments
                if (req.query.act === undefined || req.params.gameId === undefined || req.params.gameId === 'undefined') {
                    log.warn(__filename, req.url, 'gameId is undefined.');
                    return res.status(400).json({
                        status: 'Missing querystring argument(s). Format=?act=[move|look|jump|write] [&dir=<none|north|south|east|west>] [&message=text]'
                    });
                }
                // format the action and make sure it's valid
                let argAct = util_1.format('%s', req.query.act).toUpperCase();
                if (argAct != 'MOVE' && argAct != 'LOOK' && argAct != 'JUMP' && argAct != 'WRITE' && argAct != 'STAND') {
                    log.warn(__filename, req.url, 'Invalid Action: ' + argAct);
                    return res.status(400).json({
                        status: util_1.format('Invalid action: %s. Expected ?act=[ MOVE | LOOK | JUMP | STAND | WRITE ]', argAct)
                    });
                }
                // format the direction and make sure it's valid
                let argDir = util_1.format('%s', req.query.dir).toUpperCase();
                let dir = parseInt(cc2018_ts_lib_3.DIRS[argDir]); // value will be NaN if not a valid direction name
                if (req.query.dir !== undefined && isNaN(dir)) {
                    return res.status(400).json({ status: 'Invalid direction. Options: NONE|NORTH|SOUTH|EAST|WEST' });
                }
                // if the gameId is invalid or doesn't exist, getGame() throws an error and we'll fall down to catch
                let gameId = req.params.gameId;
                let game = getGame(gameId);
                // so far so good, let's create the action structure
                let action = {
                    action: argAct,
                    mazeId: game.getMaze().getId(),
                    direction: isNaN(dir) ? 'N/A' : cc2018_ts_lib_3.DIRS[dir],
                    engram: { sight: '', sound: '', smell: '', touch: '', taste: '' },
                    location: game.getPlayer().Location,
                    score: game.getScore().toJSON(),
                    playerState: game.getPlayer().State,
                    outcome: new Array(),
                    botCohesion: new Array(),
                    trophies: new Array()
                };
                // now remove turn-based states that might have been set in the last turn
                if (!!(game.getPlayer().State & Enums_1.PLAYER_STATES.STUNNED)) {
                    act.doStunned(game, dir, action);
                }
                else {
                    // perform the appropriate action
                    switch (argAct) {
                        case 'MOVE': {
                            act.doMove(game, dir, action);
                            break;
                        }
                        case 'JUMP': {
                            act.doJump(game, dir, action);
                            break;
                        }
                        case 'WRITE': {
                            let message = '';
                            if (req.query.message === undefined) {
                                log.warn(__filename, req.url, 'Message argument not supplied for action WRITE, defaulting to "X"');
                            }
                            else {
                                message = req.query.message + '';
                            }
                            // get the message and clean it up
                            message = message.trim();
                            // write it
                            act.doWrite(game, action, message);
                            break;
                        }
                        case 'LOOK': {
                            // looking into another room is free, but looking in dir.none or at a wall costs a move
                            act.doLook(game, dir, action);
                            break;
                        }
                        case 'STAND': {
                            // looking into another room is free, but looking in dir.none or at a wall costs a move
                            act.doStand(game, dir, action);
                            break;
                        }
                    }
                }
                // refresh some duplicated action values
                action.score = game.getScore().toJSON();
                action.location = game.getPlayer().Location;
                // store the action on the game action stack and return it to the requester as json
                game.addAction(action);
                // check for move limit
                let maxMoveCount = game.getMaze().getWidth() * game.getMaze().getHeight() * 3;
                if (game.getScore().getMoveCount() >= maxMoveCount) {
                    // whip up a new action for end of game - out of moves
                    let oom = {
                        action: '',
                        mazeId: game.getMaze().getId(),
                        direction: 'N/A',
                        engram: { sight: '', sound: '', smell: '', touch: '', taste: '' },
                        location: game.getPlayer().Location,
                        score: game.getScore().toJSON(),
                        playerState: game.getPlayer().State,
                        outcome: new Array(),
                        botCohesion: new Array(),
                        trophies: new Array()
                    };
                    act.doAddTrophy(game, oom, Enums_1.TROPHY_IDS.OUT_OF_MOVES);
                    oom.outcome.push('Your poor little mouse body has fallen over from fatigue after running around the maze long enough to have visited every room three times over.');
                    oom.outcome.push('GAME OVER - OUT OF MOVES');
                    // refresh some duplicated action values
                    oom.score = game.getScore().toJSON();
                    game.getScore().setGameResult(cc2018_ts_lib_3.GAME_RESULTS.OUT_OF_MOVES);
                    game.setState(cc2018_ts_lib_3.GAME_STATES.FINISHED);
                    game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                    game.addAction(oom);
                }
                // handle game end states - don't track scores or trophies on abort
                if (game.getState() > cc2018_ts_lib_3.GAME_STATES.IN_PROGRESS && game.getState() != cc2018_ts_lib_3.GAME_STATES.ABORTED) {
                    log.debug(__filename, req.url, util_1.format('Game [%s] with result [%s]', cc2018_ts_lib_3.GAME_STATES[game.getState()], cc2018_ts_lib_3.GAME_RESULTS[game.getScore().getGameResult()]));
                    // save the score
                    request.doPost(consts.SCORE_SVC_URL + '/score', game.getScore(), function handlePostScore(res, body) {
                        log.debug(__filename, req.url, util_1.format('New score posted to DB -> Scores collection.'));
                    });
                    // update the team to save trophies
                    request.doPut(consts.TEAM_SVC_URL + '/team', game.getTeam(), function handlePutTeam(res, body) {
                        log.debug(__filename, req.url, util_1.format('Team updates put to DB -> Teams collection.'));
                    });
                }
                // log action response
                log.debug(__filename, req.url, util_1.format('ACTION REQUEST COMPLETED: %s completed in %sms. Sending response.', argAct, Date.now() - start));
                res.json(action);
            }
            catch (err) {
                log.error(__filename, req.url, 'ACTION REQUEST ERROR: ' + err.stack);
                res.status(500).json({ status: err.toString() });
            }
        });
        /** MAZE ROUTES **/
        app.get('/mazes', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of mazes.');
            res.json(mazeList);
        });
        app.get('/maze/:mazeId', (req, res) => {
            log.trace(__filename, req.url, 'Searching for MazeID ' + req.params.mazeId);
            try {
                let maze = findMaze(req.params.mazeId);
                res.json(maze);
            }
            catch (err) {
                res.status(404).json({ status: 'Maze Not Found: ' + req.params.mazeId });
            }
        });
        /** ACTION STACK ROUTES */
        /**
         * Returns game actions:
         * ?start=0
         */
        app.get('/actions/get/:gameId', (req, res) => {
            // find game in games array
            let gameId = req.params.gameId;
            let game;
            let start = 0;
            let count = 0;
            if (req.query.start !== undefined)
                start = parseInt(req.query.start + '');
            if (req.query.count !== undefined)
                count = parseInt(req.query.count + '');
            if (!gameExists(gameId)) {
                return res.status(404).json({ status: util_1.format('Game [%s] not found.', gameId) });
            }
            try {
                game = getGame(gameId);
                let actCount = game.getActions().length;
                if (actCount == 0)
                    return res.json({ status: util_1.format('Game [%s] has no actions.', gameId) });
                if (actCount < start)
                    return res.json({ status: util_1.format('There are only %d actions in the list.', actCount) });
                if (start > 0) {
                    if (count > 0) {
                        return res.json(game.getActionsRange(start, count));
                    }
                    else {
                        return res.json(game.getActionsSince(start));
                    }
                }
                else {
                    return res.json(game.getActions());
                }
            }
            catch (err) {
                log.error(__filename, req.url, 'Error getting action: ' + err.stack);
                res.status(404).json({ status: util_1.format('Error getting actions from game [%s]. Bad query? Example: /actions/get/<GAMEID>?start=0&count=50') });
            }
        });
        /** TEAM ROUTES **/
        app.get('/teams', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of teams.');
            res.json(teams);
        });
        app.get('/team', (req, res) => {
            log.trace(__filename, req.url, 'Searching for TeamID ' + req.params.teamId);
            try {
                let team = getTeamData(req.params.teamId);
                res.json(team);
            }
            catch (err) {
                res.status(404).json({ status: 'Team Not Found: ' + req.params.mazeId });
            }
        });
        /** SCORE ROUTES **/
        app.get('/scores', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of scores.');
            res.json(scoreList);
        });
        // HOME PAGE
        app.get(['/', '/index'], function (req, res) {
            res.render('index', { extUrl: consts.GAME_SVC_EXT_URL });
        });
        // Bad Routes
        app.get('/*', function (req, res) {
            log.trace(__filename, req.url, 'Bad route - returning 404.');
            res.status(404).json({ status: 'Page not found.' });
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