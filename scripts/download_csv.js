const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTuLe28pznqPjc7LrqZiDee4yxlO2w1KMhjuxP6-nd-FVM6_V6RrTCOHtnowZsjiOKE9H6YeZ4ycUOH/pub?gid=0&single=true&output=csv';
const dest = path.join(__dirname, '..', 'productos.csv');

function download(url, dest) {
    console.log(`Downloading CSV from ${url}...`);
    https.get(url, (response) => {
        // Handle Redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log(`Redirecting to ${response.headers.location}...`);
            download(response.headers.location, dest);
            return;
        }

        if (response.statusCode !== 200) {
            console.error(`Failed to download: ${response.statusCode} ${response.statusMessage}`);
            response.resume();
            return;
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);

        file.on('finish', () => {
            file.close(() => {
                console.log('Download completed.');
            });
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => { });
        console.error(`Error downloading: ${err.message}`);
    });
}

download(url, dest);
