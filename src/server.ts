require('dotenv').config();
import path from 'path';
import * as consts from './consts';
import { IMazeStub, IMaze, ICell, IScore, ITeam } from 'cc2018-ts-lib'; // import class interfaces
import { Logger, Team, Bot, Game, Maze, Cell, Score, Enums } from 'cc2018-ts-lib'; // import classes
import { DIRS, GAME_RESULTS, GAME_STATES, ACTIONS, TAGS } from 'cc2018-ts-lib'; // import classes
import compression from 'compression';
import * as action from './actions';

import { format } from 'util';
import { Server } from 'http';
import * as svc from './request';
import express from 'express';

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
let mazes: Array<IMaze> = new Array<IMaze>(); // full mazes - added to when requested (TODO: Possible?)
let mazeList: Array<IMazeStub> = new Array<IMazeStub>(); // list of available mazes
let scoreList: Array<IScore> = new Array<IScore>(); // list of available scores

// initialize team and game tracking arrays
let teams: Array<ITeam> = new Array<ITeam>();
let games: Array<Game> = new Array<Game>();

// activity tracking vars
let serviceStarted: boolean = false; // set true when startup() completes successfully
let lastMazeListFill: number = 0; // updated by Date.now() after cache request fulfillment
let lastScoreListFill: number = 0; // updated by Date.now() after cache request fulfillment
let lastTeamListFill: number = 0; // updated by Date.now() after cache request fulfillment

// Service End Points
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
        svc.doRequest(EP['mazeById'].replace(':mazeId', mazeId), function handleGetMaze(res: any, body: any) {
            let maze: IMaze = JSON.parse(body); // this assignment is not totally necessary, but helps debug logging
            mazes.push(maze);
            log.trace(__filename, 'handleGetMaze()', format('Maze %s loaded.', maze.id));
        });
    }
}

/**
 * Quick scan of mazes array to determine if the maze is already cached
 * @param mazeId
 */
function mazeLoaded(mazeId: string): boolean {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].id == mazeId) return true;
    }
    return false;
}

// Pull the list of available mazes from the maze-service
// cache it locally.  Refreshses as part of the incoming request
// process if consts.CACHE_DELAY is exceeded
function updateMazesCache() {
    svc.doRequest(EP['mazes'], function handleGetMazes(res: Response, body: any) {
        mazeList = JSON.parse(body);
        // dumpArray(mazeList, 'id');
        log.debug(__filename, 'handleGetMazes()', format('%d maze stubs loaded into mazeList array.', mazeList.length));

        // populate the mazes list
        mazeList.forEach(mazeStub => {
            loadMazeById(mazeStub.id);
            mazeStub.url = format('%s/maze/%d:%d:%s', consts.GAME_SVC_EXT_URL, mazeStub.height, mazeStub.width, mazeStub.seed);
        });

        // attempt to start the service
        if (!serviceStarted) bootstrap();
    });
}

// Same as updateMazesCache, but with teams
function updateTeamsCache() {
    svc.doRequest(EP['teams'], function handleLoadScores(res: Response, body: any) {
        teams = JSON.parse(body);
        // dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'handleLoadScores()', format('%d teams loaded into scoreList array.', scoreList.length));

        // attempt to start the service
        if (!serviceStarted) bootstrap();
    });
}

// Same as updateMazesCache, but with scores
function udpateScoresCache() {
    svc.doRequest(EP['scores'], function handleLoadScores(res: Response, body: any) {
        scoreList = JSON.parse(body);
        // dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'handleLoadScores()', format('%d scores loaded into scoreList array.', scoreList.length));

        // attempt to start the service
        if (!serviceStarted) bootstrap();
    });
}

/**
 * Kicks off the cache refresh interval once base caches are filled
 */
