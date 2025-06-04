// routes/registration.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (db) => {
    router.post('/', async (req, res) => {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({ message: 'Email and name are required.' });
        }

        try {
            // Check if user already exists
            db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
                if (err) {
                    console.error('Database error during registration check:', err.message);
                    return res.status(500).json({ message: 'Internal server error.' });
                }
                if (row) {
                    return res.status(409).json({ message: 'User with this email already registered.' });
                }

                // Generate a secure one-time token
                const oneTimeToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = bcrypt.hashSync(oneTimeToken, 10);

                // Set token_expires_at to NULL (no expiration until used)
                const tokenExpiresAt = null;

                // Insert new user into the database
                db.run('INSERT INTO users (email, name, token_hash, token_expires_at, solved, score) VALUES (?, ?, ?, ?, ?, ?)',
                    [email, name, tokenHash, tokenExpiresAt, JSON.stringify([]), 0],
                    function (insertErr) {
                        if (insertErr) {
                            console.error('Database error during user insertion:', insertErr.message);
                            return res.status(500).json({ message: 'Internal server error.' });
                        }

                        // Always log and return the token for development/testing
                        console.log(`\n--- One-Time Token for ${email} ---`);
                        console.log(`Token: ${oneTimeToken}`);
                        console.log('------------------------------------\n');

                        res.status(201).json({ message: 'Registration successful. Token printed to console.', token: oneTimeToken });
                    }
                );
            });
        } catch (error) {
            console.error('Registration process error:', error);
            res.status(500).json({ message: 'Internal server error during registration.' });
        }
    });

    return router;
};