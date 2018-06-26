"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
const env = __importStar(require("./consts"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib"); // import classes
const util_1 = require("util");
const Logger_1 = require("cc2018-ts-lib/dist/Logger");
const svc = __importStar(require("./request"));
// get singleton enums + helpers
const enums = cc2018_ts_lib_1.Enums.getInstance();
// get singleton logger instance
const log = cc2018_ts_lib_1.Logger.getInstance();
log.setLogLevel(env.NODE_ENV == 'DVLP' ? Logger_1.LOG_LEVELS.DEBUG : Logger_1.LOG_LEVELS.INFO);
let mazes = new Array();
let mazeList = new Array();
let scoreList = new Array();
// Service End Points
const EP = {
    'mazes': util_1.format('%s/%s', env.MAZE_SVC_URL, 'get'),
    'mazeById': util_1.format('%s/%s', env.MAZE_SVC_URL, 'get/:mazeId'),
    'scores': util_1.format('%s/%s', env.SCORE_SVC_URL, 'get'),
};
/**
 * Gets a maze (as a data object only) from the maze service and puts it into the mazes array
 *
 * @param mazeId
 */
function loadMazeById(mazeId) {
    svc.doRequest(EP['mazeById'].replace(':mazeId', '10:15:SimpleSample'), function handleGetMaze(res, body) {
        let maze = JSON.parse(body); // this assignment is not totally necessary, but supports clean debug logging
        mazes.push(maze);
        log.debug(__filename, 'getMazeById()', util_1.format('Maze %s loaded. \n%s', maze.id, maze.textRender));
    });
}
/**
 * Gets the list of available mazes and stores it locally
 */
function loadMazeList() {
    svc.doRequest(EP['mazes'], function handleGetMazeList(res, body) {
        mazeList = JSON.parse(body);
        dumpArray(mazeList, 'id');
        log.debug(__filename, 'getMazeList()', util_1.format('%d maze stubs loaded into mazeList array.', mazeList.length));
    });
}
function loadScores() {
    return __awaiter(this, void 0, void 0, function* () {
        svc.doRequest(EP['scores'], yield function handleGetScoreList(res, body) {
            scoreList = JSON.parse(body);
            dumpArray(scoreList, 'scoreKey');
            log.debug(__filename, 'getMazeList()', util_1.format('%d scores loaded into scoreList array.', scoreList.length));
        });
    });
}
function dumpArray(list, key) {
    list.forEach(item => {
        log.debug(__filename, 'dumpArray()', util_1.format('%s=%s', key, item[key]));
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
//# sourceMappingURL=server.js.map