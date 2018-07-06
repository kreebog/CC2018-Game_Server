import express from 'express';
import { Logger } from 'cc2018-ts-lib';

const log = Logger.getInstance();
const router = express.Router();

router.get('/favicon.ico', (req, res) => {});

router.get('/*', function (req, res) {

    log.trace(__filename, req.url, 'Bad route - rendering index.');

    res.render('index', {
        contentType: 'text/html',
        responseCode: 404,
        host: req.headers.host
    });
});

export default router;
