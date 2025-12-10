const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const xlsx = require('xlsx');

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.url}`);

    // API Endpoint: Save Colors
    if (req.method === 'POST' && req.url === '/api/save-colors') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const colors = JSON.parse(body);
                const excelPath = path.join(__dirname, 'database', 'Samsung_Colores.xlsx');
                const jsPath = path.join(__dirname, 'color-variables.js');

                // 1. Update Excel
                let workbook;
                try {
                    if (fs.existsSync(excelPath)) {
                        workbook = xlsx.readFile(excelPath);
                    } else {
                        workbook = xlsx.utils.book_new();
                    }
                } catch (readErr) {
                    workbook = xlsx.utils.book_new();
                }

                // Convert object to array of arrays for Excel
                const data = [['Nombre del Color', 'Código Hex']];
                Object.keys(colors).sort().forEach(key => {
                    data.push([key, colors[key]]);
                });

                const newSheet = xlsx.utils.aoa_to_sheet(data);
                newSheet['!cols'] = [{ wch: 30 }, { wch: 15 }];

                // Replace or append 'Colores' sheet
                if (workbook.Sheets['Colores']) {
                    workbook.Sheets['Colores'] = newSheet;
                } else {
                    xlsx.utils.book_append_sheet(workbook, newSheet, 'Colores');
                }

                xlsx.writeFile(workbook, excelPath);

                // 2. Update color-variables.js (Client "Database")
                const jsContent = `// Color Variables\n// Auto-generated from Admin Panel\nvar colorVariables = ${JSON.stringify(colors, null, 4)};\n`;
                fs.writeFileSync(jsPath, jsContent);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Colores guardados en Excel y actualizados.' }));
            } catch (err) {
                console.error('Error saving colors:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: err.message }));
            }
        });
        return;
    }

    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile('./404.html', (error, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content || '404 Not Found', 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
