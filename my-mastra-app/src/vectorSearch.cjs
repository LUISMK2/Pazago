require("dotenv").config();
const { Client } = require("pg");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pg = new Client({ connectionString: process.env.DATABASE_URL });

async function vectorSearch(query, topK = 3) {
  await pg.connect();

  // 1. Embed the query
  const embResp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = embResp.data[0].embedding;

  // 2. Search most similar chunks
  const result = await pg.query(
    `
    SELECT source, year, chunk_index, text,
           1 - (embedding <=> $1::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> $1::vector
    LIMIT $2;
    `,
    [`[${embedding.join(",")}]`, topK]
  );

  await pg.end();
  return result.rows;
}

// Run if called directly
(async () => {
  const query = process.argv.slice(2).join(" ") || "What does Buffett think about cryptocurrency?";
  console.log("🔍 Query:", query);

  const results = await vectorSearch(query, 3);
  results.forEach((row, i) => {
    console.log(`\n#${i + 1} (${row.source}, ${row.year}) [sim=${row.similarity.toFixed(3)}]`);
    console.log(row.text.slice(0, 400), "...");
  });
})();
