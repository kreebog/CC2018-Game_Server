"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cc2018_ts_lib_1 = require("cc2018-ts-lib");
const log = cc2018_ts_lib_1.Logger.getInstance();
const router = express_1.default.Router();
router.get('/favicon.ico', (req, res) => { });
router.get('/*', function (req, res) {
    res.render('index', {
        contentType: 'text/html',
        responseCode: 404,
        host: req.headers.host
    });
});
exports.default = router;
//# sourceMappingURL=router.js.map