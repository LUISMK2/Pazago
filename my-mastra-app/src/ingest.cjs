require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pg = new Client({ connectionString: process.env.DATABASE_URL });
const INPUT_DIR = path.join(process.cwd(), "data", "txt");

function chunkText(text, size = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function run() {
  await pg.connect();
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".txt"));
  console.log("Found", files.length, "text files");

  for (const file of files) {
    const txt = fs.readFileSync(path.join(INPUT_DIR, file), "utf8");
    const year = parseInt(file.match(/\d{4}/)?.[0] || "0");
    const chunks = chunkText(txt, 1000, 200);

    console.log(`→ ${file} (${chunks.length} chunks)`);

    for (let i = 0; i < chunks.length; i++) {
         const chunk = chunks[i];
      const embResp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks[i],
      });
      const embedding = embResp.data[0].embedding;

   await pg.query(
  "INSERT INTO documents (source, year, chunk_index, text, embedding) VALUES ($1,$2,$3,$4,$5::vector)",
  [file, year, i, chunk, `[${embedding.join(",")}]`]
);

      
    }
    console.log("   ✅ Ingested", file);
  }

  await pg.end();
  console.log("All files ingested!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
