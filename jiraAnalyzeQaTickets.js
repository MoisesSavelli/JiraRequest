const fs = require('fs');

// Leer los datos de Jira desde el archivo JSON
const rawData = fs.readFileSync('jiraIssues.json');
const jiraIssues = JSON.parse(rawData);

// Función para encontrar un ticket por su clave
function findTicketByKey(key) {
    return jiraIssues.find(issue => issue.key === key);
}

// Función para obtener los sub-tasks relacionados a un ticket
function getSubTasks(ticket) {
    return ticket.fields.subtasks || [];
}

// Función para obtener los tickets de desarrollo relacionados en "duplicates" y sub-tasks
function analyzeTicket(ticketKey) {
    const ticket = findTicketByKey(ticketKey);

    if (!ticket) {
        console.log(`Ticket ${ticketKey} not found`);
        return;
    }

    console.log(`Analyzing QA Ticket: ${ticketKey}`);
    console.log(ticket);  // Agregar esta línea para revisar la estructura del ticket

    // Buscar en el campo "duplicates"
    const duplicates = ticket.fields.issuelinks.filter(link => 
        link.type.name === 'Duplicate' && link.outwardIssue
    ).map(link => link.outwardIssue);

    console.log('Duplicates links:', ticket.fields.issuelinks); // Depuración adicional

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

    // Buscar en los sub-tasks
    const subTasks = getSubTasks(ticket);

    console.log('Sub-tasks:', subTasks); // Depuración adicional

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

// Ejecutar el análisis para los dos casos mencionados
analyzeTicket('PAELS-4509');
