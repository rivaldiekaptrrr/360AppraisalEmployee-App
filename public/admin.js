// Admin Dashboard Logic

const API_User = 'api/user';
const API_Logout = 'api/logout';
const API_Employees = 'api/admin/employees';
const API_Assignments = 'api/admin/assignments';
const API_Results = 'api/admin/results';

let currentEditEmployee = null;
let allEmployees = [];
let scoreChartInstance = null;
let deptChartInstance = null;

// Custom Confirm Helper
function customConfirm(title, text, confirmBtnText = 'Ya, Hapus', isDelete = true) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');
        const titleEl = document.getElementById('confirmTitle');
        const textEl = document.getElementById('confirmText');
        const btnCancel = document.getElementById('btnConfirmCancel');
        const btnConfirm = document.getElementById('btnConfirmAction');

        titleEl.textContent = title;
        textEl.textContent = text;
        btnConfirm.textContent = confirmBtnText;

        if (isDelete) {
            btnConfirm.style.background = '#ef4444';
        } else {
            btnConfirm.style.background = 'var(--primary-color)';
        }

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

// Check admin access
async function checkAdmin() {
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
    } catch (err) {
        window.location.href = 'index.html';
    }
}

checkAdmin();

// Mobile Nav Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('show');
        const isShow = navMenu.classList.contains('show');
        navToggle.innerHTML = isShow ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
        lucide.createIcons();
    });
}

// Helper to get initials
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// Skeleton Loader Helper
function showSkeletons(container, type, count = 3) {
    container.innerHTML = '';
    if (type === 'row') {
        for (let i = 0; i < count; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="skeleton" style="width: 80%; height: 1rem;"></div></td>
                <td><div class="skeleton" style="width: 60%; height: 1rem;"></div></td>
                <td><div class="skeleton" style="width: 70%; height: 1rem;"></div></td>
                <td><div class="skeleton" style="width: 50%; height: 1rem;"></div></td>
                <td><div class="skeleton" style="width: 40px; height: 1.5rem; margin-right: 5px;"></div><div class="skeleton" style="width: 40px; height: 1.5rem;"></div></td>
            `;
            container.appendChild(tr);
        }
    } else if (type === 'card') {
        const grid = document.createElement('div');
        grid.className = container.id === 'assignmentsContainer' ? 'assignments-grid' : 'results-grid';
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'skeleton-card glass-panel';
            card.innerHTML = `
                <div class="skeleton-header">
                    <div class="skeleton skeleton-avatar"></div>
                    <div>
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-subtitle"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line-short"></div>
            `;
            grid.appendChild(card);
        }
        container.appendChild(grid);
    }
}


// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch(API_Logout, { method: 'POST' });
    window.location.href = 'index.html';
});

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');

        // Load data
        if (tab === 'summary') loadSummary();
        if (tab === 'employees') loadEmployees();
        if (tab === 'assignments') loadAssignments();
        if (tab === 'results') loadResults();
    });
});

// ===== SUMMARY / DASHBOARD =====

async function loadSummary() {
    try {
        // Fetch all data needed for stats
        const [empRes, assignRes, resultRes] = await Promise.all([
            fetch(API_Employees),
            fetch(API_Assignments),
            fetch(API_Results)
        ]);

        const employees = await empRes.json();
        const assignments = await assignRes.json();
        const results = await resultRes.json();

        allEmployees = employees; // Update global
        currentResults = results; // Update global

        // 1. Basic Stats
        const totalEmployees = employees.length;
        const totalAssignments = assignments.length;
        const completedCount = results.length;
        const progressPercent = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0;

        document.getElementById('statTotalEmployees').textContent = totalEmployees;
        document.getElementById('statTotalAssignments').textContent = totalAssignments;
        document.getElementById('statCompletedAppraisals').textContent = completedCount;
        document.getElementById('statProgress').textContent = progressPercent + '%';
        document.getElementById('statProgressBar').style.width = progressPercent + '%';

        // 2. Latest Activity (Last 5)
        const latestContainer = document.getElementById('latestActivity');
        latestContainer.innerHTML = '';

        const sortedResults = [...results].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

        if (sortedResults.length === 0) {
            latestContainer.innerHTML = '<p class="text-muted">Belum ada aktivitas.</p>';
        } else {
            sortedResults.forEach(res => {
                const date = new Date(res.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="avatar-small">${getInitials(res.reviewerName)}</div>
                    <div class="item-content">
                        <span class="item-name">${res.reviewerName} menilai ${res.targetName}</span>
                        <span class="item-meta">${date} • Skor: ${parseFloat(res.score).toFixed(1)}</span>
                    </div>
                `;
                latestContainer.appendChild(item);
            });
        }

        // 3. Top Performers (By Average Score Received)
        const topContainer = document.getElementById('topPerformers');
        topContainer.innerHTML = '';

        // Calculate average for each employee
        const employeeScores = {};
        results.forEach(res => {
            if (!employeeScores[res.targetEmail]) {
                employeeScores[res.targetEmail] = { name: res.targetName, total: 0, count: 0 };
            }
            employeeScores[res.targetEmail].total += parseFloat(res.score);
            employeeScores[res.targetEmail].count += 1;
        });

        const leaderboard = Object.values(employeeScores)
            .map(e => ({ name: e.name, avg: (e.total / e.count).toFixed(1) }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5);

        if (leaderboard.length === 0) {
            topContainer.innerHTML = '<p class="text-muted">Data belum tersedia.</p>';
        } else {
            leaderboard.forEach((user, idx) => {
                const item = document.createElement('div');
                item.className = 'list-item';
                const badgeColor = user.avg >= 4.5 ? '#10b981' : (user.avg >= 4 ? '#3b82f6' : '#f59e0b');
                item.innerHTML = `
                    <div class="item-badge" style="background: ${badgeColor}20; color: ${badgeColor}">#${idx + 1}</div>
                    <div class="item-content">
                        <span class="item-name">${user.name}</span>
                        <span class="item-meta">Rating rata-rata</span>
                    </div>
                    <div class="stats-value" style="font-size: 1.1rem; color: ${badgeColor}">${user.avg}</div>
                `;
                topContainer.appendChild(item);
            });
        }

        // 4. Update Charts
        updateCharts(results, employees);

    } catch (err) {
        console.error('Failed to load summary stats', err);
    }
}

