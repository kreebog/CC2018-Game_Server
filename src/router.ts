import express from 'express';
const router = express.Router();

router.get('/game', function (req, res) {

});


router.get('/*', function (req, res) {
    res.render('index', {
        contentType: 'text/html',
        responseCode: 404,
        host: req.headers.host
    });
});

export default router;
