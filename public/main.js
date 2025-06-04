// public/main.js

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const userContent = document.getElementById('user-content');
    const registrationForm = document.getElementById('registration-form');
    const loginForm = document.getElementById('login-form');
    const authMessage = document.getElementById('auth-message');
    const logoutButton = document.getElementById('logout-button');
    const userNameSpan = document.getElementById('user-name');
    const userScoreSpan = document.getElementById('user-score');
    const challengesContainer = document.getElementById('challenges-container');
    const flagSubmissionForm = document.getElementById('flag-submission-form');
    const submissionMessage = document.getElementById('submission-message');
    const submissionChallengeIdInput = document.getElementById('submission-challenge-id');
    const solvedChallengesList = document.getElementById('solved-challenges-list');

    // NEW UI Elements for form toggling
    const loginFormContainer = document.getElementById('login-form-container');
    const registrationFormContainer = document.getElementById('registration-form-container');
    const showRegisterFormLink = document.getElementById('show-register-form');
    const showLoginFormLink = document.getElementById('show-login-form');


    // --- Helper Functions ---
    function showMessage(element, msg, type = 'error') {
        element.textContent = msg;
        element.className = `message ${type}`;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'message';
        }, 5000); // Clear message after 5 seconds
    }

    // --- Authentication and UI State ---
    async function checkUserAuth() {
        try {
            const scoreResponse = await fetch('/api/score');
            if (scoreResponse.ok) {
                const scoreData = await scoreResponse.json();
                userNameSpan.textContent = scoreData.name || 'User';
                userScoreSpan.textContent = scoreData.current_score;
                solvedChallengesList.innerHTML = '';
                (scoreData.solved_challenges || []).forEach(challengeId => {
                    const li = document.createElement('li');
                    li.textContent = challengeId;
                    solvedChallengesList.appendChild(li);
                });

                authSection.style.display = 'none';
                userContent.style.display = 'block';
                await loadChallenges();
            } else {
                authSection.style.display = 'block';
                userContent.style.display = 'none';
                // Ensure login form is visible by default when not authenticated
                loginFormContainer.style.display = 'block';
                registrationFormContainer.style.display = 'none';
                showMessage(authMessage, 'Please register or log in.', 'error');
            }
        } catch (error) {
            console.error('Error checking user auth:', error);
            authSection.style.display = 'block';
            userContent.style.display = 'none';
            // Ensure login form is visible by default on network error
            loginFormContainer.style.display = 'block';
            registrationFormContainer.style.display = 'none';
            showMessage(authMessage, 'Network error or server unavailable.', 'error');
        }
    }

    // Event listener for showing the registration form
    showRegisterFormLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        loginFormContainer.style.display = 'none';
        registrationFormContainer.style.display = 'block';
        authMessage.textContent = ''; // Clear messages when switching forms
        authMessage.className = 'message';
    });

    // Event listener for showing the login form
    showLoginFormLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        registrationFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
        authMessage.textContent = ''; // Clear messages when switching forms
        authMessage.className = 'message';
    });


    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const name = document.getElementById('register-name').value;

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name })
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(authMessage, data.message, 'success');
                registrationForm.reset();
                // Optionally switch to login form after successful registration
                loginFormContainer.style.display = 'block';
                registrationFormContainer.style.display = 'none';
            } else {
                showMessage(authMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage(authMessage, 'Network error during registration. Check server console.', 'error');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const token = document.getElementById('login-token').value;

        try {
            const response = await fetch('/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token })
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(authMessage, data.message, 'success');
                loginForm.reset(); // Clear login form fields
                checkUserAuth(); // Re-check auth status to update UI
            } else {
                showMessage(authMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage(authMessage, 'Network error during login. Check server console.', 'error');
        }
    });

    logoutButton.addEventListener('click', async () => {
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        showMessage(authMessage, 'Logged out successfully.', 'success');
        authSection.style.display = 'block';
        userContent.style.display = 'none';
        challengesContainer.innerHTML = ''; // Clear challenges on logout
        // Show login form after logout
        loginFormContainer.style.display = 'block';
        registrationFormContainer.style.display = 'none';
    });

    // --- Challenge Display ---
    async function loadChallenges() {
        try {
            const response = await fetch('/api/challenges');
            if (!response.ok) {
                throw new Error('Failed to fetch challenges: ' + response.statusText);
            }
            const challenges = await response.json();
            challengesContainer.innerHTML = ''; // Clear existing challenges

            challenges.forEach(challenge => {
                const challengeDiv = document.createElement('div');
                challengeDiv.className = 'challenge-card';
                challengeDiv.innerHTML = `
                    <h3>${challenge.title} (${challenge.points} pts)</h3>
                    <p><strong>Category:</strong> ${challenge.category}</p>
                    <p><strong>Level:</strong> ${challenge.level}</p>
                    <p>${challenge.description}</p>
                    <div class="challenge-links">
                        <strong>Links:</strong>
                        <ul id="links-${challenge.id}">
                            ${challenge.links && challenge.links.length > 0 ?
                                challenge.links.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('')
                                : '<li>No links provided.</li>'
                            }
                        </ul>
                    </div>
                    <button class="solve-button" data-challenge-id="${challenge.id}">Solve</button>
                `;
                challengesContainer.appendChild(challengeDiv);
            });

            document.querySelectorAll('.solve-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const challengeId = e.target.dataset.challengeId;
                    submissionChallengeIdInput.value = challengeId;
                    submissionMessage.textContent = '';
                });
            });

        } catch (error) {
            console.error('Error loading challenges:', error);
            showMessage(authMessage, 'Failed to load challenges.', 'error');
        }
    }

    // --- Flag Submission ---
    flagSubmissionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const challengeId = document.getElementById('submission-challenge-id').value;
        const flag = document.getElementById('submission-flag').value;

        if (!challengeId || !flag) {
            showMessage(submissionMessage, 'Challenge ID and Flag are required.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId, flag })
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(submissionMessage, data.message, 'success');
                flagSubmissionForm.reset();
                checkUserAuth();
            } else {
                showMessage(submissionMessage, data.message, 'error');
            }
        } catch (error) {
            console.error('Submission error:', error);
            showMessage(submissionMessage, 'Network error during submission. Check server console.', 'error');
        }
    });


    // Initial check on page load to determine UI state
    // This will also set the initial form visibility correctly
    checkUserAuth();
});