function bootstrap() {
    if (mazeList.length > 0 && scoreList.length > 0 && teams.length > 0) {
        log.debug(__filename, 'bootstrap()', format('Caches populated, starting server.  mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
        startServer(); // start the express server
    } else {
        log.warn(__filename, 'bootstrap()', format('Maze, Score, and Team lists must be populated.  mazeList:%d, scoreList:%d, teams:%d', mazeList.length, scoreList.length, teams.length));
    }
}

/**
 * Find and return the game with the matching ID
 *
 * @param gameId
 */
function findGame(gameId: string): Game {
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
function findGameInProgress(teamId: string): string {
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
function findTeam(teamId: string): ITeam {
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
function findMaze(mazeId: string): IMaze {
    for (let n = 0; n < mazes.length; n++) {
        if (mazes[n].id == mazeId) {
            return mazes[n];
        }
    }

    log.warn(__filename, 'findMaze()', 'Maze not found: ' + mazeId);
    throw new Error('Maze not found: ' + mazeId);
}

// initialize the server & cache refresh processes
log.info(__filename, '', 'Starting Game Server v' + consts.APP_VERSION);

updateMazesCache();
udpateScoresCache();
updateTeamsCache();

function startServer() {
    // open the service port
    httpServer = app.listen(consts.GAME_SVC_PORT, function() {
        log.info(__filename, 'startServer()', format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT));

        serviceStarted = true;

        app.use(compression());

        // allow CORS for this application
        app.use(function(req, res, next) {
            log.trace(__filename, 'app.listen()', format('New request: %s', req.url));
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

            // check for cache update needs
            if (Date.now() - lastMazeListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', format('mazeList cache expired - calling refresh.'));
                lastMazeListFill = Date.now();
                updateMazesCache();
            }

            if (Date.now() - lastScoreListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', format('scoreList cache expired - calling refresh.'));
                lastScoreListFill = Date.now();
                udpateScoresCache();
            }

            if (Date.now() - lastTeamListFill > consts.CACHE_DELAY) {
                log.info(__filename, 'startServer()', format('teams cache expired - calling refresh.'));
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
            res.status(200).sendFile(path.resolve('/views/favicon.ico'));
        });

        app.get('/game/:gameId', function(req, res) {
            // find game in games array
            let gameId = req.params.gameId;
            let game: Game;

            try {
                game = findGame(gameId);
                res.status(200).json(game);
            } catch {
                res.status(404).json({ status: format('Game [%s] not found.', gameId) });
            }
        });

        /**
         * Sends JSON list of all current games with url to full /get/GameId link
         */
        app.get('/games', function(req, res) {
            log.debug(__filename, req.url, 'Returning list of active games.');

            if (games.length == 0) {
                // response code 204 (NO CONTENT)
                res.status(204).send();
            } else {
                let data = new Array();
                for (let n = 0; n < games.length; n++) {
                    data.push({
                        id: games[n].getId(),
                        teamId: games[n].getTeam().getId(),
                        teamName: games[n].getTeam().getName(),
                        gameState: games[n].getState(),
                        moveCount: games[n].getScore().getMoveCount(),
                        url: format('%s/%s/%s', consts.GAME_SVC_EXT_URL, 'game', games[n].getId())
                    });
                }

                res.status(200).json(data);
            }
        });

        /**
         * Renders an HTML list of games
         */
        app.get('/games/list', function(req, res) {
            log.debug(__filename, req.url, 'Rendering list of active games.');
            res.render('list', {
                contentType: 'text/html',
                responseCode: 200,
                games: games
            });
        });

        /**
         * Attempts to create a new game using the given Team and Maze
         * -- If team is already in a game, redirects to /get/GameID
         * -- If team or maze not found, returns error.
         */
        app.get('/game/new/:mazeId/:teamId', function(req, res) {
            try {
                // create and return a new game against the given maze
                let teamId = req.params.teamId;
                let gameId = findGameInProgress(teamId);

                if (gameId != '') {
                    log.debug(__filename, req.url, format('Redirecting to /get/gameId - Team %s already in game %s.', teamId, gameId));
                    return res.redirect('/game/' + gameId);
                }

                let maze: IMaze = findMaze(req.params.mazeId);
                let score: Score = new Score();
                let teamStub: ITeam = findTeam(teamId);
                let team: Team = new Team(teamStub);

                if (team) {
                    let game: Game = new Game(maze, team, score);
                    games.push(game);
                    log.info(__filename, req.url, 'New game added to games list: ' + game.getId());
                    res.status(200).json(game);
                } else {
                    log.error(__filename, req.url, 'Unable to add new game. Invalid teamId: ' + teamId);
                    res.status(500).json({ status: format('Invalid teamId: %s', teamId) });
                }

                //let game: Game = new Game(maze, team, new Score());
            } catch (err) {
                log.error(__filename, req.url, 'Error creating game: ' + err.toString());
                res.status(404).json({ status: format('Error creating game: %s', err.toString()) });
            }
        });

        // move the team's AI in the given direction (if possible)
        app.get('/game/action/move/:gameId/:direction', function(req, res) {
            try {
                if (req.params.gameId === undefined || req.params.direction === undefined) {
                    return res.status(400).json({ status: 'Missing argument(s).  Format=/game/action/move/<GameID>/<Direction>' });
                }

                let gameId = req.params.gameId;
                let argDir: any = format('%s', req.params.direction).toUpperCase();

                let dir: number = parseInt(DIRS[argDir]); // value will be NaN if not a valid direction name
                if (isNaN(dir)) {
                    throw new Error(format('Invalid Direction: %s.  Valid directions are NONE, NORTH, SOUTH, EAST, and WEST', req.params.direction));
                }

                let game: Game = findGame(gameId); // will throw error if game not found - drops to catch block

                res.status(200).json({ status: format('Move %s completed.', argDir) });
            } catch (err) {
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
        app.get('/game/action/:gameId', function(req, res) {
            try {
                // make sure we have the right arguments
                if (req.query.act === undefined || req.params.gameId === undefined) {
                    return res.status(400).json({
                        status: 'Missing querystring argument(s). Format=?act=[move|look|jump|write|say] [&dir=<none|north|south|east|west>] [&message=text]'
                    });
                }

                let gameId = req.params.gameId;
                let argAct: string = format('%s', req.query.act).toUpperCase();
                let argDir: any = format('%s', req.query.dir).toUpperCase();

                let dir: number = parseInt(DIRS[argDir]); // value will be NaN if not a valid direction name
                let game: Game = findGame(gameId); // will throw error if game not found - drops to catch block
                let maze: Maze = new Maze(game.getMaze());
                let cell: Cell = maze.getCell(game.getPlayerPos().row, game.getPlayerPos().col);

                switch (argAct) {
                    case 'MOVE':
                        if (isNaN(dir)) return res.status(400).json({ status: 'Invalid direction.' });

                        if (game.isOpenDir(dir)) {
                            game.doMove(dir);
                            console.log("NOPE CAN't GO THAT WAY!");
                        } else {
                            console.log("NOPE CAN't GO THAT WAY!");
                        }

                        break;
                    case 'LOOK':
                        if (isNaN(dir)) return res.status(400).json({ status: 'Invalid direction. Options: NONE|NORTH|SOUTH|EAST|WEST' });
                        return res.status(200).json(action.doLook(cell, dir));
                        break;
                    case 'JUMP':
                        if (isNaN(dir)) return res.status(400).json({ status: 'Invalid direction. Options: NONE|NORTH|SOUTH|EAST|WEST' });
                        break;
                    case 'WRITE':
                        break;
                    case 'SAY':
                        break;
                    default:
                        log.warn(__filename, req.url, 'Invalid Action: ' + argAct);
                        return res.status(400).json({
                            status: format('Invalid action: %s.  Expected act=[ MOVE | LOOK | JUMP | WRITE | SAY ]', argAct)
                        });
                }
            } catch (err) {
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
                let maze: IMaze = findMaze(req.params.mazeId);
                res.status(200).json(maze);
            } catch (err) {
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
                let team: ITeam = findTeam(req.params.teamId);
                res.status(200).json(team);
            } catch (err) {
                res.status(404).json({ status: 'Team Not Found: ' + req.params.mazeId });
            }
        });

        /** SCORE ROUTES **/
        app.get('/scores', (req, res) => {
            log.trace(__filename, req.url, 'Sending list of scores.');
            res.status(200).json(scoreList);
        });

        // Bad Routes
        app.get('/*', function(req, res) {
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
