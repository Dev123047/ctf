// middleware/auth.js

const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3
const path = require('path');

// Load environment variables for JWT_SECRET
require('dotenv').config();

// Define the path to your database file (same as in db.js)
const DB_PATH = path.resolve(__dirname, '../ctf_data.db');

// This middleware needs to be a factory function now to receive the db instance
module.exports = (db) => { // Auth middleware now accepts db instance
    return (req, res, next) => {
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ message: 'Authentication token missing.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Attach the decoded user payload to the request object

            // --- Production-Ready Enhancement: Check if user exists in the database ---
            db.get('SELECT id FROM users WHERE email = ?', [req.user.email], (err, userRow) => {
                if (err) {
                    console.error('Database error during user existence check:', err.message);
                    // Clear cookie and return error in case of DB issue
                    res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
                    return res.status(500).json({ message: 'Internal server error during authentication check.' });
                }

                if (!userRow) {
                    // User found in JWT but not in the database (deleted or disabled)
                    console.warn(`Attempted access by non-existent user: ${req.user.email}. Clearing cookie.`);
                    res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
                    return res.status(401).json({ message: 'Authentication failed: User does not exist or account is disabled.' });
                }

                // User exists and token is valid, proceed
                next();
            });
            // --- End of Enhancement ---

        } catch (error) {
            console.error('Authentication token verification failed:', error.message);
            res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
            return res.status(401).json({ message: 'Invalid or expired authentication token. Please log in again.' });
        }
    };
};