import JSZip from "jszip";
import { writeFileSync } from "node:fs";

const lines = [
  "Reunião Teste-20260603_120309UTC-Meeting Recording",
  "June 3, 2026, 12:03PM",
  "33s",
  "576072292608Júnio Inácio Rosa | OPTSOLV   0:09Bom dia, Bruno.",
  "576072292608Bruno Francklin de Faria   0:17Bom dia, tudo bom?",
];
const paragraphs = lines
  .map(
    (l) =>
      `<w:p><w:r><w:t xml:space="preserve">${l
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</w:t></w:r></w:p>`,
  )
  .join("");

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const zip = new JSZip();
zip.file("[Content_Types].xml", contentTypes);
zip.folder("_rels").file(".rels", rels);
zip.folder("word").file("document.xml", documentXml);
const buf = await zip.generateAsync({ type: "nodebuffer" });
writeFileSync(new URL("./teams-sample.docx", import.meta.url), buf);
console.log("wrote teams-sample.docx");
