require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');

// Configuration for the database connection
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: true,
        enableArithAbort: true,
        trustServerCertificate: true
    }
};

// Function to sanitize strings for SQL insertion
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''");
}

// Function to process rework counts and insert them into the database
async function processReworkCounts(issueId, issue) {
    const transitions = issue.changelog ? issue.changelog.histories : [];
    let reworkCount = 0;
    let assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned';

    for (let history of transitions) {
        for (let item of history.items) {
            if (item.field === 'status') {
                const fromStatus = item.fromString.trim().toLowerCase();
                const toStatus = item.toString.trim().toLowerCase();
                if (fromStatus === 'dev complete' && toStatus === 'in progress') {
                    reworkCount++;
                }
            }
        }
    }

    if (reworkCount > 0) {
        const sprint = issue.fields.customfield_10020 ? issue.fields.customfield_10020[0].name : 'No Sprint';
        const query = `
            INSERT INTO Jira.ReworkCounts (issue_key, assignee, rework_count, sprint, created_at)
            VALUES ('${sanitizeString(issue.key)}', '${sanitizeString(assignee)}', ${reworkCount}, '${sanitizeString(sprint)}', GETDATE());
        `;

        try {
            await sql.query(query);
            console.log(`Inserted rework count for issue ${issue.key} with rework count: ${reworkCount}`);
        } catch (err) {
            console.error(`Error inserting rework count for issue ${issue.key}: ${err}`);
        }
    }
}

// Main function to read issues from JSON and process them
async function main() {
    const issuesFilePath = 'jiraIssues.json';
    let issues;

    try {
        issues = JSON.parse(fs.readFileSync(issuesFilePath, 'utf8'));
    } catch (err) {
        console.error(`Error reading or parsing ${issuesFilePath}: ${err}`);
        return;
    }

    try {
        await sql.connect(dbConfig);
        console.log('Connected to the database');
    } catch (err) {
        console.error(`Database connection failed: ${err}`);
        return;
    }

    if (Array.isArray(issues)) {
        for (let issue of issues) {
            await processReworkCounts(issue.id, issue);
        }
    } else {
        console.error('Issues object is not in the expected format.');
    }

    sql.close();
}

main().catch(err => console.error(`Error processing issues and links: ${err}`));
