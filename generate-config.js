const fs = require('fs');

const mapboxToken = process.env.MAPBOX_TOKEN || '';

const configContent = `window.MAPBOX_TOKEN = "${mapboxToken}";\n`;

fs.writeFileSync('config.js', configContent);
console.log('config.js generated with MAPBOX_TOKEN'); 