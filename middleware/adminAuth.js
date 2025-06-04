// middleware/adminAuth.js

const jwt = require('jsonwebtoken');

// Load environment variables for JWT_SECRET and ADMIN_EMAIL
require('dotenv').config();

// adminAuthMiddleware is a factory function because it needs access to the 'db' instance
module.exports = (db) => {
    return (req, res, next) => {
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ message: 'Admin authentication token missing.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Attach user payload

            // 1. Check if the decoded email matches the ADMIN_EMAIL
            if (req.user.email !== process.env.ADMIN_EMAIL) {
                // If it's a valid token, but not for the designated admin email
                return res.status(403).json({ message: 'Access denied: Not an administrator.' });
            }

            // 2. Production-Ready Enhancement: Check if the admin user exists in the database
            db.get('SELECT id FROM users WHERE email = ?', [req.user.email], (err, userRow) => {
                if (err) {
                    console.error('Database error during admin user existence check:', err.message);
                    res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
                    return res.status(500).json({ message: 'Internal server error during admin authentication check.' });
                }

                if (!userRow) {
                    // Admin user found in JWT and matches ADMIN_EMAIL, but not in DB
                    console.warn(`Attempted admin access by non-existent admin user: ${req.user.email}. Clearing cookie.`);
                    res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
                    return res.status(401).json({ message: 'Admin authentication failed: User does not exist or account is disabled.' });
                }

                // All checks passed: Token valid, email matches ADMIN_EMAIL, and user exists in DB
                next();
            });

        } catch (error) {
            console.error('Admin authentication token verification failed:', error.message);

            // Clear the invalid cookie
            res.clearCookie('auth_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });

            return res.status(401).json({ message: 'Invalid or expired admin authentication token. Please log in again.' });
        }
    };
};