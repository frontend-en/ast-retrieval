require('dotenv').config();
const neo4j = require('neo4j-driver');
const fs = require('fs-extra');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const session = driver.session();

async function buildGraph() {
    const index = await fs.readJson('code-index.json');
    await session.run('MATCH (n) DETACH DELETE n'); // чистим

    for (const [caller, callees] of Object.entries(index.calls)) {
        for (const callee of callees) {
            await session.run(`
        MERGE (c:Function {name: $caller})
        MERGE (t:Function {name: $callee})
        MERGE (c)-[:CALLS]->(t)
      `, { caller, callee });
        }
    }
    console.log('✅ Neo4j граф построен');
}

buildGraph().then(() => session.close());