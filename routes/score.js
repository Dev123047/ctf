// routes/score.js

const express = require('express');
const router = express.Router();

module.exports = (db) => {
    router.get('/', (req, res) => {
        // req.user is populated by authMiddleware
        const userEmail = req.user.email;

        db.get('SELECT name, score, solved FROM users WHERE email = ?', [userEmail], (err, user) => {
            if (err) {
                console.error('Database error fetching user score:', err.message);
                return res.status(500).json({ message: 'Internal server error.' });
            }
            if (!user) {
                return res.status(404).json({ message: 'User not found. This should not happen after authentication.' });
            }

            // Parse the solved challenges JSON string back into an array
            const solvedChallenges = JSON.parse(user.solved || '[]');

            res.status(200).json({
                name: user.name,
                score: user.score,
                solvedChallenges: solvedChallenges
            });
        });
    });

    return router;
};