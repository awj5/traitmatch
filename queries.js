'use strict';

import PG from 'pg'
import Request from 'request'

const pool = new PG.Pool({
    user: process.env.DATABASE_USER ? process.env.DATABASE_USER : 'adamjohnson',
    host: process.env.DATABASE_NAME ? 'ec2-52-73-155-171.compute-1.amazonaws.com' : 'localhost',
    database: process.env.DATABASE_NAME ? process.env.DATABASE_NAME : 'adamjohnson',
    password: process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
    port: 5432,
    ssl: process.env.DATABASE_NAME ? { rejectUnauthorized: false } : false
})

/* Queries */

const getScores = (request, response) => {
    pool.query('SELECT * FROM scores WHERE wallet = $1 ORDER BY score', [request.params.wallet], (error, results) => {
        if (error) {
            throw error
        }

        response.status(200).json(results.rows)
    })
}

const getOSCollection = (request, response) => {
    Request('https://api.opensea.io/api/v1/collection/' + request.params.slug, function (error, results) {
        if (error) {
            throw error
        }

        response.status(200).send(results.body)
    });
}

/* Export */

export default { getScores, getOSCollection }