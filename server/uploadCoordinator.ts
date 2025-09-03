// import { readPsd } from 'ag-psd'; // Dynamic import to reduce bundle size
import { parsePSDFromBuffer, lightParsePSD, MAX_FILE_SIZE } from './tools/psdParser.ts';
// Cloudflare Durable Object types (ambient in workers runtime); declare minimal if not globally available
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DurableObjectState { storage: any }
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DurableObjectId {}

interface SessionMeta {
  fileName: string;
  encoding: 'none' | 'gzip';
  expectedSize?: number;
  createdAt: number;
  firstChunkValidated: boolean;
  size: number;
  chunkCount: number;
  aborted?: boolean;
  completed?: boolean;
  startedAt: number;
  useR2?: boolean;
}

// We'll store binary chunks in DO storage as sequential keys: c:<index>
// And maintain small JSON metadata under key 'meta'

export class UploadCoordinator {
  state: DurableObjectState;
  env: any;
  meta: SessionMeta | null = null;

  constructor(state: DurableObjectState, env: any){
    this.state = state;
    this.env = env;
  }

  async initialize(body: any) {
    const { fileName, encoding = 'none', expectedSize } = body;
    const createdAt = Date.now();
  this.meta = { fileName, encoding, expectedSize, createdAt, firstChunkValidated: false, size: 0, chunkCount: 0, startedAt: createdAt };
    await this.state.storage.put('meta', this.meta);
    return { success: true };
  }

  async append(body: any): Promise<any> {
    const { chunkBase64 } = body;
  if(!this.meta){ this.meta = await this.state.storage.get('meta'); }
    if(!this.meta) return { success:false, error:'NO_SESSION' };
    if(this.meta.aborted) return { success:false, error:'ABORTED' };

    const bin = atob(chunkBase64);
    const arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    let data = arr;
    if(this.meta.encoding === 'gzip'){
      try {
        // @ts-ignore
        const ds = new DecompressionStream('gzip');
        // @ts-ignore
        const decompressed = new Response(new Blob([data]).stream().pipeThrough(ds));
        data = new Uint8Array(await decompressed.arrayBuffer());
      } catch(e){
        return { success:false, error:'GZIP_DECOMPRESS_FAIL' };
      }
    }
    if(!this.meta.firstChunkValidated){
      if(data.length <4 || data[0]!==0x38 || data[1]!==0x42 || data[2]!==0x50 || data[3]!==0x53){
        this.meta.aborted = true;
        await this.state.storage.put('meta', this.meta);
        return { success:false, error:'INVALID_PSD_SIGNATURE', aborted:true };
      }
      this.meta.firstChunkValidated = true;
    }

    if((this.meta.size + data.byteLength) > MAX_FILE_SIZE){
      this.meta.aborted = true;
      await this.state.storage.put('meta', this.meta);
      return { success:false, error:'FILE_TOO_LARGE' };
    }

    // Decide storage backend (R2 for >10MB total cumulative)
    if(!this.meta.useR2 && (this.meta.size + data.byteLength) > 10*1024*1024){
      this.meta.useR2 = true;
    }
    const chunkKey = `c:${this.meta.chunkCount}`;
    if(this.meta.useR2){
      // Store in R2 (each chunk as object)
      const r2Key = `${uploadObjectKey(this.meta.fileName)}/${this.meta.chunkCount}`;
      await this.env.PSD_UPLOADS.put(r2Key, data);
    } else {
      await this.state.storage.put(chunkKey, data); // store raw (decompressed) chunk
    }
    this.meta.size += data.byteLength;
    this.meta.chunkCount += 1;
    await this.state.storage.put('meta', this.meta);
    const progress = this.meta.expectedSize ? +(this.meta.size / this.meta.expectedSize).toFixed(4) : undefined;
    return { success:true, received:data.byteLength, totalSize:this.meta.size, progress, chunkIndex:this.meta.chunkCount-1 };
  }

  async status(): Promise<any> {
    if(!this.meta){ this.meta = await this.state.storage.get('meta'); }
    if(!this.meta) return { success:false, error:'NO_SESSION' };
    const progress = this.meta.expectedSize ? this.meta.size / this.meta.expectedSize : undefined;
    return { success:true, fileName:this.meta.fileName, receivedBytes:this.meta.size, expectedSize:this.meta.expectedSize, progress, chunkCount:this.meta.chunkCount, startedAt:this.meta.startedAt, elapsedMs: Date.now()-this.meta.startedAt };
  }

