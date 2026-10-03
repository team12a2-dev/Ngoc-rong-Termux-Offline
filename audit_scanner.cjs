const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, 'src');
const panelDir = path.resolve(__dirname, 'panel/api/src');

function getAllFiles(dir, ext = '.java') {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath, ext));
        } else if (file.endsWith(ext)) {
            results.push(fullPath);
        }
    });
    return results;
}

const javaFiles = getAllFiles(srcDir, '.java');
const jsFiles = getAllFiles(panelDir, '.js');

console.log(`Found ${javaFiles.length} Java files and ${jsFiles.length} JS files.`);

const report = {
    sqlInjectionJava: [],
    unclosedResources: [],
    missingInputValidation: [],
    integerOverflowRisks: [],
    concurrencyRisks: [],
    panelVulnerabilities: []
};

// 1. Quét SQL Injection & Leak Resource trong Java
javaFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(__dirname, file);

    // SQL Concat: Statement.executeQuery("..." + var) hoặc executeUpdate("..." + var)
    const sqlConcatRegex = /(?:executeQuery|executeUpdate|execute)\s*\(\s*"[^"]*"\s*\+/g;
    let match;
    while ((match = sqlConcatRegex.exec(content)) !== null) {
        report.sqlInjectionJava.push({ file: relPath, snippet: match[0] });
    }

    // Unclosed Statement / ResultSet (không có close hoặc try-with-resources)
    if (content.includes('getConnection()') || content.includes('prepareStatement(')) {
        if (!content.includes('try (') && !content.includes('.close()')) {
            report.unclosedResources.push({ file: relPath, reason: 'Có prepareStatement/getConnection nhưng có thể thiếu close/try-with-resources' });
        }
    }

    // Shop / Trade / Inventory multiply overflow: int price * quantity
    if (content.includes('*') && (content.includes('gold') || content.includes('gem') || content.includes('price') || content.includes('cost'))) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes('*') && (line.includes('price') || line.includes('cost') || line.includes('gold')) && !line.includes('//') && !line.includes('(long)')) {
                if (line.includes('int ') || (line.includes('+=') && !line.includes('long'))) {
                    report.integerOverflowRisks.push({ file: `${relPath}:${idx + 1}`, line: line.trim() });
                }
            }
        });
    }
});

// 2. Quét Input.java chi tiết
const inputPath = path.resolve(srcDir, 'nro/models/services_func/Input.java');
if (fs.existsSync(inputPath)) {
    const inputContent = fs.readFileSync(inputPath, 'utf8');
    const lines = inputContent.split('\n');
    let currentCase = 'unknown';
    lines.forEach((line, idx) => {
        if (line.includes('case ')) {
            currentCase = line.trim();
        }
        if (line.includes('parseInt') || line.includes('parseLong')) {
            // Check if there is negative check in the vicinity
            const surrounding = lines.slice(Math.max(0, idx - 5), Math.min(lines.length, idx + 15)).join('\n');
            if (!surrounding.includes('<= 0') && !surrounding.includes('< 0') && !surrounding.includes('< 1')) {
                report.missingInputValidation.push({
                    caseName: currentCase,
                    lineNum: idx + 1,
                    code: line.trim()
                });
            }
        }
    });
}

// 3. Quét Panel JS
jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(__dirname, file);

    // Kiểm tra raw SQL string concatenation trong db.query hoặc connection.query
    const sqlConcatRegex = /(?:query|execute)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g;
    let match;
    while ((match = sqlConcatRegex.exec(content)) !== null) {
        report.panelVulnerabilities.push({ file: relPath, snippet: match[0], type: 'SQL Template Literal Injection' });
    }
});

fs.writeFileSync('audit_scanner_result.json', JSON.stringify(report, null, 2), 'utf8');
console.log('Audit scan completed. Report saved to audit_scanner_result.json');
console.log(`- SQL Concat Java: ${report.sqlInjectionJava.length}`);
console.log(`- Potential Resource Leaks: ${report.unclosedResources.length}`);
console.log(`- Missing Input Validation: ${report.missingInputValidation.length}`);
console.log(`- Potential Integer Overflow in Price/Gold: ${report.integerOverflowRisks.length}`);
console.log(`- Panel SQL Template Injections: ${report.panelVulnerabilities.length}`);
