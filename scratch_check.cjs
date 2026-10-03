const fs = require('fs');
const content = fs.readFileSync('src/nro/models/database/PlayerDAO.java', 'utf8');

const queryStart = content.indexOf('String query = "update player set ');
const queryEnd = content.indexOf('where id = ?";', queryStart);
const queryPart = content.substring(queryStart + 'String query = "update player set '.length, queryEnd);
const cleanedQuery = queryPart.replace(/"|\+|\n|\r/g, ' ');
const columns = cleanedQuery.split(',').map(s => s.trim()).filter(Boolean);

console.log('Columns count in SET:', columns.length);
const qMarks = (content.substring(queryStart, queryEnd + 20).match(/\?/g) || []).length;
console.log('Total ? in SQL query:', qMarks);

const execStart = content.indexOf('LocalManager.executeUpdate(query,', queryEnd);
const execEnd = content.indexOf('player.id);', execStart);
const paramsLines = content.substring(execStart + 'LocalManager.executeUpdate(query,'.length, execEnd).split('\n');

const paramList = [];
for (let line of paramsLines) {
    const cIdx = line.indexOf('//');
    if (cIdx !== -1) line = line.substring(0, cIdx);
    line = line.trim();
    if (!line) continue;
    // split by comma if any
    const parts = line.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
        paramList.push(p);
    }
}
paramList.push('player.id');

console.log('Total params passed to executeUpdate:', paramList.length);
console.log('Match?', qMarks === paramList.length ? 'YES' : 'NO: Diff = ' + (paramList.length - qMarks));

for (let i = 0; i < Math.max(columns.length, paramList.length - 1); i++) {
    console.log((i + 1) + '. Col: [' + (columns[i] || 'MISSING') + '] <---> Param: [' + (paramList[i] || 'MISSING') + ']');
}
console.log('Where clause: [where id = ?] <---> Param: [' + paramList[paramList.length - 1] + ']');
