const fs = require('fs');
const xlsx = require('xlsx');

// Leer los datos de Jira desde el archivo JSON
const rawData = fs.readFileSync('jiraIssues.json');
const jiraIssues = JSON.parse(rawData);

// Función para obtener todos los QA tickets
function getQaTickets(issues) {
    return issues.filter(issue => issue.fields.issuetype.name === 'QA Ticket');
}

// Función para obtener los tickets de desarrollo relacionados en "duplicates" y sub-tasks
function getRelatedDevTicket(qaTicket) {
    let relatedDevTickets = [];

    // Buscar en el campo "duplicates"
    relatedDevTickets = relatedDevTickets.concat(
        qaTicket.fields.issuelinks.filter(link => 
            link.type.name === 'Duplicate' && link.outwardIssue
        ).map(link => link.outwardIssue)
    );

    // Buscar en los sub-tasks
    if (qaTicket.fields.subtasks) {
        relatedDevTickets = relatedDevTickets.concat(
            qaTicket.fields.subtasks.filter(subtask => 
                subtask.fields.issuetype.name === 'Story' || subtask.fields.issuetype.name === 'Task' || subtask.fields.issuetype.name === 'Bug'
            )
        );
    }

    return relatedDevTickets;
}

// Función para obtener los test cases relacionados al QA ticket
function getTestCases(qaTicket) {
    return qaTicket.fields.issuelinks.filter(link => link.type.name === 'Test' && link.inwardIssue)
        .map(link => link.inwardIssue);
}

// Función principal para procesar los QA tickets
function processQaTickets(qaTickets) {
    let manualReviewList = [];
    let relationList = [];

    qaTickets.forEach(qaTicket => {
        const relatedDevTickets = getRelatedDevTicket(qaTicket);
        
        if (relatedDevTickets.length > 1) {
            // Agregar el QA ticket a la lista de revisión manual
            manualReviewList.push({
                qaTicketKey: qaTicket.key,
                relatedDevTickets: relatedDevTickets.map(ticket => ticket.key)
            });
        } else if (relatedDevTickets.length === 1) {
            const devTicket = relatedDevTickets[0];
            if (devTicket && devTicket.key) {
                const testCases = getTestCases(qaTicket);

                // Relacionar cada test case con el ticket de desarrollo
                testCases.forEach(testCase => {
                    if (testCase && testCase.key) {
                        // Agregar la relación al registro
                        relationList.push({
                            qaTicketKey: qaTicket.key,
                            testCaseKey: testCase.key,
                            devTicketKey: devTicket.key
                        });
                        // console.log(`Relating test case ${testCase.key} to dev ticket ${devTicket.key}`);
                    }
                });

                // Deslinkear el QA ticket del ticket de desarrollo
                // console.log(`Delinking QA ticket ${qaTicket.key} from dev ticket ${devTicket.key}`);
            } else {
                // console.log(`No valid development ticket found for QA ticket ${qaTicket.key}`);
            }
        } else {
            // console.log(`No related development ticket found for QA ticket ${qaTicket.key}`);
        }
    });

    return { manualReviewList, relationList };
}

// Función para guardar la lista de revisión manual en un archivo Excel
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

// Función para guardar la lista de relaciones en un archivo Excel
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

// Ejecutar el proceso
const qaTickets = getQaTickets(jiraIssues);
const { manualReviewList, relationList } = processQaTickets(qaTickets);
saveManualReviewList(manualReviewList);
saveRelationList(relationList);

console.log('Process completed. Manual review list saved to ManualReviewList.xlsx.');
console.log('Relation list saved to RelationList.xlsx.');
