import {validBackup} from './domain.js';
export class CloudError extends Error{constructor(code){super(code);this.code=code;}}
// REST evita la cola de escrituras offline del SDK. ETag evita sobrescribir otro equipo.
export class CloudStore{
  constructor({baseUrl,user,fetcher=(...args)=>fetch(...args)}){this.baseUrl=baseUrl;this.user=user;this.fetcher=fetcher;this.etag=null;this.record=null;this.busy=false;}
  async request(method,body){
    const token=await this.user.getIdToken();
    const url=new URL(`${this.baseUrl}/kiruBilling/v1/users/${encodeURIComponent(this.user.uid)}.json`);
    url.searchParams.set('auth',token);
    const headers={'Content-Type':'application/json'};
    if(method==='GET')headers['X-Firebase-ETag']='true';
    else headers['if-match']=this.etag;
    let response;
    try{response=await this.fetcher(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});}catch{throw new CloudError(method==='GET'?'NETWORK':'UNCERTAIN');}
    if(response.status===412)throw new CloudError('CONFLICT');
    if(response.status===401||response.status===403)throw new CloudError('PERMISSION');
    if(!response.ok)throw new CloudError(method==='GET'?'SERVER':'UNCERTAIN');
    return response;
  }
  async load(){
    if(this.busy)throw new CloudError('BUSY');
    this.busy=true;
    try{const response=await this.request('GET');const raw=await response.json();const etag=response.headers.get('etag');if(!etag)throw new CloudError('ETAG');
      if(raw!==null){if(raw.schema!==1||typeof raw.payload!=='string'||!validBackup(JSON.parse(raw.payload)))throw new CloudError('INVALID');}
      this.etag=etag;this.record=raw;return raw?JSON.parse(raw.payload):null;
    }finally{this.busy=false;}
  }
  async save(data){
    if(this.busy)throw new CloudError('BUSY');
    if(!this.etag)throw new CloudError('NOT_LOADED');
    if(!validBackup(data))throw new CloudError('INVALID');
    this.busy=true;
    try{
      const now=new Date().toISOString();
      const history=Array.isArray(this.record?.history)?this.record.history.slice(-19):[];
      if(this.record)history.push({at:this.record.updatedAt,payload:this.record.payload});
      const record={schema:1,revision:(this.record?.revision||0)+1,updatedAt:now,payload:JSON.stringify(data),history};
      await this.request('PUT',record);
      // El próximo guardado exige una nueva lectura con ETag del servidor.
      this.etag=null;this.record=record;
      return structuredClone(data);
    }finally{this.busy=false;}
  }
  versions(){return (this.record?.history||[]).map((v,index)=>({index,at:v.at})).reverse();}
  version(index){const value=JSON.parse(this.record.history[index].payload);if(!validBackup(value))throw new CloudError('INVALID');return value;}
}
