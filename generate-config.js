const fs = require('fs');
const token = process.env.MAPBOX_TOKEN;
if (!token) {
  throw new Error('MAPBOX_TOKEN environment variable is not set!');
}
fs.writeFileSync('config.js', `window.MAPBOX_TOKEN = "${token}";\n`); 