require('dotenv').config();
import { format } from 'util';
import fs from 'fs';
import path from 'path';

// grab the current environment
export const NODE_ENV = process.env.NODE_ENV || 'PROD';

// load env vars (or defaults if not found - aka PROD)
const MAZE_SVC_HOST = process.env.MAZE_SVC_URL || 'http://maze.code-camp-2018.svc';
export const MAZE_SVC_PORT = process.env.MAZE_SVC_PORT || 80;

const SCORE_SVC_HOST = process.env.SCORE_SVC_URL || 'http://score.code-camp-2018.svc';
export const SCORE_SVC_PORT = process.env.SCORE_SVC_PORT || 80;

const TEAM_SVC_HOST = process.env.TEAM_SVC_URL || 'http://team.code-camp-2018.svc';
export const TEAM_SVC_PORT = process.env.TEAM_SVC_PORT || 80;

const GAME_SVC_HOST = process.env.GAME_SVC_URL || 'http://code-camp-2018.svc';
export const GAME_SVC_PORT = process.env.GAME_SVC_PORT || 80;

const GAME_SVC_EXT_PORT = process.env.GAME_SVC_EXT_PORT || 80;

// construct base URLs
export const MAZE_SVC_URL = format('%s:%s', MAZE_SVC_HOST, MAZE_SVC_PORT);
export const SCORE_SVC_URL = format('%s:%s', SCORE_SVC_HOST, SCORE_SVC_PORT);
export const TEAM_SVC_URL = format('%s:%s', TEAM_SVC_HOST, TEAM_SVC_PORT);
export const GAME_SVC_URL = format('%s:%s', GAME_SVC_HOST, GAME_SVC_PORT);

// game server has a separate url used for generating links accessible from outside of the OCP cluster
export const GAME_SVC_EXT_URL = process.env.GAME_SVC_EXT_URL + ':' + GAME_SVC_EXT_PORT || 'http://code-camp-2018.com';

// other stuff
export const CACHE_DELAY = process.env.GAME_SVC_CACHE_REFRESH || 30000; // milliseconds between cache refreshes (skipped in server.ts if no new activity detected)
export const GAME_SVC_NAME = 'game-server';
export const APP_VERSION = getPackageVersion();

function getPackageVersion(): string {
    let data = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    return data.version;
}