  async partial(): Promise<any> {
    if(!this.meta){ this.meta = await this.state.storage.get('meta'); }
    if(!this.meta) return { success:false, error:'NO_SESSION' };
    // assemble up to 2MB
  const cap = 2*1024*1024;
    const total = new Uint8Array(Math.min(this.meta.size, cap));
    let offset = 0;
    for(let i=0;i<this.meta.chunkCount;i++){
      if(offset >= cap) break;
      let chunk: Uint8Array | undefined;
      if(this.meta.useR2){
        const r2Key = `${uploadObjectKey(this.meta.fileName)}/${i}`;
        const obj = await this.env.PSD_UPLOADS.get(r2Key);
        if(!obj) break;
        chunk = new Uint8Array(await obj.arrayBuffer());
      } else {
        chunk = await this.state.storage.get(`c:${i}`);
      }
      if(!chunk) break;
      const slice = chunk.byteLength + offset > cap ? chunk.subarray(0, cap - offset) : chunk;
      total.set(slice, offset);
      offset += slice.byteLength;
    }
    try {
      const light = await lightParsePSD(total);
      return { success:true, data:{ fileName: this.meta.fileName, ...light }, receivedBytes: this.meta.size };
    } catch(e:any){
      return { success:false, error: e.message || 'PARTIAL_FAIL' };
    }
  }

  async complete(): Promise<any> {
    if(!this.meta){ this.meta = await this.state.storage.get('meta'); }
    if(!this.meta) return { success:false, error:'NO_SESSION' };
    if(this.meta.aborted) return { success:false, error:'ABORTED' };
    // Stream assemble: build into one Uint8Array (still needed for library parse) but pull from R2 if needed
    const total = new Uint8Array(this.meta.size);
    let offset = 0;
    for(let i=0;i<this.meta.chunkCount;i++){
      let chunk: Uint8Array | undefined;
      if(this.meta.useR2){
        const r2Key = `${uploadObjectKey(this.meta.fileName)}/${i}`;
        const obj = await this.env.PSD_UPLOADS.get(r2Key);
        if(!obj) return { success:false, error:`MISSING_CHUNK_R2_${i}` };
        chunk = new Uint8Array(await obj.arrayBuffer());
      } else {
        chunk = await this.state.storage.get(`c:${i}`);
      }
      if(!chunk) return { success:false, error:`MISSING_CHUNK_${i}` };
      total.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const startParse = Date.now();
    let result = await parsePSDFromBuffer(total, this.meta.fileName);
    const durationMs = Date.now() - startParse;
    const totalSessionMs = Date.now() - this.meta.startedAt;
    const fallbackNoCanvas = !!(result.success && (result as any).data?.metadata?.fallbackNoCanvas);
    const metrics = { totalSize: total.byteLength, chunkCount: this.meta.chunkCount, avgChunk: this.meta.chunkCount? Math.round(total.byteLength / this.meta.chunkCount): total.byteLength, durationMs, parseMs: durationMs, totalSessionMs };
    if(result.success){
      this.meta.completed = true;
      await this.state.storage.put('meta', this.meta);
      return { success:true, data: result.data, metrics, fallbackNoCanvas };
    }
    return { success:false, error: (result as any).error, metrics, fallbackNoCanvas };
  }

  async abort(): Promise<any> {
    if(!this.meta){ this.meta = await this.state.storage.get('meta'); }
    if(!this.meta) return { success:false, error:'NO_SESSION' };
    this.meta.aborted = true;
    await this.state.storage.put('meta', this.meta);
    return { success:true, aborted:true };
  }

  async fetch(request: Request){
    try {
      const url = new URL(request.url);
      const path = url.pathname.split('/').pop();
      if(request.method === 'POST'){
        const body = await request.json();
        switch(path){
          case 'init': return Response.json(await this.initialize(body));
          case 'append': return Response.json(await this.append(body));
          case 'status': return Response.json(await this.status());
          case 'partial': return Response.json(await this.partial());
          case 'complete': return Response.json(await this.complete());
          case 'abort': return Response.json(await this.abort());
        }
      }
      return new Response(JSON.stringify({ success:false, error:'NOT_FOUND' }), { status:404 });
    } catch(e:any){
      return new Response(JSON.stringify({ success:false, error: e.message || 'DO_ERROR' }), { status:500 });
    }
  }
}

export function doUploadCoordinator(env: any){
  return {
    idFromName: (name: string) => (env as any).UPLOAD_COORDINATOR_DO.idFromName(name),
    get: (id: DurableObjectId) => (env as any).UPLOAD_COORDINATOR_DO.get(id)
  };
}

function uploadObjectKey(fileName: string){
  const base = fileName.replace(/[^a-zA-Z0-9._-]/g,'_');
  return `uploads/${base}`;
}
