import { Client } from "pg";
import OpenAI from "openai";
import { Tool } from "@mastra/core";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function vectorSearch(query: string, topK = 3) {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const embResp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = embResp.data[0].embedding;

  const result = await pg.query(
    `SELECT source, text, 1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2;`,
    [`[${embedding.join(",")}]`, topK]
  );

  await pg.end();
  return result.rows;
}

export const berkshireTool: Tool = {
  id: "berkshire-search",
  description: "Retrieve relevant passages from Buffett's letters.",
  
  // 1. Define the tool's expected input using the 'input' property
  input: z.object({
    query: z.string().describe("The user query to search the letters"),
  }),

  // 2. The 'execute' function receives the parsed input directly
  execute: async ({ query }) => {
    const results = await vectorSearch(query, 3);
    
    return results.map((r: any) => ({
      source: r.source,
      text: r.text.slice(0, 500) + "...",
    }));
  },
};