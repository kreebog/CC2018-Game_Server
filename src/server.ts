require('dotenv').config();
import path from 'path';
import * as consts from './consts';
import { IMazeStub, IMaze, ICell, IScore, ITeam, IEngram, Pos, Player } from 'cc2018-ts-lib'; // import class interfaces
import { Logger, Team, Bot, Game, IGameStub, Maze, Cell, Score, Enums } from 'cc2018-ts-lib'; // import classes
import { DIRS, GAME_RESULTS, GAME_STATES, IAction, TAGS } from 'cc2018-ts-lib'; // import classes
import compression from 'compression';
import * as act from './actions';
import { format } from 'util';
import { Server } from 'http';
import * as request from './request';
import express from 'express';
import { PLAYER_STATES } from '../node_modules/cc2018-ts-lib/dist/Enums';

// set module instance references
let httpServer: Server; // will be set with app.listen
const enums = Enums.getInstance();
const log = Logger.getInstance();
const app = express();

// configure modules
log.setLogLevel(parseInt(process.env['LOG_LEVEL'] || '3')); // defaults to "INFO"
app.set('views', 'views'); // using pug html rendering engine
app.set('view engine', 'pug'); // using pug html rendering engine

// initialize cache arrays
let mazes: Array<Maze> = new Array<Maze>(); // full mazes - added to when requested (TODO: Possible?)
let mazeList: Array<IMazeStub> = new Array<IMazeStub>(); // list of available mazes
let scoreList: Array<IScore> = new Array<IScore>(); // list of available scores

// initialize team and game tracking arrays
let teams: Array<ITeam> = new Array<ITeam>();
let games: Array<Game> = new Array<Game>();

// activity tracking vars
let lastMazeListFill: number = 0; // updated by Date.now() after cache request fulfillment
let lastScoreListFill: number = 0; // updated by Date.now() after cache request fulfillment
let lastTeamListFill: number = 0; // updated by Date.now() after cache request fulfillment

// start the bootstrap - keeps trying until all cache refresh functions return
let bootstrapTimer = setInterval(bootstrap, 3000);

// Service End Points
// TODO: I hate this ... should just use consts/env vars
const EP = {
    mazes: format('%s/%s', consts.MAZE_SVC_URL, 'get'),
    mazeById: format('%s/%s', consts.MAZE_SVC_URL, 'get/:mazeId'),
    scores: format('%s/%s', consts.SCORE_SVC_URL, 'get'),
    teams: format('%s/%s', consts.TEAM_SVC_URL, 'get')
};

/**
 * Useful debug tool - dumps key/val array to debug/trace logs
 *
 * @param list
 * @param key
 */
function dumpArray(list: Array<any>, key: string) {
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
    if (mazeLoaded(mazeId)) {
        log.trace(__filename, 'loadMazeById()', format('Maze [%s] already loaded, skipping.', mazeId));
    } else {
        request.doGet(EP['mazeById'].replace(':mazeId', mazeId), function handleGetMaze(res: any, body: any) {
            let maze: Maze = new Maze(JSON.parse(body)); // this assignment is not totally necessary, but helps debug logging
            mazes.push(maze);
            log.trace(__filename, 'handleGetMaze()', format('Maze %s loaded.', maze.getId()));
        });
    }
}

/**
 * Quick scan of mazes array to determine if the maze is already cached
 * @param mazeId
 */
function mazeLoaded(mazeId: string): boolean {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].getId() == mazeId) return true;
    }
    return false;
}

// Pull the list of available mazes from the maze-service
// cache it locally.  Refreshses as part of the incoming request
// process if consts.CACHE_DELAY is exceeded
function updateMazesCache() {
    request.doGet(EP['mazes'], function handleGetMazes(res: Response, body: any) {
        lastMazeListFill = Date.now();
        let data = JSON.parse(body);
        if (data.result !== undefined) {
            log.debug(__filename, 'handleLoadMazes()', 'No mazes were found.');
            mazeList = new Array<IMazeStub>();
        } else {
            mazeList = data;
            log.debug(__filename, 'handleLoadScores()', format('%d maze stubs loaded into mazeList array.', mazeList.length));
        }

        // populate the mazes list
        mazeList.forEach(mazeStub => {
            loadMazeById(mazeStub.id);
            mazeStub.url = format('%s/maze/%d:%d:%s', consts.GAME_SVC_EXT_URL, mazeStub.height, mazeStub.width, mazeStub.seed);
        });
    });
}

// Same as updateMazesCache, but with teams
function updateTeamsCache() {
    request.doGet(EP['teams'], function handleLoadScores(res: Response, body: any) {
        lastTeamListFill = Date.now();
        let data = JSON.parse(body);
        if (data.status !== undefined) {
            teams = new Array<ITeam>();
            log.debug(__filename, 'handleLoadTeams()', 'No teams were found.');
        } else {
            teams = data;
            log.debug(__filename, 'handleLoadTeams()', format('%d teams loaded into teams array.', teams.length));
        }
    });
}

