// Client-side logic

const API_Login = '/api/login';
const API_User = '/api/user';
const API_Assignments = '/api/assignments';
const API_Submit = '/api/submit';
const API_Logout = '/api/logout';

let assignments = [];

// Custom Confirm Helper
function customConfirm(title, text, confirmBtnText = 'Ya, Kirim') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');

        // Failsafe: Fallback to native confirm if modal DOM is missing
        if (!modal) {
            console.warn('Modal confirm not found, falling back to native confirm');
            return resolve(confirm(`${title}\n\n${text}`));
        }

        const titleEl = document.getElementById('confirmTitle');
        const textEl = document.getElementById('confirmText');
        const btnCancel = document.getElementById('btnConfirmCancel');
        const btnConfirm = document.getElementById('btnConfirmAction');

        titleEl.textContent = title;
        textEl.textContent = text;
        modal.classList.remove('hidden');

        const cleanup = (result) => {
            modal.classList.add('hidden');
            btnCancel.removeEventListener('click', onCancel);
            btnConfirm.removeEventListener('click', onConfirm);
            resolve(result);
        };

        const onCancel = () => cleanup(false);
        const onConfirm = () => cleanup(true);

        btnCancel.addEventListener('click', onCancel);
        btnConfirm.addEventListener('click', onConfirm);
    });
}

// -- Login Logic --
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // UI State
        loginBtn.disabled = true;
        loginBtn.querySelector('span').classList.add('hidden');
        loginBtn.querySelector('.loader').classList.remove('hidden');
        errorMsg.classList.add('hidden');

        try {
            const res = await fetch(API_Login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                // Redirect based on role
                if (data.isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                errorMsg.textContent = data.error || 'Login failed';
                errorMsg.classList.remove('hidden');
            }
        } catch (err) {
            errorMsg.textContent = 'Connection error';
            errorMsg.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.querySelector('span').classList.remove('hidden');
            loginBtn.querySelector('.loader').classList.add('hidden');
        }
    });
}

