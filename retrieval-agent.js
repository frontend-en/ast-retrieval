require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAIEmbeddings } = require('@langchain/openai');
const neo4j = require('neo4j-driver');
const { loadIndex, searchFiles, searchCalls } = require('./lib/code-index');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'code';
const NEO4J_ENABLED = process.env.NEO4J_ENABLED === 'true';
const QDRANT_CONFIGURED = Boolean(QDRANT_URL && process.env.QDRANT_API_KEY);

const qdrant = QDRANT_CONFIGURED
    ? new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY })
    : null;
const embeddings = process.env.OPENAI_API_KEY
    ? new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' })
    : null;

const driver = NEO4J_ENABLED
    ? neo4j.driver(
        process.env.NEO4J_URI || 'bolt://localhost:7687',
        neo4j.auth.basic(
            process.env.NEO4J_USER || 'neo4j',
            process.env.NEO4J_PASSWORD || 'password',
        ),
    )
    : null;

function serializeGraphRecords(records) {
    return records.map((record) => ({
        caller: record.get('f.name'),
        related: record.get('related.name'),
    }));
}

async function searchGraphNeo4j(query) {
    const session = driver.session();
    try {
        const graphRes = await session.run(`
            MATCH (f:Function)-[:CALLS*1..3]->(related)
            WHERE f.name CONTAINS $query OR related.name CONTAINS $query
            RETURN f.name, related.name
        `, { query });

        return { graph: serializeGraphRecords(graphRes.records), status: 'ok' };
    } catch (err) {
        console.warn('Neo4j unavailable:', err.message);
        return { graph: searchCalls(query), status: 'fallback', message: err.message };
    } finally {
        await session.close();
    }
}

async function searchGraph(query) {
    if (NEO4J_ENABLED) {
        return searchGraphNeo4j(query);
    }

    return { graph: searchCalls(query), status: 'index' };
}

async function searchVector(query) {
    if (QDRANT_CONFIGURED && embeddings) {
        try {
            const vector = await embeddings.embedQuery(query);
            const vectorRes = await qdrant.search(QDRANT_COLLECTION, {
                vector,
                limit: 5,
                with_payload: true,
            });
            return { vector: vectorRes, source: 'qdrant' };
        } catch (err) {
            console.warn('Qdrant unavailable, fallback to code-index.json:', err.message);
        }
    }

    return { vector: searchFiles(query), source: 'code-index' };
}

async function retrieve(query) {
    await loadIndex();

    const { vector, source: vectorSource } = await searchVector(query);
    const { graph, status: graphStatus, message: graphMessage } = await searchGraph(query);

    return {
        vector,
        vectorSource,
        graph,
        graphStatus,
        ...(graphMessage && { graphMessage }),
    };
}

module.exports = { retrieve, NEO4J_ENABLED, loadIndex };