// Same as updateMazesCache, but with scores
function udpateScoresCache() {
    request.doGet(EP['scores'], function handleLoadScores(res: Response, body: any) {
        lastScoreListFill = Date.now();
        let data = JSON.parse(body);
        if (data.status !== undefined) {
            scoreList = new Array<IScore>();
            log.debug(__filename, 'handleLoadScores()', 'No scores were found.');
        } else {
            scoreList = data;
            log.debug(__filename, 'handleLoadScores()', format('%d scores loaded into scoreList array.', scoreList.length));
        }
    });
}

/**
 * Kicks off the cache refresh interval once base caches are filled
 */
function bootstrap() {
    log.debug(__filename, 'bootstrap()', format('Attempting to fill cache arrays before server start...'));
    if (lastMazeListFill == 0) updateMazesCache();
    if (lastTeamListFill == 0) updateTeamsCache();
    if (lastScoreListFill == 0) udpateScoresCache();

    if (lastMazeListFill > 0 && lastScoreListFill > 0 && lastTeamListFill > 0) {
        log.debug(__filename, 'bootstrap()', format('Caches populated, starting server.  mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
        clearInterval(bootstrapTimer); // kill the timer
        startServer(); // start the express server
    } else {
        // initialize the server & cache refresh processes
        log.warn(__filename, 'bootstrap()', format('Maze, Score, and Team lists must be populated.  mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
    }
}

/**
 * Removes games from the top of the array to make room for new games at the bottom
 */
function gcGames() {
    while (games.length >= consts.MAX_GAMES_IN_MEMORY) {
        log.warn(__filename, 'gcGames()', format('games array size limit (%s) reached, removing oldest entry...', consts.MAX_GAMES_IN_MEMORY));
        games.shift();
    }
}

/**
 * Find and return the game with the matching ID
 *
 * @param gameId
 */
function getGame(gameId: string) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            return games[n];
        }
    }

    log.debug(__filename, 'getGame()', 'Game not found: ' + gameId);
    throw new Error('Game Not Found: ' + gameId);
}

/**
 * Returns true if the gameId is in the games array
 *
 * @param gameId
 */
function gameExists(gameId: string): boolean {
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
function isGameInProgress(gameId: string): boolean {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            return true;
        }
    }
    return false;
}

