const fs = require('fs');
const content = fs.readFileSync('project_circular_results.txt', 'utf8');
const chunks = content.match(/.{1,1000}/gs);
chunks.forEach((chunk, i) => {
    console.log(`--- CHUNK ${i} ---`);
    console.log(chunk);
});
