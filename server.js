const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const sheets = require('./sheets');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true
}));

// Check configuration on startup
const CREDENTIALS_EXISTS = fs.existsSync(path.join(__dirname, 'service_account.json'));
const SPREADSHEET_CONFIGURED = process.env.SPREADSHEET_ID && !process.env.SPREADSHEET_ID.includes('replace_with');

const IS_MOCKED = !CREDENTIALS_EXISTS || !SPREADSHEET_CONFIGURED;

if (IS_MOCKED) {
    console.warn("=================================================");
    console.warn("⚠️ WARNING: Configuration missing!");
    if (!CREDENTIALS_EXISTS) console.warn(" - service_account.json not found.");
    if (!SPREADSHEET_CONFIGURED) console.warn(" - SPREADSHEET_ID not set in .env.");
    console.warn(" Running in MOCK DATA mode.");
    console.warn("=================================================");
}

// Normal Routes

    // Check if user is logged in
    function requireLogin(req, res, next) {
        if (req.session.userEmail) {
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    }

    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        try {
            const employees = await sheets.getEmployees();
            const user = employees.find(e => e.email.toLowerCase() === email.toLowerCase());

            // Check if admin
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
            const isAdmin = adminEmails.includes(email.toLowerCase());

            if (isAdmin) {
                // Admin login - check admin password
                const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

                if (!password) {
                    return res.status(400).json({ error: 'Password is required' });
                }

                if (password === adminPassword) {
                    req.session.userEmail = email;
                    req.session.userName = 'Admin';
                    req.session.isAdmin = true;
                    return res.json({
                        success: true,
                        user: { email, name: 'Admin' },
                        isAdmin: true
                    });
                } else {
                    return res.status(401).json({ error: 'Invalid admin password' });
                }
            } else if (user) {
                // Regular user - check password
                if (!password) {
                    return res.status(400).json({ error: 'Password is required' });
                }

                if (user.password && user.password === password) {
                    req.session.userEmail = user.email;
                    req.session.userName = user.name;
                    req.session.isAdmin = false;
                    return res.json({
                        success: true,
                        user: { email: user.email, name: user.name },
                        isAdmin: false
                    });
                } else {
                    return res.status(401).json({ error: 'Invalid password' });
                }
            } else {
                return res.status(401).json({ error: 'Email not found in employee list' });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error: ' + error.message });
        }
    });

    app.get('/api/user', (req, res) => {
        if (req.session.userEmail) {
            res.json({ email: req.session.userEmail, name: req.session.userName });
        } else {
            res.status(401).json({ error: 'Not logged in' });
        }
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy();
        res.json({ success: true });
    });

    app.get('/api/assignments', requireLogin, async (req, res) => {
        try {
            const reviewerEmail = req.session.userEmail;
            const assignedEmails = await sheets.getAssignments(reviewerEmail);
            const completedEmails = await sheets.getCompletedAppraisals(reviewerEmail);
            const allEmployees = await sheets.getEmployees();

            // Filter out already completed appraisals
            const pendingEmails = assignedEmails.filter(email => {
                return !completedEmails.some(completed =>
                    completed && email && completed.toLowerCase() === email.toLowerCase()
                );
            });

            // Map pending emails to full employee details
            const assignedEmployees = pendingEmails.map(email => {
                return allEmployees.find(e => e.email.toLowerCase() === email.toLowerCase());
            }).filter(e => e); // Filter out undefined

            // --- SELF APPRAISAL LOGIC ---
            // Check if user has already appraised themselves
            const hasDoneSelfAppraisal = completedEmails.some(email =>
                email && email.toLowerCase() === reviewerEmail.toLowerCase()
            );

            // If not done, add self to the list
            if (!hasDoneSelfAppraisal) {
                const selfDetails = allEmployees.find(e => e.email.toLowerCase() === reviewerEmail.toLowerCase());
                if (selfDetails) {
                    // Prepend self to the list so it appears at top
                    assignedEmployees.unshift({
                        ...selfDetails,
                        name: `${selfDetails.name} (Self Appraisal)`
                    });
                }
            }

            // Recalculate totals including self appraisal if applicable
            // Total tasks = Assigned by admin + 1 (self)
            // But wait, if self is already in assignedEmails (admin assigned self explicitly), we shouldn't double count.
            // The check above `hasDoneSelfAppraisal` only checks if it is done.
            // Let's refine:
            // If admin DID assign user to themselves, `assignedEmails` includes it. 
            // `pendingEmails` includes it if not done.
            // `assignedEmployees` includes it.
            // So we only need to add it if it is NOT in `assignedEmails` list from sheet.

            const adminAssignedSelf = assignedEmails.some(e => e.toLowerCase() === reviewerEmail.toLowerCase());

            if (!adminAssignedSelf && !hasDoneSelfAppraisal) {
                // We already added it to assignedEmployees above.
                // We need to adjust the total count returned to frontend.
            }

            // Actually, simplified logic:
            // 1. Get list of pending assignments from sheet.
            // 2. Add Self if not present in pending and not completed.

            // Re-evaluating previous unshift approach:
            // If I just unshifted it, `assignedEmployees` has it.
            // But `assignedEmails.length` (total from sheet) does not account for it.

            let totalTasks = assignedEmails.length;
            let completedTasks = assignedEmails.length - pendingEmails.length;

            if (!adminAssignedSelf) {
                // If not assigned by admin, we treat it as an extra implicit task
                totalTasks += 1;
                if (hasDoneSelfAppraisal) {
                    completedTasks += 1;
                }
            }

            res.json({
                total: totalTasks,
                completed: completedTasks,
                pending: assignedEmployees
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch assignments' });
        }
    });

    app.post('/api/submit', requireLogin, async (req, res) => {
        const { targetEmail, score, comment } = req.body;
        if (!targetEmail || !score) return res.status(400).json({ error: 'Missing required fields' });

        // Validate self-appraisal (ALLOWED now per request #8)
        const isSelfAppraisal = targetEmail.toLowerCase() === req.session.userEmail.toLowerCase();

        try {
            // Validate assignment
            // If it is self appraisal, we might not have an explicit assignment in the sheet, 
            // BUT we want to allow it.
            // Let's check if they are assigned OR if it is self.

            const assignments = await sheets.getAssignments(req.session.userEmail);
            const isAssigned = assignments.some(email => email.toLowerCase() === targetEmail.toLowerCase());

            if (!isAssigned && !isSelfAppraisal) {
                return res.status(403).json({ error: 'You are not assigned to appraise this person' });
            }

            const allEmployees = await sheets.getEmployees();
            const target = allEmployees.find(e => e.email.toLowerCase() === targetEmail.toLowerCase());

            if (!target) return res.status(404).json({ error: 'Target employee not found' });

            await sheets.saveAppraisal({
                reviewerEmail: req.session.userEmail,
                reviewerName: req.session.userName,
                targetEmail: target.email,
                targetName: target.name,
                score,
                comment: comment || ''
            });

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to submit appraisal' });
        }
    });

    // Admin Middleware
    function requireAdmin(req, res, next) {
        if (req.session.isAdmin) {
            next();
        } else {
            res.status(403).json({ error: 'Admin access required' });
        }
    }

    // Admin API - Get all employees with row index
    app.get('/api/admin/employees', requireAdmin, async (req, res) => {
        try {
            const employees = await sheets.getEmployees();
            const employeesWithIndex = employees.map((emp, index) => ({
                ...emp,
                rowIndex: index + 2 // +2 because row 1 is header, array starts at 0
            }));
            res.json(employeesWithIndex);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    });

    // Admin API - Add employee
    app.post('/api/admin/employees', requireAdmin, async (req, res) => {
        try {
            const { email, name, position, department, password } = req.body;
            if (!email || !name) return res.status(400).json({ error: 'Email and name required' });

            await sheets.addEmployee({ email, name, position, department, password });
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to add employee' });
        }
    });

    // Admin API - Update employee
    app.put('/api/admin/employees/:rowIndex', requireAdmin, async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            const { email, name, position, department, password } = req.body;
            if (!email || !name) return res.status(400).json({ error: 'Email and name required' });

            await sheets.updateEmployee(rowIndex, { email, name, position, department, password });
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update employee' });
        }
    });

    // Admin API - Delete employee
    app.delete('/api/admin/employees/:rowIndex', requireAdmin, async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            await sheets.deleteEmployee(rowIndex);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete employee' });
        }
    });

    // Admin API - Get all assignments
    app.get('/api/admin/assignments', requireAdmin, async (req, res) => {
        try {
            const assignments = await sheets.getAllAssignments();
            res.json(assignments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch assignments' });
        }
    });

    // Admin API - Add assignment
    app.post('/api/admin/assignments', requireAdmin, async (req, res) => {
        try {
            const { reviewerEmail, targetEmail } = req.body;
            if (!reviewerEmail || !targetEmail) {
                return res.status(400).json({ error: 'Reviewer and target email required' });
            }

            await sheets.addAssignment({ reviewerEmail, targetEmail });
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to add assignment' });
        }
    });

    // Admin API - Delete assignment
    app.delete('/api/admin/assignments/:rowIndex', requireAdmin, async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            await sheets.deleteAssignment(rowIndex);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete assignment' });
        }
    });

    // Admin API - Get appraisal results
    app.get('/api/admin/results', requireAdmin, async (req, res) => {
        try {
            const results = await sheets.getAppraisalResults();
            res.json(results);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch results' });
        }
    });

    // Admin API - Delete appraisal result
    app.delete('/api/admin/results/:rowIndex', requireAdmin, async (req, res) => {
        try {
            const rowIndex = parseInt(req.params.rowIndex);
            await sheets.deleteAppraisal(rowIndex);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete appraisal' });
        }
    });


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
