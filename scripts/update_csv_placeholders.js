const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'products_export.csv');

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split(/\r?\n/);

    if (lines.length < 2) {
        console.log('CSV file is empty or invalid.');
        process.exit(1);
    }

    const headers = parseCSVLine(lines[0]);
    const updatedLines = [lines[0]]; // Keep header

    // Find indices for ID and variant columns
    const idIndex = headers.indexOf('id');
    const colorCodesIndex = headers.indexOf('colorCodes');

    // Map for variant columns
    const variantIndices = [];
    for (let i = 1; i <= 5; i++) {
        variantIndices.push({
            color: headers.indexOf(`Color${i}`),
            image: headers.indexOf(`Imagen${i}`),
            hex: headers.indexOf(`Hex${i}`)
        });
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;

        const values = parseCSVLine(line);
        const id = parseInt(values[idIndex]);

        if (id >= 3 && id <= 102) {
            let colorCodesObj = {};
            try {
                // Try to parse existing colorCodes to preserve keys if needed, 
                // though we will likely overwrite the values.
                // Actually, we should rebuild it based on the colors present.
                // But let's just initialize empty.
            } catch (e) { }

            // Update variants
            for (let v = 0; v < 5; v++) {
                const colorIdx = variantIndices[v].color;
                const imageIdx = variantIndices[v].image;
                const hexIdx = variantIndices[v].hex;

                // If there is a color name, update the image and hex
                if (values[colorIdx] && values[colorIdx].trim() !== '') {
                    values[imageIdx] = "https://placehold.co/600x600/ffffff/ffffff.png";
                    values[hexIdx] = "#111111";

                    // Update colorCodes object
                    colorCodesObj[values[colorIdx]] = "#111111";
                }
            }

            // Update colorCodes column
            if (colorCodesIndex !== -1) {
                // We need to escape quotes for CSV
                const jsonString = JSON.stringify(colorCodesObj);
                // In CSV, double quotes inside a field must be escaped by another double quote
                values[colorCodesIndex] = jsonString;
            }
        }

        updatedLines.push(valuesToCSVLine(values));
    }

    fs.writeFileSync(csvPath, updatedLines.join('\n'));
    console.log('Successfully updated products_export.csv with placeholders for IDs 3-102.');

} catch (error) {
    console.error('Error updating CSV:', error);
}

function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                currentValue += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    values.push(currentValue);
    return values;
}

function valuesToCSVLine(values) {
    return values.map(val => {
        if (val === null || val === undefined) return '';
        const stringVal = String(val);
        // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    }).join(',');
}