function abortGame(gameId: string) {
    for (let n = 0; n < games.length; n++) {
        if (games[n].getId() == gameId) {
            games[n].setState(GAME_STATES.ABORTED);
            games[n].getScore().setGameResult(GAME_RESULTS.ABANDONED);

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
function getActiveGameIdByTeam(teamId: string): string {
    for (let n = 0; n < games.length; n++) {
        let g = games[n];

        if (g.getTeam().getId() == teamId) {
            let gs = g.getState();
            if (gs < GAME_STATES.FINISHED) {
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
function getTeamData(teamId: string): ITeam {
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
function findMaze(mazeId: string): Maze {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].getId() == mazeId) {
            return mazes[n];
        }
    }

    log.warn(__filename, 'findMaze()', 'Maze not found: ' + mazeId);
    throw new Error('Maze not found: ' + mazeId);
}

function startServer() {
    // open the service port
    httpServer = app.listen(consts.GAME_SVC_PORT, function() {
        log.info(__filename, 'startServer()', format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT));

        app.use(compression());

        // allow CORS for this application
        app.use(function(req, res, next) {
            log.trace(__filename, 'app.listen()', format('New request: %s', req.url));
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

            // check for cache update needs
            if (Date.now() - lastMazeListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', format('mazeList cache expired - calling refresh.'));
                updateMazesCache();
            }

            if (Date.now() - lastScoreListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', format('scoreList cache expired - calling refresh.'));
                udpateScoresCache();
            }

            if (Date.now() - lastTeamListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', format('teams cache expired - calling refresh.'));
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
            res.sendFile(path.resolve('./views/favicon.ico'));
        });

        app.get('/game/:gameId', function(req, res) {
            // find game in games array
            let gameId = req.params.gameId;
            let game: Game;

            if (!gameExists(gameId)) {
                return res.status(404).json({ status: format('Game [%s] not found.', gameId) });
            }

            try {
                game = getGame(gameId);
                res.json(game);
            } catch (err) {
                res.status(404).json({ status: format('Game [%s] not found.', gameId) });
            }
        });

        /**
         * Sends JSON list of all current, active games with url to full /get/GameId link
         */
        app.get('/games', function(req, res) {
            log.debug(__filename, req.url, 'Returning list of active games (stub data).');
            let data = new Array();

            // only return active games
            if (games.length > 0) {
                for (let n = 0; n < games.length; n++) {
                    if (games[n].getState() < GAME_STATES.FINISHED) data.push(games[n].getStub(consts.GAME_SVC_EXT_URL));
                }

                if (data.length > 0) return res.json(data);
            }
            res.json({ status: 'No games found.' });
        });

        /**
         * Sends JSON list of ALL game stubs full /get/GameId link
         */
        app.get('/games/all', function(req, res) {
            log.debug(__filename, req.url, 'Returning list of all games (stub data).');
            let data = new Array();

            // only return active games
            if (games.length > 0) {
                for (let n = 0; n < games.length; n++) {
                    data.push(games[n].getStub(consts.GAME_SVC_EXT_URL));
                }
                if (data.length > 0) return res.json(data);
            }

            res.json({ status: 'No games found.' });
        });

        /**
         * Renders an HTML list of all games, all states
         */
        app.get('/games/list', function(req, res) {
            log.debug(__filename, req.url, 'Rendering list of active games.');
            res.render('list', {
                games: games,
                extUrl: consts.GAME_SVC_EXT_URL
            });
        });

        app.get(['/game/abort/:gameId/:password', '/game/abandon/:gameId/:password'], function(req, res) {
            let gameId = req.params.gameId;

            if (req.params.password != consts.DELETE_PASSWORD) return res.status(401).json({ status: 'Missing or incorrect password' });

            if (!isGameInProgress(gameId)) {
                res.json({ status: 'Game not current running:' + gameId });
            } else {
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

        app.get(['/game/new/:mazeId/:teamId', '/game/new/:mazeId/:teamId/:forcedGameId'], function(req, res) {
            try {
                // create and return a new game against the given maze
                let teamId = req.params.teamId;
                let gameId = getActiveGameIdByTeam(teamId);
                let forcedGameId = req.params.forcedGameId !== undefined ? req.params.forcedGameId : '';
                let gameUrl = consts.GAME_SVC_EXT_URL + '/game/';

                // make the team isn't already playing
                if (gameId != '') {
                    log.debug(__filename, req.url, format('Team %s already in game %s.', teamId, gameId));
                    return res.status(400).json({ status: format('Team %s already in game %s.', teamId, gameId), url: gameUrl + gameId });
                }

                // check for a forced game id
                if (forcedGameId != '' && isGameInProgress(forcedGameId)) {
                    log.debug(__filename, req.url, format('Game %s already exists - force a different gameId.', forcedGameId));
                    return res.status(400).json({ status: format('Game %s already exists - force a differeng gameId.', forcedGameId), url: gameUrl + forcedGameId });
                }

                // create the game's objects
                let maze: Maze = findMaze(req.params.mazeId);
                let player: Player = new Player(maze.getStartCell(), PLAYER_STATES.STANDING);
                let team: Team = new Team(getTeamData(teamId));
                let score: Score = new Score();

                // configure them
                if (team) {
                    let game: Game = new Game(maze, team, player, score);

                    // game state is new game
                    game.setState(GAME_STATES.NEW);

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
                        log.warn(__filename, req.url, 'New Game(): ID generation overridden with: ' + forcedGameId);
                        game.forceSetId(forcedGameId);
                        game.getScore().setGameId(forcedGameId); // update score key
                    }

                    // make some room in the games array if it's full
                    gcGames();

                    // store the game
                    games.push(game);

                    // return and log
                    res.json({ status: 'Game created.', url: gameUrl + game.getId() });
                    log.info(__filename, req.url, 'New game added to games list: ' + game.getId());
                } else {
                    log.error(__filename, req.url, 'Unable to add new game. Invalid teamId: ' + teamId);
                    // bad request (400)
                    res.status(400).json({ status: format('Invalid teamId: %s', teamId) });
                }

                //let game: Game = new Game(maze, team, new Score());
            } catch (err) {
                log.error(__filename, req.url, 'Error creating game: ' + err.toString());
                res.status(500).json({ status: format('Error creating game: %s', err.toString()) });
            }
        });

        /**
         * Performs an action (MOVE, LOOK, JUMP, MARK)
         * Format: /game/action/<gameId>?act=[move|look|jump|write|stand]&[dir|msg]=[direction|message]
         *
         * Returns the results of the action and an engram describing
         * new state.
         */
        app.get(['/game/action/:gameId', '/game/action/:gameId/:botId'], function(req, res) {
            try {
                // make sure we have the right arguments
                if (req.query.act === undefined || req.params.gameId === undefined || req.params.gameId === 'undefined') {
                    log.warn(__filename, req.url, 'gameId is undefined.');
                    return res.status(400).json({
                        status: 'Missing querystring argument(s). Format=?act=[move|look|jump|write] [&dir=<none|north|south|east|west>] [&message=text]'
                    });
                }

                // format the action and make sure it's valid
                let argAct: string = format('%s', req.query.act).toUpperCase();
                if (argAct != 'MOVE' && argAct != 'LOOK' && argAct != 'JUMP' && argAct != 'WRITE' && argAct != 'STAND') {
                    log.warn(__filename, req.url, 'Invalid Action: ' + argAct);
                    return res.status(400).json({
                        status: format('Invalid action: %s.  Expected ?act=[ MOVE | LOOK | JUMP | STAND | WRITE ]', argAct)
                    });
                }

                // format the direction and make sure it's valid
                let argDir: any = format('%s', req.query.dir).toUpperCase();
                let dir: number = parseInt(DIRS[argDir]); // value will be NaN if not a valid direction name
                if (req.query.dir !== undefined && isNaN(dir)) {
                    return res.status(400).json({ status: 'Invalid direction. Options: NONE|NORTH|SOUTH|EAST|WEST' });
                }

                // if the gameId is invalid or doesn't exist, getGame() throws an error and we'll fall down to catch
                let gameId = req.params.gameId;
                let game: Game = getGame(gameId);

                // so far so good, let's create the action structure
                let action: IAction = {
                    action: argAct,
                    mazeId: game.getMaze().getId(),
                    direction: isNaN(dir) ? 'N/A' : DIRS[dir],
                    engram: { sight: '', sound: '', smell: '', touch: '', taste: '' },
                    location: game.getPlayer().Location,
                    score: game.getScore().toJSON(),
                    playerState: game.getPlayer().State,
                    outcome: new Array<string>()
                };

                // now remove turn-based states that might have been set in the last turn
                if (!!(game.getPlayer().State & PLAYER_STATES.STUNNED)) {
                    game.getPlayer().removeState(PLAYER_STATES.STUNNED);
                    log.debug(__filename, req.url, 'PLAYER.STUNNED Removed.');
                }

                // perform the appropriate action
                switch (argAct) {
                    case 'MOVE': {
                        act.doMove(game, dir, action);
                        break;
                    }
                    case 'JUMP': {
                        break;
                    }
                    case 'WRITE': {
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

                // refresh some duplicated action values
                action.score = game.getScore().toJSON();
                action.location = game.getPlayer().Location;

                // store the action on the game action stack and return it to the requester as json
                game.addAction(action);
                res.json(action);

                // handle game end states
                if (game.getState() > GAME_STATES.IN_PROGRESS) {
                    log.debug(__filename, req.url, format('Game [%s] with result [%s]', GAME_STATES[game.getState()], GAME_RESULTS[game.getScore().getGameResult()]));
                    request.doPost(consts.SCORE_SVC_URL + '/score', game.getScore(), function handlePostScore(res: any, body: any) {
                        log.debug(__filename, req.url, format('Score saved.'));
                    });
                }
            } catch (err) {
                log.error(__filename, req.url, 'Error executing action: ' + err.stack);
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
                let maze: Maze = findMaze(req.params.mazeId);
                res.json(maze);
            } catch (err) {
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
            let game: Game;
            let start: number = 0;
            let count: number = 0;

            if (req.query.start !== undefined) start = parseInt(req.query.start + '');
            if (req.query.count !== undefined) count = parseInt(req.query.count + '');

            if (!gameExists(gameId)) {
                return res.status(404).json({ status: format('Game [%s] not found.', gameId) });
            }

            try {
                game = getGame(gameId);
                let actCount = game.getActions().length;

                if (actCount == 0) return res.json({ status: format('Game [%s] has no actions.', gameId) });
                if (actCount < start) return res.json({ status: format('There are only %d actions in the list.', actCount) });

                if (start > 0) {
                    if (count > 0) {
                        return res.json(game.getActionsRange(start, count));
                    } else {
                        return res.json(game.getActionsSince(start));
                    }
                } else {
                    return res.json(game.getActions());
                }
            } catch (err) {
                log.error(__filename, req.url, 'Error getting action: ' + err.stack);
                res.status(404).json({ status: format('Error getting actions from game [%s]. Bad query? Example: /actions/get/<GAMEID>?start=0&count=50') });
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
                let team: ITeam = getTeamData(req.params.teamId);
                res.json(team);
            } catch (err) {
                res.status(404).json({ status: 'Team Not Found: ' + req.params.mazeId });
            }
        });

        /** SCORE ROUTES **/
        app.get('/scores', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of scores.');
            res.json(scoreList);
        });

        // HOME PAGE
        app.get(['/', '/index'], function(req, res) {
            res.render('index', { extUrl: consts.GAME_SVC_EXT_URL });
        });

        // Bad Routes
        app.get('/*', function(req, res) {
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
