"use strict";
// src/ingest.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var rag_1 = require("@mastra/rag");
var ai_1 = require("ai");
var openai_1 = require("@ai-sdk/openai");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var pdf_parse_1 = require("pdf-parse");
var pgVector = new rag_1.PgVector(process.env.POSTGRES_CONNECTION_STRING);
var dataDir = path_1.default.join(process.cwd(), 'data');
var indexName = 'berkshire_letters';
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var fileNames, pdfFileNames, allChunks, _loop_1, _i, pdfFileNames_1, fileName, embeddings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting ingestion process...');
                    // 1. Read PDF files from the 'data' directory
                    console.log("Reading files from ".concat(dataDir, "..."));
                    return [4 /*yield*/, promises_1.default.readdir(dataDir)];
                case 1:
                    fileNames = _a.sent();
                    pdfFileNames = fileNames.filter(function (file) { return file.endsWith('.pdf'); });
                    allChunks = [];
                    _loop_1 = function (fileName) {
                        var filePath, fileBuffer, pdfData, doc, chunks, chunksWithMetadata;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    console.log("Processing file: ".concat(fileName, "..."));
                                    filePath = path_1.default.join(dataDir, fileName);
                                    return [4 /*yield*/, promises_1.default.readFile(filePath)];
                                case 1:
                                    fileBuffer = _b.sent();
                                    return [4 /*yield*/, (0, pdf_parse_1.default)(fileBuffer)];
                                case 2:
                                    pdfData = _b.sent();
                                    doc = rag_1.MDocument.fromText(pdfData.text, { source: fileName });
                                    return [4 /*yield*/, doc.chunk({
                                            strategy: 'recursive',
                                            size: 1024, // Appropriate size for financial documents [cite: 339]
                                            overlap: 100,
                                        })];
                                case 3:
                                    chunks = _b.sent();
                                    chunksWithMetadata = chunks.map(function (chunk) { return ({
                                        text: chunk.text,
                                        metadata: { source: fileName }
                                    }); });
                                    allChunks.push.apply(allChunks, chunksWithMetadata);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, pdfFileNames_1 = pdfFileNames;
                    _a.label = 2;
                case 2:
                    if (!(_i < pdfFileNames_1.length)) return [3 /*break*/, 5];
                    fileName = pdfFileNames_1[_i];
                    return [5 /*yield**/, _loop_1(fileName)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("Total chunks created: ".concat(allChunks.length));
                    // 3. Generate embeddings for all chunks in batches [cite: 344]
                    console.log('Generating embeddings...');
                    return [4 /*yield*/, (0, ai_1.embedMany)({
                            model: openai_1.openai.embedding('text-embedding-3-small'),
                            values: allChunks.map(function (chunk) { return chunk.text; }),
                        })];
                case 6:
                    embeddings = (_a.sent()).embeddings;
                    console.log("Embeddings generated: ".concat(embeddings.length));
                    // 4. Store embeddings in the vector database [cite: 343]
                    console.log("Storing embeddings in PgVector index: \"".concat(indexName, "\"..."));
                    return [4 /*yield*/, pgVector.createIndex(indexName, 1536, {
                            recreate: false, // Set to true if you want to clear and rebuild the index
                        })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, pgVector.upsert(indexName, embeddings, allChunks.map(function (chunk) { return chunk.metadata; }) // Pass metadata here
                        )];
                case 8:
                    _a.sent();
                    console.log('✅ Ingestion complete!');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
});
