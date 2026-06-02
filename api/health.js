const { loadIndex, getStats } = require('../lib/code-index');
const { getCollectionInfo, getDashboardUrl } = require('../lib/qdrant');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    const neo4jEnabled = process.env.NEO4J_ENABLED === 'true';

    let indexStats = null;
    let qdrantStats = null;
    try {
        const index = await loadIndex();
        indexStats = getStats(index);
    } catch (err) {
        indexStats = { error: 'code-index.json not found' };
    }

    try {
        qdrantStats = await getCollectionInfo();
    } catch (err) {
        qdrantStats = { error: err.message, dashboardUrl: getDashboardUrl() };
    }

    return res.status(200).json({
        status: 'ok',
        service: 'ast-retrieval',
        version: require('../package.json').version,
        endpoints: {
            health: '/api/health',
            retrieve: 'POST /api/retrieve',
            qdrant: 'GET /api/qdrant',
        },
        config: {
            qdrant: qdrantStats,
            qdrantApiKeyConfigured: Boolean(process.env.QDRANT_API_KEY),
            collection: process.env.QDRANT_COLLECTION || 'code',
            openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
            neo4j: neo4jEnabled ? 'enabled' : 'index (code-index.json)',
            index: indexStats,
        },
    });
};
