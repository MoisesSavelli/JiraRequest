const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const apiEndpoint = '/rest/api/3/search';
const jiraBaseUrl = process.env.JIRA_BASE_URL;
const projectKey = process.env.PROJECT_KEY;
const username = process.env.JIRA_USERNAME;
const apiToken = process.env.JIRA_API_TOKEN;

const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

const jql = `project=${projectKey}`;

const config = {
  method: 'get',
  url: `${jiraBaseUrl}${apiEndpoint}`,
  headers: {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json'
  },
  params: {
    jql: jql,
    maxResults: 100
  }
};

axios(config)
  .then(response => {
    const data = JSON.stringify(response.data, null, 2);
    fs.writeFileSync('jiraIssues.json', data, (err) => {
      if (err) {
        console.error('Error writing to file', err);
      } else {
        console.log('File successfully written');
      }
    });
  })
  .catch(error => {
    console.error(error);
  });
