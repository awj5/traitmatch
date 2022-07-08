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

async function getHighScore(slug, wallet, range) {
    const select = await pool.query('SELECT * FROM scores WHERE collection = $1 AND wallet = $2 AND $3 = 0 OR collection = $1 AND wallet = $2 AND date > now() - interval \'1 day\' * $3 ORDER BY score DESC', [slug, wallet, range])
    return select.rows
}

const addScore = async (request, response) => {
    try {
        const { slug, wallet, score, token } = request.body

        // Add user new score
        const insert = await pool.query('INSERT INTO scores (collection, wallet, score, token) VALUES ($1, $2, $3, $4) RETURNING id', [slug, wallet, score, token])
        const highScore = await getHighScore(slug, wallet, 0)

        if (highScore.length) {
            // Clear scores older than 1 month and not high score
            const select = await pool.query('SELECT * FROM scores WHERE collection = $1 AND wallet = $2 AND id != $3 AND date < now() - interval \'1 month\'', [slug, wallet, highScore[0].id])

            if (select.rows.length) {
                // Loop and delete
                for (let x = 0; x < select.rows.length; x++) {
                    pool.query('DELETE FROM scores WHERE id = $1', [select.rows[x].id])
                }
            }
        }

        response.status(201).send(insert.rows[0].id.toString())
    } catch (error) {
        console.log(error)
        response.status(500).send()
    }
}

const getUserScore = async (request, response) => {
    try {
        const highScore = await getHighScore(request.params.slug, request.params.wallet, request.params.range ? request.params.range : 0)
        response.status(200).json(highScore)
    } catch (error) {
        console.log(error)
        response.status(500).send()
    }
}

const getCollectionScores = async (request, response) => {
    try {
        const select = await pool.query('SELECT wallet, MAX(score) AS score, MAX(date) AS date, MIN(token) AS token FROM scores WHERE collection = $1 AND $2 = 0 OR collection = $1 AND date > now() - interval \'1 day\' * $2 GROUP BY wallet ORDER BY score DESC, date DESC LIMIT 50', [request.params.slug, request.params.range])
        response.status(200).json(select.rows)
    } catch (error) {
        console.log(error)
        response.status(500).send()
    }
}

/* Export */

export default { addScore, getUserScore, getCollectionScores }