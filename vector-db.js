require('dotenv').config();
const crypto = require('crypto');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { OpenAIEmbeddings } = require('@langchain/openai');
const fs = require('fs-extra');

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
});
const COLLECTION = process.env.QDRANT_COLLECTION || 'code';
const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });

function fileToPointId(file) {
    const hex = crypto.createHash('md5').update(file).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function buildVector() {
    const index = await fs.readJson('code-index.json');
    await qdrant.recreateCollection(COLLECTION, { vectors: { size: 1536, distance: 'Cosine' } });

    for (const [file, data] of Object.entries(index.files)) {
        const text = JSON.stringify(data);
        const vector = await embeddings.embedQuery(text);
        await qdrant.upsert(COLLECTION, {
            points: [{ id: fileToPointId(file), vector, payload: { file, ...data } }]
        });
    }
    console.log('✅ Qdrant вектора готовы');
}

buildVector().catch((err) => {
    console.error(err);
    process.exit(1);
});