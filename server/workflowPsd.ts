import { lightParsePSD, parsePSDFromBuffer, MAX_FILE_SIZE } from './tools/psdParser.ts';

// Minimal type shims
interface DurableObjectState { storage: any }
interface DurableObjectId {}

interface WorkflowStateMeta {
  fileName: string;
  createdAt: number;
  updatedAt: number;
  steps: string[]; // completed steps
  status: 'pending' | 'running' | 'error' | 'done';
  error?: string;
  fileSize?: number;
  strategy?: string;
  light?: any;
  full?: any;
  conversion?: any;
  validation?: any;
  config?: any;
}

/**
 * Multi-step PSD workflow Durable Object
 * Steps: analyze -> light-parse -> full-parse -> convert -> validate
 */
export class PsdWorkflow {
  state: DurableObjectState;
  env: any;
  meta: WorkflowStateMeta | null = null;
  bufferChunks: Uint8Array[] = [];

  constructor(state: DurableObjectState, env: any){
    this.state = state;
    this.env = env;
  }

  private async load(){
    if(!this.meta){
      this.meta = await this.state.storage.get('meta');
    }
  }
  private async save(){
    if(this.meta){
      this.meta.updatedAt = Date.now();
      await this.state.storage.put('meta', this.meta);
    }
  }

  async init(body: any){
    await this.load();
    if(this.meta) return { success:false, error:'ALREADY_INITIALIZED' };
    const { fileName, config } = body;
    this.meta = { fileName, createdAt: Date.now(), updatedAt: Date.now(), steps: [], status: 'pending', config };
    await this.save();
    return { success:true };
  }

  async append(body: any){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    const { chunkBase64 } = body;
    const bin = atob(chunkBase64);
    const arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    this.bufferChunks.push(arr);
    const size = this.bufferChunks.reduce((a,c)=>a+c.byteLength,0);
    this.meta.fileSize = size;
    await this.save();
    return { success:true, receivedBytes: size };
  }

  private assemble(): Uint8Array {
    const totalSize = this.bufferChunks.reduce((a,c)=>a+c.byteLength,0);
    const out = new Uint8Array(totalSize);
    let offset = 0;
    for(const c of this.bufferChunks){ out.set(c, offset); offset += c.byteLength; }
    return out;
  }

  async stepAnalyze(){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    if(this.meta.steps.includes('analyze')) return { success:true, cached:true, analyze: { fileSize: this.meta.fileSize } };
    const size = this.meta.fileSize || this.bufferChunks.reduce((a,c)=>a+c.byteLength,0);
    this.meta.fileSize = size;
    const strategy = size > 40*1024*1024 ? 'chunked' : size > 20*1024*1024 ? 'standard' : 'fast';
    this.meta.strategy = strategy;
    this.meta.steps.push('analyze');
    await this.save();
    return { success:true, strategy, fileSize: size };
  }

  async stepLight(){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    if(this.meta.steps.includes('light')) return { success:true, cached:true, light: this.meta.light };
    const buf = this.assemble();
    const light = await lightParsePSD(buf);
    this.meta.light = light;
    this.meta.steps.push('light');
    await this.save();
    return { success:true, light };
  }

  async stepFull(){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    if(this.meta.steps.includes('full')) return { success:true, cached:true, full: this.meta.full };
    const buf = this.assemble();
    if(buf.byteLength > MAX_FILE_SIZE) return { success:false, error:'FILE_TOO_LARGE' };
    const full = await parsePSDFromBuffer(buf, this.meta.fileName);
    this.meta.full = full;
    this.meta.steps.push('full');
    await this.save();
    return { success:true, full };
  }

  async stepConvert(body: any){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    if(this.meta.steps.includes('convert')) return { success:true, cached:true, conversion: this.meta.conversion };
    // O conversor atual é endpoint separado; aqui apenas stub
    const { targetFramework='vanilla', responsive=true } = body || {};
    // Simplified conversion stub
    const conversion = { html: '<div>stub</div>', css: '/* stub */', framework: targetFramework, responsive };
    this.meta.conversion = conversion;
    this.meta.steps.push('convert');
    await this.save();
    return { success:true, conversion };
  }

  async stepValidate(){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    if(this.meta.steps.includes('validate')) return { success:true, cached:true, validation: this.meta.validation };
    // Simple validation stub
    const validation = { similarity: 0.93, issues: [], recommendations: [] };
    this.meta.validation = validation;
    this.meta.steps.push('validate');
    this.meta.status = 'done';
    await this.save();
    return { success:true, validation };
  }

  async summary(){
    await this.load();
    if(!this.meta) return { success:false, error:'NO_WORKFLOW' };
    const { fileName, steps, status, strategy, fileSize } = this.meta;
    return { success:true, fileName, steps, status, strategy, fileSize };
  }

  async fetch(request: Request){
    try {
      const url = new URL(request.url);
      const action = url.pathname.split('/').pop();
      if(request.method === 'POST'){
        const bodyText = await request.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        switch(action){
          case 'init': return Response.json(await this.init(body));
          case 'append': return Response.json(await this.append(body));
          case 'analyze': return Response.json(await this.stepAnalyze());
          case 'light': return Response.json(await this.stepLight());
          case 'full': return Response.json(await this.stepFull());
          case 'convert': return Response.json(await this.stepConvert(body));
          case 'validate': return Response.json(await this.stepValidate());
        }
      } else if(request.method === 'GET' && action === 'summary') {
        return Response.json(await this.summary());
      }
      return new Response(JSON.stringify({ success:false, error:'NOT_FOUND' }), { status:404 });
    } catch(e:any){
      return new Response(JSON.stringify({ success:false, error: e.message || 'WF_ERROR' }), { status:500 });
    }
  }
}
