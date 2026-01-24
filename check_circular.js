const fs = require('fs');
const path = require('path');

const rootDir = 'd:/Document/react native work/alphaGameTolo/Alpha-Battle/src';
const visited = new Set();
const stack = [];

function checkCircular(file) {
    if (stack.includes(file)) {
        console.log('⭕ CIRCULAR DEPENDENCY DETECTED:');
        console.log(stack.concat(file).join(' -> '));
        return;
    }
    if (visited.has(file)) return;

    visited.add(file);
    stack.push(file);

    try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = content.match(/^import .* from ['"](.*)['"]/gm) || [];

        for (let imp of imports) {
            let targetPath = imp.match(/from ['"](.*)['"]/)[1];
            if (targetPath.startsWith('.')) {
                let resolved = path.resolve(path.dirname(file), targetPath);
                if (fs.existsSync(resolved + '.tsx')) resolved += '.tsx';
                else if (fs.existsSync(resolved + '.ts')) resolved += '.ts';
                else if (fs.existsSync(resolved + '/index.tsx')) resolved += '/index.tsx';
                else if (fs.existsSync(resolved + '/index.ts')) resolved += '/index.ts';
                else continue;

                checkCircular(resolved);
            }
        }
    } catch (e) { }

    stack.pop();
}

const files = [];
function getFiles(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) getFiles(fullPath);
        else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) checkCircular(fullPath);
    });
}

getFiles(rootDir);
console.log('✅ Dependency check finished.');