function updateCharts(results, employees) {
    // a. Score Distribution (Doughnut)
    const scoreCounts = [0, 0, 0, 0, 0]; // 1s, 2s, 3s, 4s, 5s
    results.forEach(r => {
        const s = Math.round(parseFloat(r.score));
        if (s >= 1 && s <= 5) scoreCounts[s - 1]++;
    });

    if (scoreChartInstance) scoreChartInstance.destroy();

    const scoreCtx = document.getElementById('scoreChart').getContext('2d');
    scoreChartInstance = new Chart(scoreCtx, {
        type: 'doughnut',
        data: {
            labels: ['Skor 1', 'Skor 2', 'Skor 3', 'Skor 4', 'Skor 5'],
            datasets: [{
                data: scoreCounts,
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#047857'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // b. Department Performance (Bar)
    const deptScores = {};
    results.forEach(r => {
        const emp = employees.find(e => e.email.toLowerCase() === r.targetEmail.toLowerCase());
        const dept = emp ? (emp.department || 'Lainnya') : 'Lainnya';
        if (!deptScores[dept]) deptScores[dept] = { total: 0, count: 0 };
        deptScores[dept].total += parseFloat(r.score);
        deptScores[dept].count += 1;
    });

    const deptLabels = Object.keys(deptScores);
    const deptValues = deptLabels.map(d => (deptScores[d].total / deptScores[d].count).toFixed(2));

    if (deptChartInstance) deptChartInstance.destroy();

    const deptCtx = document.getElementById('deptChart').getContext('2d');
    deptChartInstance = new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: deptLabels,
            datasets: [{
                label: 'Rating Rata-rata',
                data: deptValues,
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'var(--primary-color)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 5 }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function exportToExcel() {
    if (currentResults.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
    }

    const data = currentResults.map(r => ({
        'Waktu': new Date(r.timestamp).toLocaleString('id-ID'),
        'Penilai': r.reviewerName,
        'Email Penilai': r.reviewerEmail,
        'Yang Dinilai': r.targetName,
        'Email Yang Dinilai': r.targetEmail,
        'Skor Akhir': parseFloat(r.score).toFixed(2),
        'Komentar': r.comment
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Penilaian");

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length, ...data.map(r => r[key] ? r[key].toString().length : 0)) + 2
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Laporan_Appraisal_360_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===== EMPLOYEES =====

async function loadEmployees() {
    const tbody = document.querySelector('#employeesTable tbody');
    showSkeletons(tbody, 'row', 5);
    try {
        const res = await fetch(API_Employees);
        allEmployees = await res.json();
        renderEmployees(allEmployees);
    } catch (err) {
        console.error('Failed to load employees', err);
    }
}

function renderEmployees(employees) {
    const tbody = document.querySelector('#employeesTable tbody');
    tbody.innerHTML = '';

    employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.email}</td>
            <td>${emp.name}</td>
            <td>${emp.position || '-'}</td>
            <td>${emp.department || '-'}</td>
            <td>
                <button class="btn-icon" onclick="editEmployee(${emp.rowIndex})"><i data-lucide="edit-2" style="width: 16px; height: 16px;"></i></button>
                <button class="btn-icon" onclick="deleteEmployee(${emp.rowIndex})"><i data-lucide="trash-2" style="width: 16px; height: 16px; color: #ef4444;"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Initialize icons for newly rendered elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Search Employee Handler
const searchEmpInput = document.getElementById('searchEmployee');
if (searchEmpInput) {
    searchEmpInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allEmployees.filter(emp =>
            emp.name.toLowerCase().includes(query) ||
            emp.email.toLowerCase().includes(query)
        );
        renderEmployees(filtered);
    });
}


document.getElementById('btnAddEmployee').addEventListener('click', () => {
    currentEditEmployee = null;
    document.getElementById('modalEmployeeTitle').textContent = 'Tambah Karyawan';
    document.getElementById('formEmployee').reset();
    document.getElementById('modalEmployee').classList.remove('hidden');
});

document.getElementById('btnCancelEmployee').addEventListener('click', () => {
    document.getElementById('modalEmployee').classList.add('hidden');
});

window.editEmployee = (rowIndex) => {
    const emp = allEmployees.find(e => e.rowIndex === rowIndex);
    if (!emp) return;

    currentEditEmployee = rowIndex;
    document.getElementById('modalEmployeeTitle').textContent = 'Edit Karyawan';
    document.getElementById('empEmail').value = emp.email;
    document.getElementById('empName').value = emp.name;
    document.getElementById('empPosition').value = emp.position || '';
    document.getElementById('empDepartment').value = emp.department || '';
    document.getElementById('empPassword').value = emp.password || '';
    document.getElementById('modalEmployee').classList.remove('hidden');
};

window.deleteEmployee = async (rowIndex) => {
    const confirmed = await customConfirm(
        'Hapus Karyawan?',
        'Seluruh data tugas dan histori penilaian karyawan ini akan hilang selamanya.'
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_Employees}/${rowIndex}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Karyawan berhasil dihapus');
            loadEmployees();
        }
    } catch (err) {
        alert('Gagal menghapus karyawan');
    }
};

document.getElementById('formEmployee').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        email: document.getElementById('empEmail').value,
        name: document.getElementById('empName').value,
        position: document.getElementById('empPosition').value,
        department: document.getElementById('empDepartment').value,
        password: document.getElementById('empPassword').value
    };

    try {
        let res;
        if (currentEditEmployee) {
            // Update
            res = await fetch(`${API_Employees}/${currentEditEmployee}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Add
            res = await fetch(API_Employees, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (res.ok) {
            showToast(currentEditEmployee ? 'Karyawan berhasil diupdate' : 'Karyawan berhasil ditambahkan');
            document.getElementById('modalEmployee').classList.add('hidden');
            loadEmployees();
        }
    } catch (err) {
        alert('Gagal menyimpan karyawan');
    }
});

// ===== ASSIGNMENTS =====

async function loadAssignments() {
    const container = document.querySelector('#assignmentsContainer');
    showSkeletons(container, 'card', 3);
    try {
        // Ensure employees are loaded for name lookup
        if (allEmployees.length === 0) {
            const resEmp = await fetch(API_Employees);
            allEmployees = await resEmp.json();
        }

        const res = await fetch(API_Assignments);
        const assignments = await res.json();

        const container = document.querySelector('#assignmentsContainer');
        container.innerHTML = '';

        // Group by Reviewer
        const grouped = {};
        assignments.forEach(a => {
            if (!grouped[a.reviewerEmail]) {
                grouped[a.reviewerEmail] = [];
            }
            grouped[a.reviewerEmail].push(a);
        });

        // Create UI for groups
        const grid = document.createElement('div');
        grid.className = 'assignments-grid';

        if (Object.keys(grouped).length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada assignment penilai.</div>';
            return;
        }

        Object.keys(grouped).forEach(reviewerEmail => {
            const reviewer = allEmployees.find(e => e.email.toLowerCase() === reviewerEmail.toLowerCase());
            const reviewerName = reviewer ? reviewer.name : reviewerEmail;
            const reviewerPos = reviewer ? (reviewer.position || 'Unknown Position') : '';

            const card = document.createElement('div');
            card.className = 'assignment-card glass-panel fade-in';

            let targetsHtml = '';
            grouped[reviewerEmail].forEach(assign => {
                const target = allEmployees.find(e => e.email.toLowerCase() === assign.targetEmail.toLowerCase());
                const targetName = target ? target.name : assign.targetEmail;

                targetsHtml += `
                    <div class="target-chip">
                        <span>${targetName}</span>
                        <button onclick="deleteAssignment(${assign.id})" class="btn-delete-chip" title="Hapus">×</button>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="assignment-header">
                    <div class="reviewer-info">
                        <div class="avatar">${getInitials(reviewerName)}</div>
                        <div>
                            <h4>${reviewerName}</h4>
                            <small>${reviewerPos}</small>
                        </div>
                    </div>
                </div>
                <div class="assignment-body">
                    <p class="label-text">Menilai:</p>
                    <div class="targets-list">
                        ${targetsHtml}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);

    } catch (err) {
        console.error('Failed to load assignments', err);
    }
}

document.getElementById('btnAddAssignment').addEventListener('click', async () => {
    // Populate dropdowns
    if (allEmployees.length === 0) {
        const res = await fetch(API_Employees);
        allEmployees = await res.json();
    }

    const reviewerSelect = document.getElementById('assignReviewer');
    const targetSelect = document.getElementById('assignTarget');

    // Reset Dropdowns
    reviewerSelect.innerHTML = '<option value="">Pilih Penilai...</option>';
    targetSelect.innerHTML = '<option value="">Pilih Yang Dinilai...</option>';
    targetSelect.disabled = true;

    // Get current assignments to filter duplicates
    const resAssign = await fetch(API_Assignments);
    const existingAssignments = await resAssign.json();

    // Populate Reviewer Dropdown
    allEmployees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.email;
        opt.textContent = `${emp.name} (${emp.department || '-'})`;
        reviewerSelect.appendChild(opt);
    });

    // Handle Reviewer Change to Filter Targets
    reviewerSelect.onchange = () => {
        const currentReviewerEmail = reviewerSelect.value;
        targetSelect.innerHTML = '<option value="">Pilih Yang Dinilai...</option>';
        targetSelect.disabled = !currentReviewerEmail;

        if (currentReviewerEmail) {
            // Find who this reviewer is ALREADY assigned to
            const assignedTargets = existingAssignments
                .filter(a => a.reviewerEmail.toLowerCase() === currentReviewerEmail.toLowerCase())
                .map(a => a.targetEmail.toLowerCase());

            // Filter available targets
            // Rule: Target != Reviewer AND Target is NOT in assignedTargets
            const availableTargets = allEmployees.filter(emp => {
                const isSelf = emp.email.toLowerCase() === currentReviewerEmail.toLowerCase();
                const isAlreadyAssigned = assignedTargets.includes(emp.email.toLowerCase());
                return !isSelf && !isAlreadyAssigned;
            });

            availableTargets.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.email;
                opt.textContent = `${emp.name} (${emp.department || '-'})`;
                targetSelect.appendChild(opt);
            });

            if (availableTargets.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = "-- Tidak ada target tersedia --";
                opt.disabled = true;
                targetSelect.appendChild(opt);
            }
        }
    };

    document.getElementById('modalAssignment').classList.remove('hidden');
});

document.getElementById('btnCancelAssignment').addEventListener('click', () => {
    document.getElementById('modalAssignment').classList.add('hidden');
});

document.getElementById('formAssignment').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        reviewerEmail: document.getElementById('assignReviewer').value,
        targetEmail: document.getElementById('assignTarget').value
    };

    if (data.reviewerEmail === data.targetEmail) {
        alert('Penilai dan yang dinilai tidak boleh sama!');
        return;
    }

    try {
        const res = await fetch(API_Assignments, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showToast('Assignment berhasil ditambahkan');
            document.getElementById('modalAssignment').classList.add('hidden');
            loadAssignments();
        }
    } catch (err) {
        alert('Gagal menambahkan assignment');
    }
});

