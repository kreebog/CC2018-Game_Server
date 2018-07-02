require('dotenv').config();
import * as consts from './consts';
import { IMazeStub, IMaze, ICell, IScore, ITeam, GAME_RESULTS } from 'cc2018-ts-lib'; // import class interfaces
import { Logger, Team, Bot, Game, Maze, Cell, Score, Enums } from 'cc2018-ts-lib'; // import classes

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
log.setLogLevel(consts.NODE_ENV == 'DVLP' ? LOG_LEVELS.TRACE : LOG_LEVELS.INFO);
app.set('views', 'views');      // using pug html rendering engine
app.set('view engine', 'pug');  // using pug html rendering engine

// initialize cache arrays
let mazes: Array<IMaze> = new Array<IMaze>();                // full mazes - added to when requested (TODO: Possible?)
let mazeList: Array<IMazeStub> = new Array<IMazeStub>();     // list of available mazes
let scoreList: Array<IScore> = new Array<IScore>();          // list of available scores

// initialize team and game tracking arrays
let teams: Array<ITeam> = new Array<ITeam>();
let games: Array<Game> = new Array<Game>();

// activity tracking vars
let serviceStarted: boolean = false;  // set true when startup() completes successfully
let lastMazeListFill: number = 0;     // updated by Date.now() after cache request fulfillment 
let lastScoreListFill: number = 0;    // updated by Date.now() after cache request fulfillment 
let lastTeamListFill: number = 0;    // updated by Date.now() after cache request fulfillment 

// Service End Points
const EP = {
    'mazes': format('%s/%s', consts.MAZE_SVC_URL, 'get'),
    'mazeById': format('%s/%s', consts.MAZE_SVC_URL, 'get/:mazeId'),
    'scores': format('%s/%s', consts.SCORE_SVC_URL, 'get'),
    'teams': format('%s/%s', consts.TEAM_SVC_URL, 'get'),
}

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
        log.debug(__filename, 'loadMazeById()', format('Maze [%s] already loaded, skipping.', mazeId));
    } else {
        svc.doRequest(EP['mazeById'].replace(':mazeId', mazeId), function handleGetMaze(res: Response, body: any) {
            let maze: IMaze = JSON.parse(body); // this assignment is not totally necessary, but helps debug logging
            mazes.push(maze);
            log.debug(__filename, 'handleGetMaze()', format('Maze %s loaded.', maze.id));
        });
    }
}

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
        startServer(); // start the express server
    } else {
        log.warn(__filename, 'bootstrap()', format('Maze, Score, and Team lists must be populated.  mazeList Length=%d, scoreList Length=%d', mazeList.length, scoreList.length));
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

    log.warn(__filename, 'findGame()', 'Maze not found: ' + gameId);
    throw new Error('Game Not Found: ' + gameId);
}

/**
 * Find and return the team with the matching ID
 * 
 * @param teamId 
 */
function findTeam(teamId: number): ITeam {
    for (let n = 0; n < teams.length; n++) {
        if (teams[n].id == teamId) {
            return teams[n];
        }
    }

    log.warn(__filename, 'findTeam()', 'Team not found: ' + teamId);
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
updateMazesCache();
udpateScoresCache();
updateTeamsCache();

function startServer() {

    // open the service port
    httpServer = app.listen(consts.GAME_SVC_PORT, function () {
        log.info(__filename, 'startServer()', format('%s listening on port %d', consts.GAME_SVC_NAME, consts.GAME_SVC_PORT))

        serviceStarted = true;

        // allow CORS for this application
        app.use(function (req, res, next) {
            log.trace(__filename, 'app.listen()', format('New request: %s', req.url));
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

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

            // move on to the next route
            next();
        });

        app.get('/get/:gameId', function (req, res) {
            // find game in games array
            let gameId = req.params.gameId;
            let game: Game;
            
            try {
                game = findGame(gameId);
                res.status(200).json(game);
            } catch {
                res.status(404).json({"status":format('Game [%s] not found.', gameId)});
            }
        });

        // send list of available games
        app.get('/get', function (req, res) {
            log.debug(__filename, req.url, 'Returning list of active games.');

            if (games.length == 0) {
                res.status(200).json({'status':'No active games found.'});
            } else {
                res.status(200).json(games);
            }
        });

        app.get('/game/new/:mazeId/:teamId', function (req, res) {
            try {
                // create and return a new game against the given maze
                let teamId = parseInt(req.params.teamId);
                let maze: IMaze = findMaze(req.params.mazeId);
                let score: Score = new Score();
                let team: any = findTeam(teamId);

                if (team) {
                    let game: Game = new Game(maze, team, score);
                    games.push(game);
                    log.info(__filename, req.url, 'New game added to games list: ' + JSON.stringify(game))
                    res.status(200).json(game);
                } else {
                    log.error(__filename, req.url, 'Unable to add new game. Invalid teamId: ' + teamId);
                    res.status(500).json({"status":format('Invalid teamId: %s', teamId)});
                }

                //let game: Game = new Game(maze, team, new Score());
            } catch(err) {
                log.error(__filename, req.url, 'Error while adding game: ' + JSON.stringify(err));
                res.status(404).json({"status":format('Error creating game: %s', JSON.stringify(err))});
            }
        });

        app.use('/*', router);
    });
}

/**
 * Watch for SIGINT (process interrupt signal) and trigger shutdown
 */
process.on('SIGINT', function onSigInt() {
    // all done, close the db connection
    log.info(__filename, 'onSigInt()', 'Got SIGINT - Exiting applicaton...');
    doShutdown()
});

/**
 * Watch for SIGTERM (process terminate signal) and trigger shutdown
 */
process.on('SIGTERM', function onSigTerm() {
    // all done, close the db connection
    log.info(__filename, 'onSigTerm()', 'Got SIGTERM - Exiting applicaton...');
    doShutdown()
});

/**
 * Gracefully shut down the service
 */
function doShutdown() {
    log.info(__filename, 'doShutDown()', 'Closing HTTP Server connections...');
    httpServer.close();
}