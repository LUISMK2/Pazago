const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const INPUT_DIR = path.join(process.cwd(), "data");

const OUTPUT_DIR = path.join(process.cwd(), "data", "txt");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function extractPdfToText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  let text = data.text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

(async () => {
  ensureDir(OUTPUT_DIR);

  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".pdf"));
  console.log(`Found ${files.length} PDFs — extracting...`);

  for (const file of files) {
    const inPath = path.join(INPUT_DIR, file);
    const outPath = path.join(OUTPUT_DIR, file.replace(/\.pdf$/i, ".txt"));
    const txt = await extractPdfToText(inPath);
    fs.writeFileSync(outPath, txt, "utf8");
    console.log("✅ Saved:", outPath);
  }

  console.log("All PDFs extracted to:", OUTPUT_DIR);
})();
