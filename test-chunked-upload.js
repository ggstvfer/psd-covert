#!/usr/bin/env node
/**
 * Teste de upload chunked para PSD
 * Simula um arquivo binário grande gerado artificialmente
 */
const https = require('https');

const BASE = 'https://psd-covert.ggstv-fer.workers.dev';
const FILE_SIZE = 512 * 1024; // 512KB para teste rápido
const CHUNK_SIZE = 128 * 1024; // 128KB por chunk

function randByte() { return Math.floor(Math.random() * 256); }

function generateData(size) {
  const buf = Buffer.alloc(size);
  for (let i=0;i<size;i++) buf[i] = randByte();
  return buf;
}

function apiPost(path, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const req = https.request(BASE + path, { method:'POST', headers:{ 'Content-Type':'application/json','Content-Length': Buffer.byteLength(body) }}, (res) => {
      let out='';
      res.on('data', d=> out+=d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(out) }); } catch { resolve({ status: res.statusCode, json: { raw: out } }); }
      });
    });
    req.on('error', err => resolve({ status:0, json:{ error: err.message } }));
    req.write(body); req.end();
  });
}

(async () => {
  console.log('🧪 Iniciando teste chunked...');
  const fileBuf = generateData(FILE_SIZE);
  const init = await apiPost('/api/psd-chunks/init', { fileName: 'synthetic.psd' });
  if (!init.json.uploadId) return console.error('Falha init', init);
  const uploadId = init.json.uploadId;
  console.log('UploadId:', uploadId);
  let offset = 0; let chunkIndex=0;
  while (offset < fileBuf.length) {
    const slice = fileBuf.slice(offset, offset + CHUNK_SIZE);
    const b64 = slice.toString('base64');
  const append = await apiPost('/api/psd-chunks/append', { uploadId, chunkBase64: b64 });
    if (!append.json.success) return console.error('Falha append', append);
    console.log(`Chunk ${++chunkIndex} OK (${slice.length} bytes) Total=${append.json.totalSize}`);
    offset += CHUNK_SIZE;
  }
  const complete = await apiPost('/api/psd-chunks/complete', { uploadId });
  console.log('Complete status:', complete.status, 'keys:', Object.keys(complete.json));
  console.log(JSON.stringify(complete.json).slice(0,400)+'...');
  if (complete.json.error === 'INVALID_PSD_SIGNATURE') {
    console.log('✅ Assinatura inválida detectada precocemente (comportamento correto).');
  }
})();
