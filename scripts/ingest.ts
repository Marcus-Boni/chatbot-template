import "dotenv/config";
import { runIngestion } from "@/core/ingestion/pipeline";

runIngestion()
  .then((r) => { console.log(`Indexado: ${r.documents} documentos, ${r.chunks} chunks.`); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
