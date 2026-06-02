const { retrieve } = require('../retrieval-agent');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const query = req.body?.query;
    if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Missing or invalid "query" in request body.' });
    }


    try {
        const result = await retrieve(query.trim());
        return res.status(200).json(result);
    } catch (err) {
        console.error('Retrieve error:', err);
        return res.status(500).json({
            error: 'Retrieval failed.',
            message: err.message,
        });
    }
};
