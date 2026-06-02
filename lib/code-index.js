const fs = require('fs-extra');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', 'code-index.json');

let cachedIndex = null;

async function loadIndex() {
    if (cachedIndex) return cachedIndex;
    cachedIndex = await fs.readJson(INDEX_PATH);
    return cachedIndex;
}

function getStats(index) {
    return {
        files: Object.keys(index.files).length,
        callers: Object.keys(index.calls).length,
        path: 'code-index.json',
    };
}

function searchFiles(query, limit = 5) {
    const index = cachedIndex;
    if (!index) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];

    return Object.entries(index.files)
        .map(([file, data]) => {
            const methods = Object.values(data.methods || {}).flat();
            const haystack = [file, ...(data.classes || []), ...(data.functions || []), ...methods]
                .join(' ')
                .toLowerCase();
            const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
            return { file, data, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ file, data, score }) => ({
            id: file,
            score: score / terms.length,
            payload: { file, ...data },
        }));
}

function searchCalls(query, limit = 50) {
    const index = cachedIndex;
    if (!index) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];

    const graph = [];

    for (const [caller, callees] of Object.entries(index.calls)) {
        for (const callee of callees) {
            const haystack = `${caller} ${callee}`.toLowerCase();
            const matched = terms.some((term) => haystack.includes(term));
            if (matched) {
                graph.push({ caller, related: callee });
                if (graph.length >= limit) return graph;
            }
        }
    }

    return graph;
}

module.exports = { loadIndex, getStats, searchFiles, searchCalls };
