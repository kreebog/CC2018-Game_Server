"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const util_1 = require("util");
// grab the current environment
exports.NODE_ENV = process.env.NODE_ENV || 'PROD';
// load env vars (or defaults if not found - aka PROD)
exports.MAZE_SVC_HOST = process.env.MAZE_SVC_URL || 'http://maze-service.code-camp.svc';
exports.MAZE_SVC_PORT = process.env.MAZE_SVC_PORT || 8080;
exports.SCORE_SVC_HOST = process.env.SCORE_SVC_URL || 'http://score-service.code-camp.svc';
exports.SCORE_SVC_PORT = process.env.SCORE_SVC_PORT || 8080;
exports.TEAM_SVC_HOST = process.env.TEAM_SVC_URL || 'http://team-service.code-camp.svc';
exports.TEAM_SVC_PORT = process.env.TEAM_SVC_PORT || 8080;
exports.GAME_SVC_HOST = process.env.GAME_SVC_URL || 'http://game-server.code-camp.svc';
exports.GAME_SVC_PORT = process.env.GAME_SVC_PORT || 8080;
exports.GAME_SVC_EXT_PORT = process.env.GAME_SVC_EXT_PORT || 80;
exports.GAME_SVC_EXT_URL = process.env.GAME_SVC_EXT_URL + ':' + exports.GAME_SVC_EXT_PORT || 'http://code-camp-2018.com';
// construct base URLs
exports.MAZE_SVC_URL = util_1.format('%s:%s', exports.MAZE_SVC_HOST, exports.MAZE_SVC_PORT);
exports.SCORE_SVC_URL = util_1.format('%s:%s', exports.SCORE_SVC_HOST, exports.SCORE_SVC_PORT);
exports.TEAM_SVC_URL = util_1.format('%s:%s', exports.TEAM_SVC_HOST, exports.TEAM_SVC_PORT);
exports.GAME_SVC_URL = util_1.format('%s:%s', exports.GAME_SVC_HOST, exports.GAME_SVC_PORT);
// other stuff
exports.CACHE_DELAY = process.env.GAME_SVC_CACHE_REFRESH || 30000; // milliseconds between cache refreshes (skipped in server.ts if no new activity detected)
exports.GAME_SVC_NAME = 'game-server';
//# sourceMappingURL=consts.js.map