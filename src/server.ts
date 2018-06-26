require('dotenv').config();
import * as env from './consts';
import { IMazeStub, IMaze, ICell, IScore, GAME_RESULTS } from 'cc2018-ts-lib'; // import class interfaces
import {Logger, Maze, Cell, Enums} from 'cc2018-ts-lib'; // import classes
import { format } from 'util';
import { LOG_LEVELS } from 'cc2018-ts-lib/dist/Logger';
import * as svc from './request';
import request from 'request';

// get singleton enums + helpers
const enums = Enums.getInstance();

// get singleton logger instance
const log = Logger.getInstance();
log.setLogLevel(env.NODE_ENV == 'DVLP' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);

let mazes:Array<IMaze> = new Array<IMaze>();
let mazeList:Array<IMazeStub> = new Array<IMazeStub>();
let scoreList:Array<IScore> = new Array<IScore>();

// Service End Points
const EP = {
    'mazes': format('%s/%s', env.MAZE_SVC_URL, 'get'),
    'mazeById': format('%s/%s', env.MAZE_SVC_URL, 'get/:mazeId'),
    'scores': format('%s/%s', env.SCORE_SVC_URL, 'get'),
} 

/**
 * Gets a maze (as a data object only) from the maze service and puts it into the mazes array
 * 
 * @param mazeId 
 */
function loadMazeById(mazeId: string) {
    svc.doRequest(EP['mazeById'].replace(':mazeId', '10:15:SimpleSample'), function handleGetMaze(res:request.Response, body:any) {
        let maze: IMaze = JSON.parse(body); // this assignment is not totally necessary, but supports clean debug logging
        mazes.push(maze);
        log.debug(__filename, 'getMazeById()', format('Maze %s loaded. \n%s', maze.id, maze.textRender));
    });
}

/**
 * Gets the list of available mazes and stores it locally
 */
function loadMazeList() {
    svc.doRequest(EP['mazes'], function handleGetMazeList(res:request.Response, body:any) {
        mazeList = JSON.parse(body);
        dumpArray(mazeList, 'id');
        log.debug(__filename, 'getMazeList()', format('%d maze stubs loaded into mazeList array.', mazeList.length));
    });
}

async function loadScores() {
    svc.doRequest(EP['scores'], await function handleGetScoreList(res:request.Response, body:any) {
        scoreList = JSON.parse(body);
        dumpArray(scoreList, 'scoreKey');
        log.debug(__filename, 'getMazeList()', format('%d scores loaded into scoreList array.', scoreList.length));
    });
}

function dumpArray(list:Array<any>, key: string) {
    list.forEach(item => {
        log.debug(__filename, 'dumpArray()', format('%s=%s', key, item[key]));
        log.trace(__filename, 'dumpArray()', JSON.stringify(item));
    });
}

/*
// test getting scores
doRequest(MS_EP['get-scores'],  handleGetScoreListResponse);

// test getting scores by maze
let scoreQuery = '?mazeId=10:10:KrabbyKrust'


/** start the work down here */
loadMazeById('10:15:SuperSimple');
loadMazeList();
loadScores();


