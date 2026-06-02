require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'code';
const QDRANT_CONFIGURED = Boolean(QDRANT_URL && process.env.QDRANT_API_KEY);

function getDashboardUrl() {
    return `${QDRANT_URL.replace(/\/$/, '')}/dashboard`;
}

function createClient() {
    if (!QDRANT_CONFIGURED) return null;
    return new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
}

async function getCollectionInfo() {
    const client = createClient();
    if (!client) {
        return { configured: false, dashboardUrl: getDashboardUrl() };
    }

    try {
        const collection = await client.getCollection(QDRANT_COLLECTION);
        const vectors = collection.config?.params?.vectors;

        return {
            configured: true,
            name: QDRANT_COLLECTION,
            dashboardUrl: getDashboardUrl(),
            cloudConsoleUrl: 'https://cloud.qdrant.io',
            pointsCount: collection.points_count,
            vectorsCount: collection.vectors_count,
            status: collection.status,
            vectorSize: vectors?.size,
            distance: vectors?.distance,
        };
    } catch (err) {
        return {
            configured: true,
            name: QDRANT_COLLECTION,
            dashboardUrl: getDashboardUrl(),
            cloudConsoleUrl: 'https://cloud.qdrant.io',
            error: err.message,
        };
    }
}

async function scrollPoints(limit = 20) {
    const client = createClient();
    if (!client) return [];

    const result = await client.scroll(QDRANT_COLLECTION, {
        limit,
        with_payload: true,
        with_vector: false,
    });

    return result.points.map((point) => ({
        id: point.id,
        file: point.payload?.file,
        functions: point.payload?.functions || [],
        classes: point.payload?.classes || [],
    }));
}

module.exports = {
    createClient,
    getCollectionInfo,
    scrollPoints,
    getDashboardUrl,
    QDRANT_COLLECTION,
    QDRANT_CONFIGURED,
};
