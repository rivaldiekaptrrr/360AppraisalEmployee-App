const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

// Load client secrets from a local file.
const CREDENTIALS_PATH = path.join(__dirname, 'service_account.json');

let sheetsService = null;

const fs = require('fs');

async function getSheetsService() {
    if (sheetsService) return sheetsService;

    try {
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error("service_account.json not found");
        }

        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        const credentials = JSON.parse(content);

        // Fix private_key formatting: replace literal '\n' string with actual newline character
        // This fixes common copy-paste errors or incorrect JSON escaping
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        sheetsService = google.sheets({ version: 'v4', auth: client });
        return sheetsService;
    } catch (error) {
        console.error("Error authenticating:", error);
        throw new Error("Failed to authenticate with Google Sheets. " + error.message);
    }
}

// Helper to read a range
async function readSheet(range, renderOption = 'FORMATTED_VALUE') {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    try {
        const result = await service.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: renderOption,
        });
        return result.data.values || [];
    } catch (error) {
        console.error(`Error reading range ${range}:`, error);
        throw error;
    }
}

async function getEmployees() {
    // Assumes KARYAWAN sheet: Email, Nama, Jabatan, Departemen, Password
    // Skipping header row is handled by logic or explicit range 'KARYAWAN!A2:E'
    const rows = await readSheet('KARYAWAN!A2:E');
    return rows.map(row => ({
        email: row[0],
        name: row[1],
        position: row[2],
        department: row[3],
        password: row[4] || '' // Password column
    }));
}

async function getAssignments(reviewerEmail) {
    // Assumes ASSIGNMENT_360 sheet: Email Penilai, Email Yang Dinilai
    const rows = await readSheet('ASSIGNMENT_360!A2:B');
    // Filter rows where first column matches reviewerEmail
    const assignedEmails = rows
        .filter(row => row[0] && row[0].trim().toLowerCase() === reviewerEmail.trim().toLowerCase())
        .map(row => row[1] && row[1].trim()); // Return Email Yang Dinilai

    return assignedEmails;
}

async function saveAppraisal(data) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // HASIL_PENILAIAN columns: Timestamp, Email Penilai, Nama Penilai, Email Yang Dinilai, Nama Yang Dinilai, Nilai, Komentar
    const values = [[
        new Date().toISOString(),
        data.reviewerEmail,
        data.reviewerName,
        data.targetEmail,
        data.targetName,
        data.score,
        data.comment
    ]];

    try {
        await service.spreadsheets.values.append({
            spreadsheetId,
            range: 'HASIL_PENILAIAN!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });
    } catch (error) {
        console.error("Error saving appraisal:", error);
        throw error;
    }
}

async function getCompletedAppraisals(reviewerEmail) {
    // Get all appraisals by this reviewer
    const rows = await readSheet('HASIL_PENILAIAN!A2:G');
    const completedEmails = rows
        .filter(row => row[1] && row[1].trim().toLowerCase() === reviewerEmail.trim().toLowerCase())
        .map(row => row[3] && row[3].trim()); // Return Email Yang Dinilai (column D)

    return completedEmails;
}

async function deleteAppraisal(rowIndex) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    try {
        const sheetId = await getSheetIdByName('HASIL_PENILAIAN');
        await service.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });
    } catch (error) {
        console.error("Error deleting appraisal:", error);
        throw error;
    }
}

// Admin Functions for CRUD

async function getAllAssignments() {
    const rows = await readSheet('ASSIGNMENT_360!A2:B');
    return rows.map((row, index) => ({
        id: index + 2, // row number in sheet
        reviewerEmail: row[0],
        targetEmail: row[1]
    }));
}

async function addEmployee(employee) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const values = [[
        employee.email,
        employee.name,
        employee.position || '',
        employee.department || '',
        employee.password || ''
    ]];

    try {
        await service.spreadsheets.values.append({
            spreadsheetId,
            range: 'KARYAWAN!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });
    } catch (error) {
        console.error("Error adding employee:", error);
        throw error;
    }
}

async function updateEmployee(rowIndex, employee) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const values = [[
        employee.email,
        employee.name,
        employee.position || '',
        employee.department || '',
        employee.password || ''
    ]];

    try {
        await service.spreadsheets.values.update({
            spreadsheetId,
            range: `KARYAWAN!A${rowIndex}:E${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });
    } catch (error) {
        console.error("Error updating employee:", error);
        throw error;
    }
}

async function deleteEmployee(rowIndex) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    try {
        const sheetId = await getSheetIdByName('KARYAWAN');
        await service.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });
    } catch (error) {
        console.error("Error deleting employee:", error);
        throw error;
    }
}

async function addAssignment(assignment) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const values = [[
        assignment.reviewerEmail,
        assignment.targetEmail
    ]];

    try {
        await service.spreadsheets.values.append({
            spreadsheetId,
            range: 'ASSIGNMENT_360!A:B',
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });
    } catch (error) {
        console.error("Error adding assignment:", error);
        throw error;
    }
}

async function deleteAssignment(rowIndex) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    try {
        const sheetId = await getSheetIdByName('ASSIGNMENT_360');
        await service.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        throw error;
    }
}

async function getAppraisalResults() {
    // Use UNFORMATTED_VALUE to get precise numbers (e.g. 4.5) instead of rounded strings (e.g. "5")
    const rows = await readSheet('HASIL_PENILAIAN!A2:G', 'UNFORMATTED_VALUE');
    return rows.map((row, index) => ({
        rowIndex: index + 2, // +2 because row 1 is header, array starts at 0
        timestamp: row[0],
        reviewerEmail: row[1],
        reviewerName: row[2],
        targetEmail: row[3],
        targetName: row[4],
        score: row[5],
        comment: row[6] || ''
    }));
}

async function getSheetIdByName(sheetName) {
    const service = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await service.spreadsheets.get({
        spreadsheetId,
    });

    const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

    return sheet.properties.sheetId;
}

module.exports = {
    getEmployees,
    getAssignments,
    saveAppraisal,
    getCompletedAppraisals,
    deleteAppraisal,
    // Admin functions
    getAllAssignments,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addAssignment,
    deleteAssignment,
    getAppraisalResults
};
