// routes/admin.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

module.exports = (db) => {

    // --- Challenge Management ---

    // GET all challenges (for admin, include flag hashes and links)
    router.get('/challenges', (req, res) => {
        // NEW: Select 'links' column
        db.all('SELECT id, title, description, points, flag, level, category, links FROM challenges', [], (err, rows) => {
            if (err) {
                console.error('Database error fetching challenges for admin:', err.message);
                return res.status(500).json({ message: 'Internal server error.' });
            }
            res.status(200).json(rows);
        });
    });

        // Helper function to process incoming links into a clean array
    function processLinks(linksInput) {
        let finalLinksArray = [];
        if (Array.isArray(linksInput)) {
            // If it's already an array (ideal case from frontend), clean and use it
            finalLinksArray = linksInput.map(link => String(link).trim()).filter(s => s.length > 0);
        } else if (typeof linksInput === 'string' && linksInput.trim() !== '') {
            // If it's a non-empty string, assume it's comma-separated
            // Split by comma, trim each part, and filter out empty strings
            finalLinksArray = linksInput.split(',').map(s => String(s).trim()).filter(s => s.length > 0);
        }
        // If linksInput is null, undefined, or an empty string, finalLinksArray remains []
        return finalLinksArray;
    }


    // POST /admin/challenges - Create a new challenge
    router.post('/challenges', async (req, res) => {
        const { id, title, description, points, flag, level, category, links } = req.body;

        if (!id || !title || !description || !points || !flag) {
            return res.status(400).json({ message: 'Missing required challenge fields.' });
        }

        try {
            const hashedFlag = await bcrypt.hash(flag, 10);

            // Process and stringify links for database storage
            const finalLinksArray = processLinks(links);
            const linksJsonString = JSON.stringify(finalLinksArray);


            db.run('INSERT INTO challenges (id, title, description, points, level, category, links, flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, title, description, points, level, category, linksJsonString, hashedFlag], // Use linksJsonString here
                function (err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            return res.status(409).json({ message: 'Challenge ID already exists.' });
                        }
                        console.error('Database error creating challenge:', err.message);
                        return res.status(500).json({ message: 'Failed to create challenge.' });
                    }
                    res.status(201).json({ message: 'Challenge created successfully!', challengeId: id });
                }
            );
        } catch (error) {
            console.error('Error hashing flag or processing links:', error);
            res.status(500).json({ message: 'Server error creating challenge.' });
        }
    });

    // PUT /admin/challenges/:id - Update an existing challenge
    router.put('/challenges/:id', async (req, res) => {
        const challengeId = req.params.id;
        const { title, description, points, flag, level, category, links } = req.body;

        if (!title || !description || !points) {
            return res.status(400).json({ message: 'Missing required fields for update.' });
        }

        let updateQuery = `UPDATE challenges SET title = ?, description = ?, points = ?, level = ?, category = ?`;
        let params = [title, description, points, level, category];

        // Process and stringify links for database storage
        const finalLinksArray = processLinks(links);
        const linksJsonString = JSON.stringify(finalLinksArray);
        updateQuery += `, links = ?`;
        params.push(linksJsonString);


        if (flag) {
            try {
                const hashedFlag = await bcrypt.hash(flag, 10);
                updateQuery += `, flag = ?`;
                params.push(hashedFlag);
            } catch (hashErr) {
                console.error('Error hashing flag during update:', hashErr);
                return res.status(500).json({ message: 'Error processing flag.' });
            }
        }

        updateQuery += ` WHERE id = ?`;
        params.push(challengeId);

        db.run(updateQuery, params, function (err) {
            if (err) {
                console.error('Database error updating challenge:', err.message);
                return res.status(500).json({ message: 'Failed to update challenge.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Challenge not found.' });
            }
            res.json({ message: 'Challenge updated successfully!' });
        });
    });

    // DELETE a challenge (unchanged)
    router.delete('/challenges/:id', (req, res) => {
        const challengeId = req.params.id;
        db.run('DELETE FROM challenges WHERE id = ?', [challengeId], function (err) {
            if (err) {
                console.error('Database error deleting challenge:', err.message);
                return res.status(500).json({ message: 'Failed to delete challenge.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Challenge not found.' });
            }
            res.status(200).json({ message: 'Challenge deleted successfully!' });
        });
    });

    // --- User Management (unchanged for this request) ---

    // GET all users (for admin)
    router.get('/users', (req, res) => {
        db.all('SELECT id, email, name, score, solved, is_admin FROM users', [], (err, rows) => {
            if (err) {
                console.error('Database error fetching users for admin:', err.message);
                return res.status(500).json({ message: 'Internal server error.' });
            }
            const users = rows.map(user => ({
                ...user,
                solved: JSON.parse(user.solved || '[]'),
                is_admin: user.is_admin === 1
            }));
            res.status(200).json(users);
        });
    });

    // PUT update a user's details
    router.put('/users/:id', (req, res) => {
        const userId = req.params.id;
        const { name, score, solved, is_admin } = req.body;

        if (!name || typeof score === 'undefined' || typeof is_admin === 'undefined') {
            return res.status(400).json({ message: 'User name, score, and admin status are required.' });
        }

        const solvedJson = JSON.stringify(solved || []);
        const isAdminInt = is_admin ? 1 : 0;

        db.run('UPDATE users SET name = ?, score = ?, solved = ?, is_admin = ? WHERE id = ?',
            [name, score, solvedJson, isAdminInt, userId],
            function (err) {
                if (err) {
                    console.error('Database error updating user:', err.message);
                    return res.status(500).json({ message: 'Failed to update user.' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'User not found or no changes made.' });
                }
                res.status(200).json({ message: 'User updated successfully!' });
            }
        );
    });

    // DELETE a user
    router.delete('/users/:id', (req, res) => {
        const userId = req.params.id;
        db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
            if (err) {
                console.error('Database error deleting user:', err.message);
                return res.status(500).json({ message: 'Failed to delete user.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }
            res.status(200).json({ message: 'User deleted successfully!' });
        });
    });

    return router;
};