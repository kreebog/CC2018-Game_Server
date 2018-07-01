import express from 'express';
import { Logger } from 'cc2018-ts-lib';

const log = Logger.getInstance();
const router = express.Router();

router.get('/favicon.ico', (req, res) => {});

router.get('/*', function (req, res) {

    res.render('index', {
        contentType: 'text/html',
        responseCode: 404,
        host: req.headers.host
    });
});

export default router;
