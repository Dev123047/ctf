// routes/submission.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For comparing submitted flag with stored hash

module.exports = (db) => {
    router.post('/', async (req, res) => {
        const { challengeId, submittedFlag } = req.body;
        // req.user is populated by authMiddleware
        const userEmail = req.user.email;

        if (!challengeId || !submittedFlag) {
            return res.status(400).json({ message: 'Challenge ID and submitted flag are required.' });
        }

        try {
            // 1. Get the challenge details, including the hashed flag
            db.get('SELECT id, flag, points FROM challenges WHERE id = ?', [challengeId], async (err, challenge) => {
                if (err) {
                    console.error('Database error fetching challenge for submission:', err.message);
                    return res.status(500).json({ message: 'Internal server error.' });
                }
                if (!challenge) {
                    return res.status(404).json({ message: 'Challenge not found.' });
                }

                // 2. Compare the submitted flag with the stored hashed flag
                const flagMatches = await bcrypt.compare(submittedFlag, challenge.flag);

                if (flagMatches) {
                    // Flag is correct!
                    // 3. Update user's score and solved challenges
                    db.get('SELECT id, solved, score FROM users WHERE email = ?', [userEmail], (err, user) => {
                        if (err) {
                            console.error('Database error fetching user for submission:', err.message);
                            return res.status(500).json({ message: 'Internal server error.' });
                        }
                        if (!user) {
                            return res.status(404).json({ message: 'User not found. This should not happen after authentication.' });
                        }

                        let solvedChallenges = JSON.parse(user.solved || '[]');
                        if (solvedChallenges.includes(challengeId)) {
                            return res.status(200).json({ message: 'Flag already submitted for this challenge. Nice try!' });
                        }

                        // Add this challenge to solved list and update score
                        solvedChallenges.push(challengeId);
                        const newScore = user.score + challenge.points;

                        db.run('UPDATE users SET solved = ?, score = ? WHERE id = ?',
                            [JSON.stringify(solvedChallenges), newScore, user.id],
                            function (updateErr) {
                                if (updateErr) {
                                    console.error('Database error updating user score/solved:', updateErr.message);
                                    return res.status(500).json({ message: 'Failed to update user data.' });
                                }
                                res.status(200).json({
                                    message: `Flag accepted! You earned ${challenge.points} points.`,
                                    newScore: newScore
                                });
                            }
                        );
                    });

                } else {
                    // Flag is incorrect
                    res.status(400).json({ message: 'Incorrect flag. Keep trying!' });
                }
            });
        } catch (error) {
            console.error('Error during flag submission process:', error);
            res.status(500).json({ message: 'Internal server error during flag submission.' });
        }
    });

    return router;
};