import pg from 'pg';
import OpenAI from "openai";
import { createTool } from "@mastra/core/tools"; // Correct import
import { z } from "zod";

const { Client } = pg;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function vectorSearch(query: string, topK = 3) {
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();

  const embResp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = embResp.data[0].embedding;

  const result = await pgClient.query(
    `SELECT source, text, 1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2;`,
    [`[${embedding.join(",")}]`, topK]
  );

  await pgClient.end();
  return result.rows;
}

// Use the createTool factory function
export const berkshireTool = createTool({
  id: "berkshire-search",
  description: "Retrieve relevant passages from Buffett's letters.",
  
  // Define the schema using inputSchema
  inputSchema: z.object({
    query: z.string().describe("The user query to search the letters"),
  }),

  // Access the arguments from the 'context' object
  execute: async ({ context }) => {
    const { query } = context; 
    const results = await vectorSearch(query, 3);
    
    return results.map((r: any) => ({
      source: r.source,
      text: r.text.slice(0, 500) + "...",
    }));
  },
});