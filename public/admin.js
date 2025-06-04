// public/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const adminContent = document.getElementById('admin-content');
    const adminLoginForm = document.getElementById('admin-login-form');
    const authMessage = document.getElementById('auth-message');
    const logoutButton = document.getElementById('logout-button');

    // Challenge Management Elements
    const addChallengeForm = document.getElementById('add-challenge-form');
    const addChallengeMessage = document.getElementById('add-challenge-message');
    const challengesTableBody = document.querySelector('#challenges-table tbody');
    const challengeActionMessage = document.getElementById('challenge-action-message');
    const challengeLinksInput = document.getElementById('challenge-links'); // NEW

    // Challenge Edit Modal Elements
    const editChallengeModal = document.getElementById('edit-challenge-modal');
    const closeChallengeModalButton = editChallengeModal.querySelector('.close-button');
    const editChallengeForm = document.getElementById('edit-challenge-form');
    const editChallengeIdInput = document.getElementById('edit-challenge-id');
    const editChallengeTitleInput = document.getElementById('edit-challenge-title');
    const editChallengeDescriptionInput = document.getElementById('edit-challenge-description');
    const editChallengePointsInput = document.getElementById('edit-challenge-points');
    const editChallengeLevelSelect = document.getElementById('edit-challenge-level');
    const editChallengeCategorySelect = document.getElementById('edit-challenge-category');
    const editChallengeLinksInput = document.getElementById('edit-challenge-links'); // NEW
    const editChallengeFlagInput = document.getElementById('edit-challenge-flag');
    const editChallengeMessage = document.getElementById('edit-challenge-message');

    // User Management Elements (unchanged)
    const usersTableBody = document.querySelector('#users-table tbody');
    const userActionMessage = document.getElementById('user-action-message');
    const editUserModal = document.getElementById('edit-user-modal');
    const closeUserModalButton = editUserModal.querySelector('.close-button');
    const editUserForm = document.getElementById('edit-user-form');
    const editUserIdInput = document.getElementById('edit-user-id');
    const editUserEmailInput = document.getElementById('edit-user-email');
    const editUserNameInput = document.getElementById('edit-user-name');
    const editUserScoreInput = document.getElementById('edit-user-score');
    const editUserSolvedInput = document.getElementById('edit-user-solved');
    const editUserIsAdminCheckbox = document.getElementById('edit-user-is-admin');
    const editUserMessage = document.getElementById('edit-user-message');


    // --- Helper Functions ---

    function showMessage(element, msg, type = 'error') {
        element.textContent = msg;
        element.className = `message ${type}`;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'message';
        }, 5000); // Clear message after 5 seconds
    }

    async function checkAdminAuth() {
        try {
            const response = await fetch('/admin/challenges'); // Use any protected admin route
            if (response.ok) {
                authSection.style.display = 'none';
                adminContent.style.display = 'block';
                await loadChallenges();
                await loadUsers();
            } else {
                authSection.style.display = 'block';
                adminContent.style.display = 'none';
                showMessage(authMessage, 'Please log in as admin.', 'error');
            }
        } catch (error) {
            console.error('Error checking admin auth:', error);
            authSection.style.display = 'block';
            adminContent.style.display = 'none';
            showMessage(authMessage, 'Network error or server unavailable.', 'error');
        }
    }

    // --- Admin Login ---

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const token = document.getElementById('admin-token').value;

        try {
            const response = await fetch('/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token })
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(authMessage, data.message, 'success');
                checkAdminAuth();
            } else {
                showMessage(authMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage(authMessage, 'Network error during login. Check server console.', 'error');
        }
    });

    // --- Logout ---

    logoutButton.addEventListener('click', async () => {
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        showMessage(authMessage, 'Logged out successfully.', 'success');
        authSection.style.display = 'block';
        adminContent.style.display = 'none';
    });


    // --- Challenge Management Functions ---

    async function loadChallenges() {
        try {
            const response = await fetch('/admin/challenges');
            if (!response.ok) {
                throw new Error('Failed to fetch challenges: ' + response.statusText);
            }
            const challenges = await response.json();
            challengesTableBody.innerHTML = ''; // Clear existing rows

            challenges.forEach(challenge => {
                const row = challengesTableBody.insertRow();
                row.innerHTML = `
                    <td>${challenge.id}</td>
                    <td>${challenge.title}</td>
                    <td>${challenge.points}</td>
                    <td>${challenge.level}</td>
                    <td>${challenge.category}</td>
                    <td>${challenge.links || 'N/A'}</td> <td>
                        <button class="edit-button" data-id="${challenge.id}">Edit</button>
                        <button class="delete-button" data-id="${challenge.id}">Delete</button>
                    </td>
                `;
            });
            document.querySelectorAll('#challenges-table .edit-button').forEach(button => {
                button.onclick = (e) => openEditChallengeModal(e.target.dataset.id);
            });
            document.querySelectorAll('#challenges-table .delete-button').forEach(button => {
                button.onclick = (e) => deleteChallenge(e.target.dataset.id);
            });

        } catch (error) {
            console.error('Error loading challenges:', error);
            showMessage(challengeActionMessage, 'Failed to load challenges.', 'error');
        }
    }

    addChallengeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const challenge = {
            id: document.getElementById('challenge-id').value,
            title: document.getElementById('challenge-title').value,
            description: document.getElementById('challenge-description').value,
            points: parseInt(document.getElementById('challenge-points').value),
            level: document.getElementById('challenge-level').value,
            category: document.getElementById('challenge-category').value,
            links: JSON.stringify(challengeLinksInput.value), // NEW: Get links value
            flag: document.getElementById('challenge-flag').value
        };

        try {
            const response = await fetch('/admin/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(challenge)
            });
            const data = await response.json();
            if (response.ok) {
                showMessage(addChallengeMessage, data.message, 'success');
                addChallengeForm.reset();
                loadChallenges();
            } else {
                showMessage(addChallengeMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Error adding challenge:', error);
            showMessage(addChallengeMessage, 'Network error during adding challenge.', 'error');
        }
    });

    async function deleteChallenge(id) {
        if (!confirm(`Are you sure you want to delete challenge ${id}?`)) {
            return;
        }
        try {
            const response = await fetch(`/admin/challenges/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (response.ok) {
                showMessage(challengeActionMessage, data.message, 'success');
                loadChallenges();
            } else {
                showMessage(challengeActionMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting challenge:', error);
            showMessage(challengeActionMessage, 'Network error during deleting challenge.', 'error');
        }
    }

    function openEditChallengeModal(id) {
        fetch(`/admin/challenges`)
            .then(res => res.json())
            .then(challenges => {
                const challenge = challenges.find(c => c.id === id);
                if (challenge) {
                    editChallengeIdInput.value = challenge.id;
                    editChallengeTitleInput.value = challenge.title;
                    editChallengeDescriptionInput.value = challenge.description;
                    editChallengePointsInput.value = challenge.points;
                    editChallengeLevelSelect.value = challenge.level;
                    editChallengeCategorySelect.value = challenge.category;
                    editChallengeLinksInput.value = challenge.links || ''; // NEW: Populate links
                    editChallengeFlagInput.value = ''; // Flag is not returned, clear for new input
                    editChallengeModal.style.display = 'block';
                } else {
                    showMessage(challengeActionMessage, 'Challenge not found for editing.', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching challenge for edit:', error);
                showMessage(challengeActionMessage, 'Error loading challenge data for edit.', 'error');
            });
    }

    closeChallengeModalButton.addEventListener('click', () => {
        editChallengeModal.style.display = 'none';
        editChallengeForm.reset();
        editChallengeMessage.textContent = '';
    });

    editChallengeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editChallengeIdInput.value;
        const updatedChallenge = {
            title: editChallengeTitleInput.value,
            description: editChallengeDescriptionInput.value,
            points: parseInt(editChallengePointsInput.value),
            level: editChallengeLevelSelect.value,
            category: editChallengeCategorySelect.value,
            links: editChallengeLinksInput.value, // NEW: Include links
            flag: editChallengeFlagInput.value // Send new plaintext flag to be re-hashed
        };

        // Only send flag if it's not empty, otherwise don't update it (keep existing hash)
        if (updatedChallenge.flag === '') {
            delete updatedChallenge.flag; // Remove flag property if empty
        }


        try {
            const response = await fetch(`/admin/challenges/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedChallenge)
            });
            const data = await response.json();
            if (response.ok) {
                showMessage(editChallengeMessage, data.message, 'success');
                editChallengeModal.style.display = 'none';
                loadChallenges();
            } else {
                showMessage(editChallengeMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Error updating challenge:', error);
            showMessage(editChallengeMessage, 'Network error during updating challenge.', 'error');
        }
    });

    // --- User Management Functions (unchanged for this request) ---

    async function loadUsers() {
        try {
            const response = await fetch('/admin/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users: ' + response.statusText);
            }
            const users = await response.json();
            usersTableBody.innerHTML = '';

            users.forEach(user => {
                const row = usersTableBody.insertRow();
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.email}</td>
                    <td>${user.name}</td>
                    <td>${user.score}</td>
                    <td>${user.solved.join(', ') || 'None'}</td>
                    <td>${user.is_admin ? 'Yes' : 'No'}</td>
                    <td>
                        <button class="edit-user-button" data-id="${user.id}">Edit</button>
                        <button class="delete-user-button" data-id="${user.id}">Delete</button>
                    </td>
                `;
            });
            document.querySelectorAll('#users-table .edit-user-button').forEach(button => {
                button.onclick = (e) => openEditUserModal(e.target.dataset.id);
            });
            document.querySelectorAll('#users-table .delete-user-button').forEach(button => {
                button.onclick = (e) => deleteUser(e.target.dataset.id);
            });

        } catch (error) {
            console.error('Error loading users:', error);
            showMessage(userActionMessage, 'Failed to load users.', 'error');
        }
    }

    async function deleteUser(id) {
        if (!confirm(`Are you sure you want to delete user ${id}?`)) {
            return;
        }
        try {
            const response = await fetch(`/admin/users/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (response.ok) {
                showMessage(userActionMessage, data.message, 'success');
                loadUsers();
            } else {
                showMessage(userActionMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showMessage(userActionMessage, 'Network error during deleting user.', 'error');
        }
    }

    function openEditUserModal(id) {
        fetch(`/admin/users`)
            .then(res => res.json())
            .then(users => {
                const user = users.find(u => u.id == id);
                if (user) {
                    editUserIdInput.value = user.id;
                    editUserEmailInput.value = user.email;
                    editUserNameInput.value = user.name;
                    editUserScoreInput.value = user.score;
                    editUserSolvedInput.value = user.solved.join(', ');
                    editUserIsAdminCheckbox.checked = user.is_admin;
                    editUserModal.style.display = 'block';
                } else {
                    showMessage(userActionMessage, 'User not found for editing.', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching user for edit:', error);
                showMessage(userActionMessage, 'Error loading user data for edit.', 'error');
            });
    }

    closeUserModalButton.addEventListener('click', () => {
        editUserModal.style.display = 'none';
        editUserForm.reset();
        editUserMessage.textContent = '';
    });

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editUserIdInput.value;
        const updatedUser = {
            name: editUserNameInput.value,
            score: parseInt(editUserScoreInput.value),
            solved: editUserSolvedInput.value.split(',').map(s => s.trim()).filter(s => s !== ''),
            is_admin: editUserIsAdminCheckbox.checked
        };

        try {
            const response = await fetch(`/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUser)
            });
            const data = await response.json();
            if (response.ok) {
                showMessage(editUserMessage, data.message, 'success');
                editUserModal.style.display = 'none';
                loadUsers();
            } else {
                showMessage(editUserMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showMessage(editUserMessage, 'Network error during updating user.', 'error');
        }
    });


    // Initial check on page load
    checkAdminAuth();
});