"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const util_1 = require("util");
exports.MAZE_SVC_HOST = process.env.MAZE_SVC_URL || 'localhost';
exports.MAZE_SVC_PORT = process.env.MAZE_SVC_PORT || 8080;
exports.SCORE_SVC_HOST = process.env.SCORE_SVC_URL || 'localhost';
exports.SCORE_SVC_PORT = process.env.SCORE_SVC_PORT || 8081;
exports.GAME_SVC_PORT = process.env.GAME_SVC_PORT || 8080;
// constants from environment variables (or .env file)
exports.NODE_ENV = process.env.NODE_ENV || 'PROD';
exports.MAZE_SVC_URL = util_1.format('%s:%s', exports.MAZE_SVC_HOST, exports.MAZE_SVC_PORT);
exports.SCORE_SVC_URL = util_1.format('%s:%s', exports.SCORE_SVC_HOST, exports.SCORE_SVC_PORT);
//# sourceMappingURL=consts.js.map