window.deleteAssignment = async (rowIndex) => {
    const confirmed = await customConfirm(
        'Hapus Assignment?',
        'Tugas penilaian ini akan dihapus dari dashboard karyawan yang bersangkutan.'
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_Assignments}/${rowIndex}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Assignment berhasil dihapus');
            loadAssignments();
        }
    } catch (err) {
        alert('Gagal menghapus assignment');
    }
};

// ===== RESULTS =====

let currentResults = [];

async function loadResults() {
    const container = document.querySelector('#resultsContainer');
    showSkeletons(container, 'card', 3);
    try {
        const res = await fetch(API_Results);
        currentResults = await res.json();

        // Sort: Newest first (Descending)
        currentResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        renderResults(currentResults);
    } catch (err) {
        console.error('Failed to load results', err);
    }
}

function renderResults(results) {
    const container = document.querySelector('#resultsContainer');
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada hasil penilaian yang ditemukan.</div>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'results-grid';

    results.forEach(result => {
        const date = new Date(result.timestamp).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Helper to format score
        const scoreNum = parseFloat(result.score).toFixed(1);

        // Calculate stars width percentage
        const starPercentage = (parseFloat(scoreNum) / 5) * 100;
        const scoreColor = parseFloat(scoreNum) >= 4 ? 'text-green' : (parseFloat(scoreNum) >= 3 ? 'text-yellow' : 'text-red');

        // Parse comment to hide details in main view
        let displayComment = result.comment || 'Tidak ada komentar';
        if (displayComment.includes('[DETAILS]')) {
            displayComment = displayComment.split('[DETAILS]')[0].trim();
        }
        if (!displayComment) displayComment = 'Tidak ada komentar tertulis';

        // Truncate comment if too long
        if (displayComment.length > 50) {
            displayComment = displayComment.substring(0, 50) + '...';
        }

        const card = document.createElement('div');
        card.className = 'result-card glass-panel fade-in';
        card.innerHTML = `
            <div class="result-header">
                <div class="result-actors">
                    <div class="actor-group">
                        <small class="role-label">Penilai</small>
                        <div class="actor">
                            <div class="avatar-small">${getInitials(result.reviewerName)}</div>
                            <span class="actor-name">${result.reviewerName}</span>
                        </div>
                    </div>
                    <div class="connector-line"></div>
                    <div class="actor-group">
                        <small class="role-label">Dinilai</small>
                        <div class="actor">
                            <div class="avatar-small">${getInitials(result.targetName)}</div>
                            <span class="actor-name">${result.targetName}</span>
                        </div>
                    </div>
                </div>
                <div class="score-badge ${scoreColor}">
                    <span class="score-num">${scoreNum}</span>
                    <div class="score-stars">
                        <div class="stars-outer">
                            <div class="stars-inner" style="width: ${starPercentage}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="result-body">
                <p class="comment-text">"${displayComment}"</p>
            </div>
            <div class="result-footer">
                <small class="timestamp" style="display:flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width: 12px; height: 12px;"></i> ${date}</small>
                <div class="card-actions">
                    <button class="btn-view-detail" onclick="viewResultDetail(${result.rowIndex})">View Detail</button>
                    <button class="btn-icon-delete" onclick="deleteResult(${result.rowIndex})" title="Hapus Penilaian"><i data-lucide="trash-2" style="width: 16px; height: 16px; color: #ef4444;"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
    
    // Initialize icons for newly rendered elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Global function to view details
window.viewResultDetail = function (rowIndex) {
    const result = currentResults.find(r => r.rowIndex === rowIndex);
    if (!result) return;

    // Parse Comment for Details
    // Format: "User Comment... \n\n[DETAILS] Communication: 5 | Teamwork: 4..."
    let rawComment = result.comment || '';
    let userComment = rawComment;
    let detailsString = '';

    if (rawComment.includes('[DETAILS]')) {
        const parts = rawComment.split('[DETAILS]');
        userComment = parts[0].trim();
        detailsString = parts[1].trim();
    }

    if (!userComment) userComment = '-';

    // Populate Actors
    const actorsDiv = document.getElementById('detailActors');
    actorsDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <small class="role-label">Penilai</small> 
                <strong>${result.reviewerName}</strong>
            </div>
            <div>➜</div>
             <div>
                <small class="role-label">Dinilai</small> 
                <strong>${result.targetName}</strong>
            </div>
             <div class="score-badge">
                <span class="score-num" style="font-size: 1.2rem;">${result.score}</span>
            </div>
        </div>
    `;

    // Populate Scores Grid
    const scoresDiv = document.getElementById('detailScores');
    scoresDiv.innerHTML = '';

    if (detailsString) {
        const cats = detailsString.split('|');
        cats.forEach(cat => {
            const [label, score] = cat.split(':').map(s => s.trim());
            // Render logic
            const scoreVal = parseInt(score);
            const scoreColor = scoreVal >= 4 ? '#10b981' : (scoreVal >= 3 ? '#f59e0b' : '#ef4444');

            const item = document.createElement('div');
            item.className = 'score-item';
            item.innerHTML = `
                <span class="score-label">${label}</span>
                <span class="score-value" style="color: ${scoreColor}">${score}</span>
            `;
            scoresDiv.appendChild(item);
        });
    } else {
        scoresDiv.innerHTML = '<p class="text-muted">Data detail kompetensi tidak tersedia (Format lama).</p>';
    }

    // Populate Comment
    document.getElementById('detailCommentText').textContent = userComment;

    // Show Modal
    document.getElementById('modalResultDetail').classList.remove('hidden');
};

// Search Filter Handler
const searchInput = document.getElementById('searchReviewer');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = currentResults.filter(r =>
            r.reviewerName.toLowerCase().includes(query)
        );
        renderResults(filtered);
    });
}

window.deleteResult = async (rowIndex) => {
    const confirmed = await customConfirm(
        'Hapus Hasil Penilaian?',
        'Data nilai ini akan dihapus dari database hasil penilaian.'
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_Results}/${rowIndex}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Hasil penilaian berhasil dihapus');
            loadResults();
        }
    } catch (err) {
        alert('Gagal menghapus hasil penilaian');
    }
};

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Initial load
loadSummary();

// Bind Export Button
if (document.getElementById('btnExportExcel')) {
    document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
}
