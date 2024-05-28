const fs = require('fs');
const xlsx = require('xlsx');
const axios = require('axios');
const { exec } = require('child_process');
require('dotenv').config();

// Read Jira data from JSON file
const rawData = fs.readFileSync('jiraIssues.json');
const jiraIssues = JSON.parse(rawData);

// Function to get all QA tickets
function getQaTickets(issues, maxProcess) {
    const qaTickets = issues.filter(issue => 
        issue.fields.issuetype.name === 'QA Ticket' &&
        //issue.fields.status?.name !== 'Test Case Creation' &&
        issue.fields.issuelinks.some(link => link.type.name === 'Test' && link.inwardIssue) // Check if there is any Test Case linked
        // Uncomment this line for testing purposes, and set here a QA Ticket.
        // && issue.key === 'PAELS-11516' // QA Ticket without test cases
        //&& issue.key === 'PAELS-8317' // QA Tickets with test cases
    );
    return maxProcess > 0 ? qaTickets.slice(0, maxProcess) : qaTickets;
}

// Function to get related development tickets of type 'Story'
function getRelatedDevTicket(qaTicket) {
    return qaTicket.fields.issuelinks.filter(link => 
        link.outwardIssue?.fields.issuetype.name === 'Story'
    ).map(link => link.outwardIssue);
}

// Function to get test cases related to the QA ticket
function getTestCases(qaTicket) {
    return qaTicket.fields.issuelinks.filter(link => link.type.name === 'Test' && link.inwardIssue)
        .map(link => link.inwardIssue);
}

// Function to check if a link already exists between a test case and a development ticket
function isLinkAlreadyExists(testCaseKey, devTicketKey, jiraIssues) {
    const testCase = jiraIssues.find(issue => issue.key === testCaseKey);
    if (!testCase || !testCase.fields || !testCase.fields.issuelinks) {
        // console.log(`Test case ${testCaseKey} does not have issue links or fields.`);
        return false;
    }
    return testCase.fields.issuelinks.some(link => 
        (link.outwardIssue && link.outwardIssue.key === devTicketKey) ||
        (link.inwardIssue && link.inwardIssue.key === devTicketKey)
    );
}

// Function to link a test case to a development ticket
async function linkTestCaseToDevTicket(testCaseKey, devTicketKey) {
    const jiraUrl = process.env.JIRA_BASE_URL;
    const username = process.env.JIRA_USERNAME;
    const apiToken = process.env.JIRA_API_TOKEN;

    const auth = {
        username: username,
        password: apiToken
    };

    const issueLink = {
        type: {
            name: 'Test'
        },
        inwardIssue: {
            key: testCaseKey
        },
        outwardIssue: {
            key: devTicketKey
        }
    };

    try {
        await axios.post(`${jiraUrl}/rest/api/3/issueLink`, issueLink, {
            auth: auth,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log(`Successfully linked ${testCaseKey} to ${devTicketKey}`);
    } catch (error) {
        console.error(`Error linking ${testCaseKey} to ${devTicketKey}:`, error);
    }
}

// Main function to process QA tickets
async function processQaTickets(qaTickets) {
    let manualReviewList = [];
    let relationList = [];

    for (const qaTicket of qaTickets) {
        const relatedDevTickets = getRelatedDevTicket(qaTicket);
        
        if (relatedDevTickets.length > 1) {
            // Add QA ticket to manual review list
            manualReviewList.push({
                qaTicketKey: qaTicket.key,
                relatedDevTickets: relatedDevTickets.map(ticket => ticket.key)
            });
        } else if (relatedDevTickets.length === 1) {
            const devTicket = relatedDevTickets[0];
            if (devTicket && devTicket.key) {
                const testCases = getTestCases(qaTicket);

                // Link each test case to the development ticket
                for (const testCase of testCases) {
                    if (testCase && testCase.key) {
                        // Check if the link already exists
                        const alreadyExists = isLinkAlreadyExists(testCase.key, devTicket.key, jiraIssues);
                        //console.log(`Test case ${testCase.key} already linked to dev ticket ${devTicket.key}: ${alreadyExists}`);

                        if (!alreadyExists) {
                            // Add relation to the record
                            relationList.push({
                                qaTicketKey: qaTicket.key,
                                testCaseKey: testCase.key,
                                devTicketKey: devTicket.key
                            });
                            // Uncomment for debugging
                            //console.log(`Relating test case ${testCase.key} to dev ticket ${devTicket.key}`);

                            // Link the test case to the development ticket
                            await linkTestCaseToDevTicket(testCase.key, devTicket.key);
                        } else {
                            //console.log(`Test case ${testCase.key} is already linked to dev ticket ${devTicket.key}`);
                        }
                    }
                }
            } else {
                console.log(`No valid development ticket found for QA ticket ${qaTicket.key}`);
            }
        } else {
            console.log(`No related development ticket found for QA ticket ${qaTicket.key}`);
        }
    }

    return { manualReviewList, relationList };
}

// Function to save the manual review list to an Excel file
function saveManualReviewList(manualReviewList) {
    const worksheetData = [['QA Ticket', 'Related Dev Tickets']];
    manualReviewList.forEach(item => {
        worksheetData.push([item.qaTicketKey, item.relatedDevTickets.join(', ')]);
    });

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Manual Review');

    xlsx.writeFile(workbook, 'ManualReviewList.xlsx');
}

// Function to save the relation list to an Excel file
function saveRelationList(relationList) {
    const worksheetData = [['QA Ticket', 'Test Case', 'Development Ticket']];
    relationList.forEach(item => {
        worksheetData.push([item.qaTicketKey, item.testCaseKey, item.devTicketKey]);
    });

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Relation List');

    xlsx.writeFile(workbook, 'RelationList.xlsx');
}

// Function to execute another JavaScript file
function executeScript(scriptPath) {
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script ${scriptPath}:`, error);
            return;
        }
        if (stderr) {
            console.error(`Standard error from script ${scriptPath}:`, stderr);
            return;
        }
        console.log(`Standard output from script ${scriptPath}:`, stdout);
    });
}

// Execute the process
async function main() {
    const MAX_PROCESS = 50; // Set the maximum number of QA tickets to process. If =< 0 then will proccess everything in the system.
    const qaTickets = getQaTickets(jiraIssues, MAX_PROCESS);
    const { manualReviewList, relationList } = await processQaTickets(qaTickets);
    saveManualReviewList(manualReviewList);
    saveRelationList(relationList);
    console.log('Process completed. Manual review list saved to ManualReviewList.xlsx.');
    console.log('Relation list saved to RelationList.xlsx.');
    console.log('******************************');
    console.log('Now updating JiraIssues.json');
    executeScript('jiraRequest.js');
}

main();