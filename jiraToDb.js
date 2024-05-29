const fs = require('fs');
const sql = require('mssql');
require('dotenv').config();

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

const readJsonFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
};

const sanitizeString = (str, maxLength) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').substring(0, maxLength);
};

const insertIssuesToDb = async (pool, issues) => {
    const issueInserts = issues.map(issue => {
        const { id, key, fields } = issue;
        const description = sanitizeString(fields.description, 4000); 
        return pool.request()
            .input('issue_id', sql.Int, parseInt(id, 10))
            .input('issue_key', sql.NVarChar, key)
            .input('summary', sql.NVarChar, fields.summary)
            .input('description', sql.NVarChar, description)
            .input('issue_type', sql.NVarChar, fields.issuetype.name)
            .input('status', sql.NVarChar, fields.status.name)
            .input('created', sql.DateTime, new Date(fields.created))
            .input('updated', sql.DateTime, new Date(fields.updated))
            .input('priority', sql.NVarChar, fields.priority ? fields.priority.name : null)
            .input('reporter', sql.NVarChar, fields.reporter.displayName)
            .input('assignee', sql.NVarChar, fields.assignee ? fields.assignee.displayName : null)
            .input('labels', sql.NVarChar, fields.labels ? fields.labels.join(',') : null)
            .input('parent_id', sql.Int, fields.parent ? parseInt(fields.parent.id, 10) : null)
            .input('parent_key', sql.NVarChar, fields.parent ? fields.parent.key : null)
            .input('parent_summary', sql.NVarChar, fields.parent ? fields.parent.fields.summary : null)
            .query(`INSERT INTO Jira.Issues 
                (issue_id, issue_key, summary, description, issue_type, status, created, updated, priority, reporter, assignee, labels, parent_id, parent_key, parent_summary)
                VALUES (@issue_id, @issue_key, @summary, @description, @issue_type, @status, @created, @updated, @priority, @reporter, @assignee, @labels, @parent_id, @parent_key, @parent_summary)`);
    });

    await Promise.all(issueInserts);
};

const insertIssueLinksToDb = async (pool, issue, linkedIssues) => {
    const issueId = await pool.request()
        .input('issue_key', sql.NVarChar, issue.key)
        .query('SELECT issue_id FROM Jira.Issues WHERE issue_key = @issue_key');
    
    if (issueId.recordset.length === 0) {
        console.log(`Issue ID for ${issue.key} does not exist in Jira.Issues table.`);
        return;
    }

    const issueIdValue = issueId.recordset[0].issue_id;

    const linkInserts = linkedIssues.map(async linkedIssue => {
        const linkedIssueId = await pool.request()
            .input('issue_key', sql.NVarChar, linkedIssue.key)
            .query('SELECT issue_id FROM Jira.Issues WHERE issue_key = @issue_key');

        if (linkedIssueId.recordset.length === 0) {
            console.log(`Linked issue ID ${linkedIssue.key} for issue ${issue.key} does not exist in Jira.Issues table.`);
            return;
        }

        const linkedIssueIdValue = linkedIssueId.recordset[0].issue_id;

        return pool.request()
            .input('issue_id', sql.Int, issueIdValue)
            .input('linked_issue_id', sql.Int, linkedIssueIdValue)
            .input('link_type', sql.NVarChar, linkedIssue.type)
            .query(`INSERT INTO Jira.IssueLinks (issue_id, linked_issue_id, link_type) 
                    VALUES (@issue_id, @linked_issue_id, @link_type)`);
    });

    await Promise.all(linkInserts);
};

const main = async () => {
    try {
        const issues = await readJsonFile('jiraIssues.json');

        const pool = await sql.connect(dbConfig);

        await insertIssuesToDb(pool, issues);

        for (const issue of issues) {
            const linkedIssues = issue.fields.issuelinks.map(link => {
                if (link.inwardIssue) {
                    return { key: link.inwardIssue.key, type: link.type.inward };
                } else if (link.outwardIssue) {
                    return { key: link.outwardIssue.key, type: link.type.outward };
                }
            }).filter(Boolean);

            await insertIssueLinksToDb(pool, issue, linkedIssues);
        }

        console.log('Finished processing all issues and links.');
    } catch (error) {
        console.error('Error processing issues and links:', error);
    }
};

main();
