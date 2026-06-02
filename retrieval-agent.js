require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAIEmbeddings } = require('@langchain/openai');
const neo4j = require('neo4j-driver');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'code';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const qdrant = new QdrantClient({ url: QDRANT_URL });
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });

function serializeGraphRecords(records) {
    return records.map((record) => ({
        caller: record.get('f.name'),
        related: record.get('related.name'),
    }));
}

async function retrieve(query) {
    const vector = await embeddings.embedQuery(query);
    const vectorRes = await qdrant.search(QDRANT_COLLECTION, {
        vector,
        limit: 5,
        with_payload: true,
    });

    const session = driver.session();
    try {
        const graphRes = await session.run(`
            MATCH (f:Function)-[:CALLS*1..3]->(related)
            WHERE f.name CONTAINS $query OR related.name CONTAINS $query
            RETURN f.name, related.name
        `, { query });

        return {
            vector: vectorRes,
            graph: serializeGraphRecords(graphRes.records),
        };
    } finally {
        await session.close();
    }
}

module.exports = { retrieve };
