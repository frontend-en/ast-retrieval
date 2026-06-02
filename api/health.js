const { loadIndex, getStats } = require('../lib/code-index');

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

    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const neo4jEnabled = process.env.NEO4J_ENABLED === 'true';

    let indexStats = null;
    try {
        const index = await loadIndex();
        indexStats = getStats(index);
    } catch (err) {
        indexStats = { error: 'code-index.json not found' };
    }

    return res.status(200).json({
        status: 'ok',
        service: 'ast-retrieval',
        version: require('../package.json').version,
        endpoints: {
            health: '/api/health',
            retrieve: 'POST /api/retrieve',
        },
        config: {
            qdrant: qdrantUrl.replace(/\/\/.*@/, '//***@'),
            qdrantApiKeyConfigured: Boolean(process.env.QDRANT_API_KEY),
            collection: process.env.QDRANT_COLLECTION || 'code',
            openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
            neo4j: neo4jEnabled ? 'enabled' : 'index (code-index.json)',
            index: indexStats,
        },
    });
};
