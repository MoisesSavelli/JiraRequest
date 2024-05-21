const fs = require('fs');
const xlsx = require('xlsx');

// Read Jira data from a JSON file
const rawData = fs.readFileSync('jiraIssues.json');
const jiraIssues = JSON.parse(rawData);

// Function to get all QA tickets
function getQaTickets(issues) {
    return issues.filter(issue => issue.fields.issuetype.name === 'QA Ticket');
}

// Function to get related development tickets of type 'Story'
function getRelatedDevTicket(qaTicket) {
    return qaTicket.fields.issuelinks.filter(link => 
        // link.type.name === 'Duplicate' && link.outwardIssue?.fields.issuetype.name === 'Story'
        link.outwardIssue?.fields.issuetype.name === 'Story'
    ).map(link => link.outwardIssue);
}

// Function to obtain the test cases related to the QA ticket
function getTestCases(qaTicket) {
    return qaTicket.fields.issuelinks.filter(link => link.type.name === 'Test' && link.inwardIssue)
        .map(link => link.inwardIssue);
}

// Main function to process QA tickets
function processQaTickets(qaTickets) {
    let manualReviewList = [];
    let relationList = [];

    qaTickets.forEach(qaTicket => {
        const relatedDevTickets = getRelatedDevTicket(qaTicket);
        
        if (relatedDevTickets.length > 1) {
            // Add the QA ticket to the manual review list
            manualReviewList.push({
                qaTicketKey: qaTicket.key,
                relatedDevTickets: relatedDevTickets.map(ticket => ticket.key)
            });
        } else if (relatedDevTickets.length === 1) {
            const devTicket = relatedDevTickets[0];
            if (devTicket && devTicket.key) {
                const testCases = getTestCases(qaTicket);

                // Relate each test case to the development ticket
                testCases.forEach(testCase => {
                    if (testCase && testCase.key) {
                        // Add the relationship to the registry
                        relationList.push({
                            qaTicketKey: qaTicket.key,
                            testCaseKey: testCase.key,
                            devTicketKey: devTicket.key
                        });
                        console.log(`Relating test case ${testCase.key} to dev ticket ${devTicket.key}`);
                    }
                });

                // Unlink the QA ticket from the development ticket
                console.log(`Delinking QA ticket ${qaTicket.key} from dev ticket ${devTicket.key}`);
            } else {
                console.log(`No valid development ticket found for QA ticket ${qaTicket.key}`);
            }
        } else {
            console.log(`No related development ticket found for QA ticket ${qaTicket.key}`);
        }
    });

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

// Function to save the list of relationships to an Excel file
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


//const qaTickets = getQaTickets(jiraIssues);
//const getQaTicket = qaTickets.filter(issue => issue.key === 'PAELS-11504');

//getQaTicket.forEach(item => 
    //console.log(`Lo consegui! ${item.key}`)
//)


// Execute the process

const qaTickets = getQaTickets(jiraIssues);
const { manualReviewList, relationList } = processQaTickets(qaTickets);
saveManualReviewList(manualReviewList);
saveRelationList(relationList);
console.log('Process completed. Manual review list saved to ManualReviewList.xlsx.');
console.log('Relation list saved to RelationList.xlsx.');
