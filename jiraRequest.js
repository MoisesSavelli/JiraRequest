const axios = require('axios');
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
    console.log(JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.error(error);
  });
