// src/mastra/ingest.ts

import 'dotenv/config';

import { MDocument,} from '@mastra/rag';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as fs from 'fs/promises'; // Corrected import
import * as path from 'path'; // Corrected import
import * as pdf from 'pdf-parse'; // Corrected import


const dataDir = path.join(process.cwd(), 'data');
const indexName = 'berkshire_letters';

async function main() {
  console.log('Starting ingestion process...');

  // 1. Read PDF files from the 'data' directory
  console.log(`Reading files from ${dataDir}...`);
  const fileNames = await fs.readdir(dataDir);
  const pdfFileNames = fileNames.filter((file) => file.endsWith('.pdf'));

  let allChunks: { text: string; metadata: { source: string } }[] = [];

  // 2. Process each PDF file
  for (const fileName of pdfFileNames) {
    console.log(`Processing file: ${fileName}...`);
    const filePath = path.join(dataDir, fileName);
    const fileBuffer = await fs.readFile(filePath);

    // Parse PDF to extract text
    const pdfData = await pdf.default(fileBuffer); // Use pdf.default() here

    // Create MDocument and chunk it
    const doc = MDocument.fromText(pdfData.text, { source: fileName });
    const chunks = await doc.chunk({
      strategy: 'recursive',
      size: 1024,
      overlap: 100,
    });
    
    // Add file source as metadata to each chunk
    const chunksWithMetadata = chunks.map(chunk => ({
      text: chunk.text,
      metadata: { source: fileName }
    }));

    allChunks.push(...chunksWithMetadata);
  }
  console.log(`Total chunks created: ${allChunks.length}`);

  // 3. Generate embeddings for all chunks in batches
  console.log('Generating embeddings...');
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: allChunks.map(chunk => chunk.text),
  });
  console.log(`Embeddings generated: ${embeddings.length}`);

  // 4. Store embeddings in the vector database
  console.log(`Storing embeddings in PgVector index: "${indexName}"...`);
  await pgVector.createIndex(indexName, 1536, {
    recreate: false,
  });

  await pgVector.upsert(
    indexName,
    embeddings,
    allChunks.map(chunk => chunk.metadata)
  );

  console.log('✅ Ingestion complete!');
}

main().catch((error) => {
  console.error('Ingestion failed:', error);
  process.exit(1);
});