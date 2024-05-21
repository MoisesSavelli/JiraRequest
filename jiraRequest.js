const axios = require('axios');
const fs = require('fs');
const { format } = require('date-fns');
require('dotenv').config();

const apiEndpoint = '/rest/api/3/search';
const jiraBaseUrl = process.env.JIRA_BASE_URL;
const projectKey = process.env.PROJECT_KEY;
const username = process.env.JIRA_USERNAME;
const apiToken = process.env.JIRA_API_TOKEN;

const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

// Dates for Jira Query
//const startDate = '2024/01/01';
//const endDate = format(new Date(), 'yyyy/MM/dd'); // Current Date

// Bring all information - uncomment this and comment the next line to have all information
const jql = `project=${projectKey}`; 

// Bring information by period
//const jql = `project=${projectKey} AND created >= "${startDate}" AND created <= "${endDate}"`;

const fetchIssues = async (startAt = 0, allIssues = []) => {
  const config = {
    method: 'get',
    url: `${jiraBaseUrl}${apiEndpoint}`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    },
    params: {
      jql: jql,
      maxResults: 100,
      startAt: startAt
    }
  };

  try {
    const response = await axios(config);
    const issues = response.data.issues;
    allIssues = allIssues.concat(issues);

    if (response.data.total > allIssues.length) {
      return fetchIssues(startAt + 100, allIssues);
    } else {
      return allIssues;
    }
  } catch (error) {
    console.error(error.toJSON());
    throw error;
  }
};

console.time('fetchIssues');
fetchIssues()
  .then(issues => {
    const data = JSON.stringify(issues, null, 2);
    fs.writeFileSync('jiraIssues.json', data, (err) => {
      if (err) {
        console.error('Error writing to file', err);
      } else {
        console.log('File successfully written');
      }
    });
    console.timeEnd('fetchIssues');
  })
  .catch(error => {
    console.error('Failed to fetch issues:', error);
    console.timeEnd('fetchIssues');
  });
