"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// grab the current environment
exports.NODE_ENV = process.env.NODE_ENV || 'PROD';
// load env vars (or defaults if not found - aka PROD)
const MAZE_SVC_HOST = process.env.MAZE_SVC_URL || 'http://maze.code-camp-2018.svc';
exports.MAZE_SVC_PORT = process.env.MAZE_SVC_PORT || 80;
const SCORE_SVC_HOST = process.env.SCORE_SVC_URL || 'http://score.code-camp-2018.svc';
exports.SCORE_SVC_PORT = process.env.SCORE_SVC_PORT || 80;
const TEAM_SVC_HOST = process.env.TEAM_SVC_URL || 'http://team.code-camp-2018.svc';
exports.TEAM_SVC_PORT = process.env.TEAM_SVC_PORT || 80;
const GAME_SVC_HOST = process.env.GAME_SVC_URL || 'http://code-camp-2018.svc';
exports.GAME_SVC_PORT = process.env.GAME_SVC_PORT || 80;
const GAME_SVC_EXT_PORT = process.env.GAME_SVC_EXT_PORT || 80;
// construct base URLs
exports.MAZE_SVC_URL = util_1.format('%s:%s', MAZE_SVC_HOST, exports.MAZE_SVC_PORT);
exports.SCORE_SVC_URL = util_1.format('%s:%s', SCORE_SVC_HOST, exports.SCORE_SVC_PORT);
exports.TEAM_SVC_URL = util_1.format('%s:%s', TEAM_SVC_HOST, exports.TEAM_SVC_PORT);
exports.GAME_SVC_URL = util_1.format('%s:%s', GAME_SVC_HOST, exports.GAME_SVC_PORT);
// game server has a separate url used for generating links accessible from outside of the OCP cluster
exports.GAME_SVC_EXT_URL = process.env.GAME_SVC_EXT_URL + ':' + GAME_SVC_EXT_PORT || 'http://code-camp-2018.com';
// other stuff
exports.CACHE_DELAY = process.env.GAME_SVC_CACHE_REFRESH || 30000; // milliseconds between cache refreshes (skipped in server.ts if no new activity detected)
exports.GAME_SVC_NAME = 'game-server';
exports.DELETE_PASSWORD = process.env.DELETE_PASSWORD;
exports.MAX_GAMES_IN_MEMORY = 60; // maximum number of games allowed to be stored in the games array
exports.APP_VERSION = getPackageVersion();
function getPackageVersion() {
    let data = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve('package.json'), 'utf8'));
    return data.version;
}
//# sourceMappingURL=consts.js.map