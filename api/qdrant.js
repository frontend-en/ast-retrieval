const { getCollectionInfo, scrollPoints } = require('../lib/qdrant');

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

    const limit = Math.min(Number(req.query?.limit) || 20, 100);

    try {
        const collection = await getCollectionInfo();
        const points = collection.configured && !collection.error
            ? await scrollPoints(limit)
            : [];

        return res.status(200).json({ collection, points });
    } catch (err) {
        console.error('Qdrant API error:', err);
        return res.status(500).json({ error: err.message });
    }
};
