const fs = require('fs');

// Read Jira data from JSON file
const rawData = fs.readFileSync('jiraIssues.json');
const jiraIssues = JSON.parse(rawData);

// Function to find a ticket by its key
function findTicketByKey(key) {
    return jiraIssues.find(issue => issue.key === key);
}

// Function to obtain the sub-tasks related to a ticket
function getSubTasks(ticket) {
    return ticket.fields.subtasks || [];
}

// Function to get related development tickets in "duplicates" and sub-tasks
function analyzeTicket(ticketKey) {
    const ticket = findTicketByKey(ticketKey);

    if (!ticket) {
        console.log(`Ticket ${ticketKey} not found`);
        return;
    }

    console.log(`Analyzing QA Ticket: ${ticketKey}`);
    console.log(ticket);  // Add this line to review the ticket structure
    // Search in the "duplicates" field
    const duplicates = ticket.fields.issuelinks.filter(link => 
        link.type.name === 'Duplicate' && link.outwardIssue
    ).map(link => link.outwardIssue);

    console.log('Duplicates links:', ticket.fields.issuelinks); // Additional debugging

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} related development ticket(s) in "duplicates":`);
        duplicates.forEach(duplicate => {
            if (duplicate && duplicate.fields && duplicate.fields.issuetype) {
                console.log(`- ${duplicate.key} (${duplicate.fields.issuetype.name})`);
            } else {
                console.log(`- ${duplicate.key} (issuetype not available)`);
            }
        });
    } else {
        console.log(`No related development tickets found in "duplicates".`);
    }

    // Search in sub-tasks
    const subTasks = getSubTasks(ticket);

    console.log('Sub-tasks:', subTasks); // Additional debugging

    if (subTasks.length > 0) {
        console.log(`Found ${subTasks.length} related development ticket(s) in sub-tasks:`);
        subTasks.forEach(subTask => {
            if (subTask && subTask.fields && subTask.fields.issuetype) {
                console.log(`- ${subTask.key} (${subTask.fields.issuetype.name})`);
            } else {
                console.log(`- ${subTask.key} (issuetype not available)`);
            }
        });
    } else {
        console.log(`No related development tickets found in sub-tasks.`);
    }

    console.log('Analysis complete.');
}

// Run the analysis for the intended cases
analyzeTicket('PAELS-4509');
