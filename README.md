# AST Retrieval

API поиска по кодовой базе. Prod — **Vercel**.

- Демо-данные: `code-index.json` (в git)
- Опционально: Qdrant Cloud + OpenAI (семантика), Neo4j (граф)

## Деплой на Vercel

1. Push в GitHub
2. [vercel.com/new](https://vercel.com/new) → Import → Framework: **Other**
3. Deploy

### Переменные окружения

**Демо-режим** — env не нужны, работает `code-index.json`.

**Семантический поиск:**

| Variable | Обязательно |
|----------|-------------|
| `OPENAI_API_KEY` | да |
| `QDRANT_URL` | да |
| `QDRANT_API_KEY` | да |
| `QDRANT_COLLECTION` | нет (default: `code`) |
| `NEO4J_ENABLED` | нет (default: `false`) |

После добавления env → **Redeploy**.

```bash
npm i -g vercel && vercel login && vercel link && vercel deploy --prod
```

## API

| Method | URL |
|--------|-----|
| GET | `/` — dashboard (Qdrant + поиск) |
| GET | `/api/health` |
| GET | `/api/qdrant` — stats и точки коллекции |
| POST | `/api/retrieve` |

```bash
curl https://your-app.vercel.app/api/health

curl -X POST https://your-app.vercel.app/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "telegram bot"}'
```

## Проверка

```bash
# health → index.files: 37
curl https://your-app.vercel.app/api/health

# retrieve → vector + graph
curl -X POST https://your-app.vercel.app/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "voice assistant"}'
```

## Обновить данные

```bash
node indexer.js
node vector-db.js   # если Qdrant Cloud
git add code-index.json && git commit && git push
```

Подробнее: [doc/DOC.md](doc/DOC.md)
