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



const insertIssuesToDb = async (issues) => {
    try {
        let pool = await sql.connect(dbConfig);

        for (let issue of issues) {
            await pool.request()
                .input('issue_id', sql.Int, parseInt(issue.id))
                .input('issue_key', sql.VarChar(50), issue.key)
                .input('summary', sql.NVarChar(255), issue.fields.summary)
                .input('issue_type', sql.NVarChar(50), issue.fields.issuetype.name)
                .input('status', sql.NVarChar(50), issue.fields.status.name)
                .input('created', sql.DateTime, new Date(issue.fields.created))
                .input('updated', sql.DateTime, new Date(issue.fields.updated))
                .input('priority', sql.NVarChar(50), issue.fields.priority ? issue.fields.priority.name : null)
                .input('reporter', sql.NVarChar(100), issue.fields.reporter ? issue.fields.reporter.displayName : null)
                .input('assignee', sql.NVarChar(100), issue.fields.assignee ? issue.fields.assignee.displayName : null)
                .query(`
                    INSERT INTO LAND.Jira.Issues (
                        issue_id, issue_key, summary, issue_type, status, created, updated, priority, reporter, assignee
                    ) VALUES (
                        @issue_id, @issue_key, @summary, @issue_type, @status, @created, @updated, @priority, @reporter, @assignee
                    )
                `);
        }

        console.log('All issues have been inserted into the database.');
    } catch (error) {
        console.error('Error inserting issues into the database:', error);
    } finally {
        sql.close();
    }
};



const main = async () => {
    try {
        const issues = await readJsonFile('jiraIssues.json');
        await insertIssuesToDb(issues);
    } catch (error) {
        console.error('Error processing JSON file or inserting into database:', error);
    }
};

main();