// -- Dashboard Logic --
if (document.querySelector('.dashboard-body')) {
    // Init
    checkUser();
    checkOnboarding();

    // Mobile Nav Toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            navToggle.textContent = navMenu.classList.contains('show') ? '✕' : '☰';
        });
    }

    function getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    window.closeOnboarding = function () {
        document.getElementById('modalOnboarding').classList.add('hidden');
        localStorage.setItem('onboarding_seen', 'true');
    };

    function checkOnboarding() {
        const modal = document.getElementById('modalOnboarding');
        const seen = localStorage.getItem('onboarding_seen');

        if (modal && !seen) {
            modal.classList.remove('hidden');
        }
    }

    async function checkUser() {
        try {
            const res = await fetch(API_User);
            if (!res.ok) {
                window.location.href = 'index.html';
                return;
            }
            const user = await res.json();
            const name = user.name || user.email;
            document.getElementById('userName').textContent = name;

            // Set Avatar
            const avatar = document.getElementById('userAvatar');
            if (avatar) {
                avatar.textContent = getInitials(name);
                avatar.classList.remove('hidden');
            }

            loadAssignments();
        } catch (err) {
            window.location.href = 'index.html';
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch(API_Logout, { method: 'POST' });
        window.location.href = 'index.html';
    });

    async function loadAssignments() {
        const loading = document.getElementById('loadingAssignments');
        const empty = document.getElementById('emptyState');
        const form = document.getElementById('appraisalForm');

        loading.classList.remove('hidden');
        empty.classList.add('hidden');
        form.classList.add('hidden');

        try {
            const res = await fetch(API_Assignments);
            const data = await res.json();

            // Handle new object format
            if (data.pending) {
                assignments = data.pending;
                updateProgressBar(data.completed, data.total);
            } else {
                // Fallback for array
                assignments = data;
            }

            const select = document.getElementById('targetSelect');

            // Reset select
            select.innerHTML = '<option value="" disabled selected>Choose a colleague...</option>';

            loading.classList.add('hidden');

            if (assignments.length === 0) {
                empty.classList.remove('hidden');
                form.classList.add('hidden');
            } else {
                empty.classList.add('hidden');
                form.classList.remove('hidden');
                // Populate Dropdown
                assignments.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.email;
                    opt.textContent = `${emp.name} (${emp.position})`;
                    select.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load assignments', err);
        }
    }

    function updateProgressBar(completed, total) {
        const progressSection = document.getElementById('progressSection');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (!progressSection) return;

        if (total === 0) {
            progressSection.classList.add('hidden');
            return;
        }

        progressSection.classList.remove('hidden');
        const percent = Math.round((completed / total) * 100);
        progressBar.style.width = percent + '%';
        progressText.textContent = `${completed}/${total} Selesai`;

        // Success Animation (Confetti)
        if (percent === 100 && completed > 0) {
            const lastPercent = sessionStorage.getItem('last_percent');
            if (lastPercent !== '100') {
                triggerConfetti();
                sessionStorage.setItem('last_percent', '100');
            }
        } else {
            sessionStorage.removeItem('last_percent');
        }
    }

    function triggerConfetti() {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }

    // Handle Selection Change
    const targetSelect = document.getElementById('targetSelect');
    const employeeInfo = document.getElementById('employeeInfo');
    const empPosition = document.getElementById('empPosition');
    const empDept = document.getElementById('empDept');

    targetSelect.addEventListener('change', (e) => {
        const email = e.target.value;
        const emp = assignments.find(a => a.email === email);
        if (emp) {
            employeeInfo.classList.remove('hidden');
            empPosition.textContent = emp.position || '-';
            empDept.textContent = emp.department || '-';
        }
    });

    // Handle Submit
    const appraisalForm = document.getElementById('appraisalForm');
    appraisalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const confirmed = await customConfirm(
            'Kirim Penilaian?',
            'Anda akan mengirimkan nilai untuk rekan kerja ini. Data tidak dapat diubah setelah dikirim.'
        );
        if (!confirmed) return;

        const targetEmail = targetSelect.value;
        const userComment = document.getElementById('comment').value;

        // Collect all scores
        const criteria = [
            'c_communication', 'c_teamwork', 'c_quality', 'c_accountability',
            'c_integrity', 'c_problem_solving', 'c_initiative', 'c_time_management',
            'c_adaptability', 'c_technical'
        ];

        const scores = {};
        let totalScore = 0;
        let count = 0;
        let allUnanswered = [];

        criteria.forEach(c => {
            const input = document.querySelector(`input[name="${c}"]:checked`);
            if (input) {
                const val = Number(input.value);
                scores[c] = val;
                totalScore += val;
                count++;
            } else {
                allUnanswered.push(c);
            }
        });

        if (allUnanswered.length > 0) {
            alert('Harap lengkapi semua poin penilaian (1-10).');
            // Scroll to first unanswered
            const firstUn = document.querySelector(`input[name="${allUnanswered[0]}"]`);
            if (firstUn) firstUn.closest('.criteria-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Calculate Average (1 decimal place)
        console.log('Calculating Score:', { totalScore, count });
        const rawAvg = totalScore / count;
        const averageScore = parseFloat(rawAvg.toFixed(1));
        console.log('Final Average:', averageScore);

        // Format details for storage in comment (since DB only supports 1 comment field)
        // Format: "User Comment... \n\n[DETAILED SCORES]\nCommunication: 5\n..."
        const scoreDetails = criteria.map(c => {
            // Convert 'c_communication' -> 'Communication'
            const label = c.replace('c_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${label}: ${scores[c]}`;
        }).join(' | ');

        const finalComment = `${userComment}\n\n[DETAILS] ${scoreDetails}`;

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Submitting...';

        try {
            const res = await fetch(API_Submit, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetEmail,
                    score: averageScore, // Save average as the main score
                    comment: finalComment
                })
            });

            if (res.ok) {
                showToast();
                // Reset form
                appraisalForm.reset();
                employeeInfo.classList.add('hidden');
                // Refresh assignments to update progress
                loadAssignments();
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const err = await res.json();
                alert(err.error || 'Submission failed');
            }
        } catch (err) {
            alert('Error submitting');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Submit Appraisal';
        }
    });

    function showToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
}
