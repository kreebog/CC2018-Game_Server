"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const util_1 = require("util");
// grab the current environment
exports.NODE_ENV = process.env.NODE_ENV || 'PROD';
// load env vars (or defaults if not found - aka PROD)
exports.MAZE_SVC_HOST = process.env.MAZE_SVC_URL || 'http://maze-service-code-camp.a3c1.starter-us-west-1.openshiftapps.com';
exports.MAZE_SVC_PORT = process.env.MAZE_SVC_PORT || 80;
exports.SCORE_SVC_HOST = process.env.SCORE_SVC_URL || 'http://score-service-code-camp.a3c1.starter-us-west-1.openshiftapps.com';
exports.SCORE_SVC_PORT = process.env.SCORE_SVC_PORT || 80;
exports.GAME_SVC_PORT = process.env.GAME_SVC_PORT || 8080;
// construct base URLs
exports.MAZE_SVC_URL = util_1.format('%s:%s', exports.MAZE_SVC_HOST, exports.MAZE_SVC_PORT);
exports.SCORE_SVC_URL = util_1.format('%s:%s', exports.SCORE_SVC_HOST, exports.SCORE_SVC_PORT);
// other stuff
exports.CACHE_DELAY = process.env.GAME_SVC_CACHE_REFRESH || 15000; // milliseconds between cache refreshes (skipped in server.ts if no new activity detected)
exports.GAME_SVC_NAME = 'game-server';
//# sourceMappingURL=consts.js.map