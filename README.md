# Project for Jira Ticket Management 🚀

## Overview

This project helps you manage Jira tickets efficiently by performing the following tasks:
1. **Download Jira Tickets**: A script (`jiraRequest.js`) downloads all Jira tickets for a project and saves them in a `jiraIssues.json` file.
2. **Filter Defects by Ticket**: Another script (`defectsByTicket.js`) filters the information to find defects associated with a development ticket and outputs a `tickets.csv` file.

## Pre-requisites

Before you begin, ensure you have the following:

- Node.js installed
- A Jira account with API access
- Project-specific Jira credentials

## Getting Started

### Installation

1. Clone the repository:

    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. Install the dependencies:

    ```sh
    npm install
    ```

### Setting up Environment Variables

Create a `.env` file in the root directory of your project and add the following variables:

```env
JIRA_BASE_URL=your_jira_base_url
PROJECT_KEY=your_project_key
JIRA_USERNAME=your_jira_username
JIRA_API_TOKEN=your_jira_api_token
```

## Usage
### Downloading Jira Tickets
To download all Jira tickets for your project, run the following command:

```node jiraRequest.js```
This will create a ```jiraIssues.json``` file containing all the tickets.

### Filtering Defects by Ticket
To filter the defects associated with each development ticket, run the following 
```node defectsByTicket.js```

This will generate a tickets.csv file in the project directory with the following 

* Development Ticket (Story)
* Developer Name
* Associated Defect Ticket (Bug)


## Filtering Logic

### The filtering process follows these steps:
* Find a bug.
* Find the test execution related to the bug.
* Find the QA ticket related to the test execution.
* Find the user story related to the QA ticket.

## Contributing
If you would like to contribute to this project, please create a pull request. We welcome all contributions!

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
For any questions or suggestions, feel free to open an issue or contact us.

Happy coding! 😊