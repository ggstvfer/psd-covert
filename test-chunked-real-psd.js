#!/usr/bin/env node
/**
 * Upload chunked de um PSD real.
 * Uso: node test-chunked-real-psd.js caminho/do/arquivo.psd [CHUNK_KB]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://psd-covert.ggstv-fer.workers.dev';

function apiPost(p, data){
  return new Promise(res=>{
    const body = JSON.stringify(data);
    const req = https.request(BASE+p,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},r=>{let out='';r.on('data',d=>out+=d);r.on('end',()=>{try{res({status:r.statusCode,json:JSON.parse(out)})}catch{res({status:r.statusCode,json:{raw:out}})}})});req.on('error',e=>res({status:0,json:{error:e.message}}));req.write(body);req.end();
  });
}

(async ()=>{
  const filePath = process.argv[2];
  if(!filePath || !fs.existsSync(filePath)){
    console.error('Informe caminho PSD existente.');
    process.exit(1);
  }
  const chunkKB = parseInt(process.argv[3]||'256');
  const chunkSize = chunkKB*1024;
  const buf = fs.readFileSync(filePath);
  console.log('Arquivo:', filePath, 'Size:', buf.length);
  const init = await apiPost('/api/psd-chunks/init',{fileName:path.basename(filePath), expectedSize: buf.length});
  if(!init.json.uploadId) return console.error('Falha init', init);
  const id = init.json.uploadId;
  let offset=0, idx=0; const start=Date.now();
  while(offset < buf.length){
    const slice = buf.slice(offset, offset+chunkSize);
    const b64 = slice.toString('base64');
    const append = await apiPost('/api/psd-chunks/append',{uploadId:id, chunkBase64:b64, index: idx});
    if(!append.json.success){
      console.error('Falha append', append.json); return;
    }
    const prog = append.json.progress!=null? (append.json.progress*100).toFixed(2)+'%':'?';
    console.log(`Chunk ${idx} bytes=${slice.length} total=${append.json.totalSize} progress=${prog}`);
    offset += chunkSize; idx++;
  }
  const complete = await apiPost('/api/psd-chunks/complete',{uploadId:id});
  console.log('Complete status', complete.status);
  console.log('Metrics:', complete.json.metrics);
  if(complete.json.success){
    console.log('Layers:', complete.json.data.layers.length);
  } else {
    console.log('Erro:', complete.json.error);
  }
  console.log('Tempo total (upload+parse):', Date.now()-start,'ms');
})();
