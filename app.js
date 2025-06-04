// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { initDb } = require('./utils/db'); // Import initDb from utils/db

// Import all middleware
// const authMiddleware = require('./middleware/auth');
const adminAuthMiddleware = require('./middleware/adminAuth');

// Import all route modules
const registrationRoutes = require('./routes/registration');
const authenticationRoutes = require('./routes/authentication');
const challengesRoutes = require('./routes/challenges');
const submissionRoutes = require('./routes/submission');
const scoreRoutes = require('./routes/score');
const adminRoutes = require('./routes/admin');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000

// Middleware setup
app.use(bodyParser.json()); // To parse JSON request bodies
app.use(cookieParser());    // To parse cookies

// Serve static files from the 'public' directory
// This allows your HTML, CSS, and JS files in 'public' to be served directly
app.use(express.static('public'));

// Initialize database and start the server
// The server will only start listening for requests once the database is ready
initDb().then(db => {
    console.log('Database initialized and tables ensured.');

    // --- Public Routes (No authentication required) ---
    app.use('/register', registrationRoutes(db));
    app.use('/authenticate', authenticationRoutes(db));

    // --- User-Facing API Routes (Require general user authentication) ---
    // Apply authMiddleware to these routes. The middleware will populate req.user
    // with decoded JWT payload if authentication is successful.
    app.use('/api/challenges', require('./middleware/auth')(db), challengesRoutes(db)); // UPDATED
    app.use('/api/submit', require('./middleware/auth')(db), submissionRoutes(db));     // UPDATED
    app.use('/api/score', require('./middleware/auth')(db), scoreRoutes(db));

    // --- Admin API Routes (Require admin authentication) ---
    // Apply adminAuthMiddleware to these routes. This middleware ensures
    // the user is authenticated AND their email matches ADMIN_EMAIL from .env.
    app.use('/admin', adminAuthMiddleware(db), adminRoutes(db));// Mount admin panel routes under /admin

    // --- Global Error Handling Middleware ---
    // This catches any errors thrown by route handlers or other middleware
    app.use((err, req, res, next) => {
        console.error(err.stack); // Log the error stack to the console
        res.status(500).json({ message: 'Something went wrong on the server!' });
    });

    // --- Root Route Redirect (Optional, for easy access during development) ---
    // When a user accesses the root URL, redirect them to the admin panel HTML.
    app.get('/', (req, res) => {
        res.redirect('/admin.html');
    });

    // Start the Express server
    app.listen(port, () => {
        console.log(`Backend server listening at http://localhost:${port}`);
        console.log(`Admin panel available at http://localhost:${port}/admin.html`);
    });

}).catch(err => {
    // If database initialization fails, log the error and exit the process
    console.error('Failed to initialize database:', err);
    process.exit(1); // Exit with a non-zero code to indicate an error
});