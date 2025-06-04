// routes/authentication.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
    // CHANGE THIS LINE: The route should be '/' because it's mounted under '/authenticate' in app.js
    router.post('/', async (req, res) => { // Changed from '/authenticate' to '/'
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ message: 'Email and token are required.' });
        }

        try {
            db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
                if (err) {
                    console.error('Database error during authentication:', err.message);
                    return res.status(500).json({ message: 'Internal server error.' });
                }
                if (!user) {
                    return res.status(401).json({ message: 'Invalid email or token.' });
                }

                if (!user.token_hash) {
                    return res.status(401).json({ message: 'No active one-time token for this user. Please register to get one.' });
                }

                const tokenIsValid = await bcrypt.compare(token, user.token_hash);

                if (tokenIsValid) {
                    if (user.token_expires_at !== null) {
                        const tokenExpiresAt = new Date(user.token_expires_at);
                        if (tokenExpiresAt < new Date()) {
                            db.run('UPDATE users SET token_hash = NULL, token_expires_at = NULL WHERE email = ?', [email], (updateErr) => {
                                if (updateErr) console.error('Error clearing expired token:', updateErr.message);
                            });
                            return res.status(401).json({ message: 'Token has expired. Please register again to get a new token.' });
                        }
                    }

                    const jwtPayload = { email: user.email, name: user.name };
                    const authToken = jwt.sign(jwtPayload, process.env.JWT_SECRET);

                    res.cookie('auth_token', authToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict',
                    });

                    

                    return res.status(200).json({ message: 'Authentication successful.', current_score: user.score });

                } else {
                    return res.status(401).json({ message: 'Invalid email or token.' });
                }
            });
        } catch (error) {
            console.error('Authentication process error:', error);
            return res.status(500).json({ message: 'Internal server error during authentication.' });
        }
    });

    return router;
};