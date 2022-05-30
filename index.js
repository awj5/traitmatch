'use strict';

import Express from 'express'
import Cors from 'cors'
import DB from './queries.js'
import Alchemy from './alchemy.js'
import Path from 'path';
const app = Express()
const port = process.env.PORT || 3001
const __dirname = Path.resolve()

/* App */

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    next()
})

app.use(Express.static(__dirname + '/public')) // Static files
app.use(Cors())

app.listen(port, () => {
    console.log(`App running on port ${ port }.`)
})

// Router

const router = new Express.Router()
app.use('/', router)

router.get('/*', function (req, res, next) {
    if (req.originalUrl.indexOf('/api/') !== -1) {
        // Exclude API
        next()
    } else {
        req.url = '/index.html'
        app.handle(req, res, next)
    }
});

/* Endpoints */

app.get('/api/scores/:wallet/:slug', DB.getScores)
app.get('/api/os/collection/:slug', DB.getOSCollection)
app.get('/api/nft/:contract/:token', Alchemy.getNFT)
app.get('/api/contracts/:wallet/:page?', Alchemy.getContracts)
app.get('/api/nfts/:wallet/:collection', Alchemy.getContractNFTs)