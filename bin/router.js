"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib");
const server_1 = require("./server");
const log = cc2018_ts_lib_1.Logger.getInstance();
const router = express_1.default.Router();
router.get('/favicon.ico', (req, res) => {
    res.status(200).sendFile(path_1.default.resolve('/views/favicon.ico'));
});
router.get('/mazes/list', (req, res) => {
    log.trace(__filename, req.url, 'Sending list of mazes.');
    res.status(200).json(server_1.mazeList);
});
router.get('/*', function (req, res) {
    log.trace(__filename, req.url, 'Bad route - rendering index.');
    res.render('index', {
        contentType: 'text/html',
        responseCode: 404,
        host: req.headers.host
    });
});
exports.default = router;
//# sourceMappingURL=router.js.map