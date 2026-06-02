const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const glob = require('glob');
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

const PROJECT_ROOT = '../../agents/greym';
const INDEX_FILE = 'code-index.json';

let index = { files: {}, calls: {} };

function parseFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });

    const fileData = { classes: [], functions: new Set(), methods: {} };
    const functionStack = [];

    traverse(ast, {
        ClassDeclaration(p) {
            const name = p.node.id.name;
            fileData.classes.push(name);
            fileData.methods[name] = [];
        },
        ClassMethod(p) {
            const className = p.parentPath?.parent?.id?.name || 'unknownClass';
            const methodName = p.node.key.name || 'constructor';
            if (!fileData.methods[className]) fileData.methods[className] = [];
            fileData.methods[className].push(methodName);
        },
        FunctionDeclaration(p) {
            const name = p.node.id.name;
            fileData.functions.add(name);
            functionStack.push(name);
        },
        VariableDeclarator(p) {
            if (p.node.init && (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')) {
                const name = p.node.id.name;
                fileData.functions.add(name);
                functionStack.push(name);
            }
        },
        ExportNamedDeclaration(p) {
            if (!p.node.declaration) return;
            const decl = p.node.declaration;
            // 1. export async function name()
            if (decl.type === 'FunctionDeclaration') {
                const name = decl.id.name;
                fileData.functions.add(name);
                functionStack.push(name);
            }
            // 2. export const name = () => {}
            else if (decl.type === 'VariableDeclaration') {
                decl.declarations.forEach(dec => {
                    if (dec.init && (dec.init.type === 'ArrowFunctionExpression' || dec.init.type === 'FunctionExpression')) {
                        const name = dec.id.name;
                        fileData.functions.add(name);
                        functionStack.push(name);
                    }
                });
            }
        },
        CallExpression(p) {
            const caller = functionStack[functionStack.length - 1] || 'unknown';
            let callee = 'dynamic';
            if (p.node.callee.type === 'Identifier') callee = p.node.callee.name;
            else if (p.node.callee.type === 'MemberExpression' && p.node.callee.property?.type === 'Identifier') {
                callee = p.node.callee.property.name;
            }
            if (!index.calls[caller]) index.calls[caller] = [];
            index.calls[caller].push(callee);
        },
        FunctionDeclaration: { exit() { if (functionStack.length) functionStack.pop(); } },
        ArrowFunctionExpression: { exit() { if (functionStack.length) functionStack.pop(); } },
        FunctionExpression: { exit() { if (functionStack.length) functionStack.pop(); } }
    });

    fileData.functions = Array.from(fileData.functions);
    index.files[filePath] = fileData;
}

console.log('🚀 Переиндексируем проект...');
glob.sync('**/*.{js,ts,jsx,tsx}', { cwd: PROJECT_ROOT, ignore: ['node_modules/**', 'dist/**', '.git/**'] })
    .forEach(file => parseFile(path.join(PROJECT_ROOT, file)));

fs.writeJsonSync(INDEX_FILE, index, { spaces: 2 });
console.log(`✅ ГОТОВО! Файлов: ${Object.keys(index.files).length} | Вызовов: ${Object.keys(index.calls).length}`);

chokidar.watch('**/*.{js,ts,jsx,tsx}', { ignored: ['node_modules', 'dist', '.git'] })
    .on('change', file => { console.log(`🔄 Переиндекс: ${file}`); parseFile(file); fs.writeJsonSync(INDEX_FILE, index, { spaces: 2 }); });