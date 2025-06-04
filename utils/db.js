// utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../ctf_data.db');

function initDb() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
            } else {
                console.log('Connected to the SQLite database.');

                db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    token_hash TEXT,
                    token_expires_at DATETIME,
                    solved TEXT,
                    score INTEGER DEFAULT 0,
                    is_admin INTEGER DEFAULT 0
                )`, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err.message);
                        reject(err);
                    } else {
                        console.log('Users table ensured.');

                        // ADDED 'links TEXT' column here
                        db.run(`CREATE TABLE IF NOT EXISTS challenges (
                            id TEXT PRIMARY KEY,
                            title TEXT NOT NULL,
                            description TEXT NOT NULL,
                            points INTEGER NOT NULL,
                            flag TEXT NOT NULL,
                            level TEXT,
                            category TEXT,
                            links TEXT -- NEW: Column for comma-separated links
                        )`, (err) => {
                            if (err) {
                                console.error('Error creating challenges table:', err.message);
                                reject(err);
                            } else {
                                console.log('Challenges table ensured.');
                                resolve(db);
                            }
                        });
                    }
                });
            }
        });
    });
}

module.exports = {
    initDb
};