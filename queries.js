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

async function getHighScoreID(slug, wallet) {
    var response
    const select = await pool.query('SELECT * FROM scores WHERE collection = $1 AND wallet = $2 ORDER BY score DESC', [slug, wallet])

    if (select.rows.length) {
        response = select.rows[0].id
    }

    return response
}

const addScore = async (request, response) => {
    const { slug, wallet, score } = request.body

    // Add user new score
    const insert = await pool.query('INSERT INTO scores (collection, wallet, score) VALUES ($1, $2, $3) RETURNING id', [slug, wallet, score])
    response.status(201).send(insert.rows[0].id.toString())

    const highScoreID = await getHighScoreID(slug, wallet)

    if (highScoreID) {
        // Clear scores older than 1 month and not high score
        const select = await pool.query('SELECT * FROM scores WHERE collection = $1 AND wallet = $2 AND id != $3 AND date < now() - interval \'1 month\'', [slug, wallet, highScoreID])

        if (select.rows.length) {
            // Loop and delete
            for (let x = 0; x < select.rows.length; x++) {
                pool.query('DELETE FROM scores WHERE id = $1', [select.rows[x].id])
            }
        }
    }
}

const getUserScores = async (request, response) => {
    const select = await pool.query('SELECT * FROM scores WHERE collection = $1 AND wallet = $2 ORDER BY score DESC', [request.params.slug, request.params.wallet])
    response.status(200).json(select.rows)
}

/* Export */

export default { addScore, getUserScores }