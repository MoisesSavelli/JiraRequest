const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-write-stream');

// Read the JSON file
const filePath = 'jiraIssues.json';
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file', err);
    return;
  }

  let jiraData;
  try {
    jiraData = JSON.parse(data);
  } catch (parseError) {
    console.error('Error parsing JSON data', parseError);
    return;
  }

  // Verify that the data has been loaded correctly
  if (!Array.isArray(jiraData) || jiraData.length === 0) {
    console.error('No issues found in the JSON data');
    return;
  }

  console.log(`Total issues found: ${jiraData.length}`);

  // Function to find a defect ticket (Bug) with its chain of links
  const findDevelopmentAndDefectTickets = (jiraIssues) => {
    let results = [];

    const findIssueByKey = (key) => jiraIssues.find(issue => issue.key === key);

    for (let issue of jiraIssues) {
      if (issue.fields.issuetype.name === 'Bug' && (issue.fields.status.name !== 'New' && issue.fields.status.name !== 'Canceled')) {
        let bugTicket = issue;
        let linkedIssues = issue.fields.issuelinks || [];
        // console.log(`Bug Ticket: ${bugTicket.key} has ${linkedIssues.length} linked issues`);

        linkedIssues.forEach(linkedIssue => {
          const xrayTestKey = linkedIssue.inwardIssue ? linkedIssue.inwardIssue.key : (linkedIssue.outwardIssue ? linkedIssue.outwardIssue.key : null);
          const xrayTest = findIssueByKey(xrayTestKey);

          // console.log(issue.fields.assignee)

          if (xrayTest && xrayTest.fields.issuetype.name === 'Xray Test') {
            // console.log(`Xray Test Found: ${xrayTest.key}`);
            let xrayLinkedIssues = xrayTest.fields.issuelinks || [];
            // console.log(`Xray Test: ${xrayTest.key} has ${xrayLinkedIssues.length} linked issues`);

            xrayLinkedIssues.forEach(xrayLinkedIssue => {
              const qaTicketKey = xrayLinkedIssue.inwardIssue ? xrayLinkedIssue.inwardIssue.key : (xrayLinkedIssue.outwardIssue ? xrayLinkedIssue.outwardIssue.key : null);
              const qaTicket = findIssueByKey(qaTicketKey);

              if (qaTicket && qaTicket.fields.issuetype.name === 'QA Ticket') {
                // console.log(`QA Ticket Found: ${qaTicket.key}`);
                let qaLinkedIssues = qaTicket.fields.issuelinks || [];
                // console.log(`QA Ticket: ${qaTicket.key} has ${qaLinkedIssues.length} linked issues`);

                qaLinkedIssues.forEach(qaLinkedIssue => {
                  const storyKey = qaLinkedIssue.inwardIssue ? qaLinkedIssue.inwardIssue.key : (qaLinkedIssue.outwardIssue ? qaLinkedIssue.outwardIssue.key : null);
                  const storyTicket = findIssueByKey(storyKey);

                  if (storyTicket && storyTicket.fields.issuetype.name === 'Story') {
                    // console.log(`Story Ticket Found: ${storyTicket.key}`);
                    
                    // Get the developer name from the Story ticket
                    let developerName = storyTicket.fields.assignee ? storyTicket.fields.assignee.displayName : 'Unassigned';

                    results.push({
                      developmentTicket: storyTicket.key,
                      defectTicket: bugTicket.key,
                      developerName: developerName
                    });
                  }
                });
              }
            });
          }
        });
      }
    }

    return results;
  };

  // Find the associated development and defect tickets
  let results = findDevelopmentAndDefectTickets(jiraData);

  if (results.length > 0) {
    console.log(`Found ${results.length} linked tickets.`);

    // Create the CSV file
    const writer = csvWriter({ headers: ['Development Ticket (Story)', 'Developer Name', 'Associated Defect Ticket (Bug)'] });
    const outputPath = path.join(__dirname, 'tickets.csv');
    writer.pipe(fs.createWriteStream(outputPath));
    results.forEach(result => writer.write([result.developmentTicket, result.developerName, result.defectTicket]));
    writer.end();

    console.log(`CSV file created at: ${outputPath}`);
  } else {
    console.log('No linked tickets found.');
  }
});
