import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const outFile = `dist/linksweep-v${manifest.version}.zip`;
const files = [
  "manifest.json",
  "LICENSE",
  "README.md",
  "src/background.js",
  "src/options.css",
  "src/options.html",
  "src/options.js",
  "src/popup.css",
  "src/popup.html",
  "src/popup.js",
  "src/rules.js"
];

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < CRC_TABLE.length; i += 1) {
  let crc = i;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  CRC_TABLE[i] = crc >>> 0;
}

await rm("dist", { recursive: true, force: true });
await mkdir(dirname(outFile), { recursive: true });

const entries = [];
const centralDirectory = [];
let offset = 0;

for (const path of files) {
  const data = await readFile(path);
  const name = Buffer.from(path.replaceAll("\\", "/"));
  const crc = crc32(data);
  const localHeader = buildLocalHeader(name, data, crc);
  const centralHeader = buildCentralHeader(name, data, crc, offset);

  entries.push(localHeader, data);
  centralDirectory.push(centralHeader);
  offset += localHeader.length + data.length;
}

const centralStart = offset;
const centralBuffer = Buffer.concat(centralDirectory);
const endRecord = buildEndRecord(files.length, centralBuffer.length, centralStart);

await writeFile(outFile, Buffer.concat([...entries, centralBuffer, endRecord]));
console.log(outFile);

function buildLocalHeader(name, data, crc) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name]);
}

function buildCentralHeader(name, data, crc, localOffset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  return Buffer.concat([header, name]);
}

function buildEndRecord(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
