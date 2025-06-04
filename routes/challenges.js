// routes/challenges.js

const express = require('express');
const router = express.Router();

module.exports = (db) => {

    router.get('/', (req, res) => {
        db.all('SELECT id, title, description, points, level, category, links FROM challenges', [], (err, rows) => {
            if (err) {
                console.error('Database error fetching challenges:', err.message);
                return res.status(500).json({ message: 'Failed to retrieve challenges.' });
            }
            // Challenges are sent as a flat array directly from the DB
            res.json(rows);
        });
    });

    return router;
};