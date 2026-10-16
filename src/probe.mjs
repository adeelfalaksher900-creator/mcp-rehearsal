import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/** Read-only: initialize, initialized notification and tools/list. No tools/call. */
export async function probeMcp({url,fetch:fetcher=globalThis.fetch,protocol='2025-11-25'}={}){
 const endpoint=new URL(url);
 if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new TypeError('Use an endpoint without embedded credentials, query or fragment');
 if(endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)))throw new TypeError('Use HTTPS, or loopback HTTP for a local server');
 const messages=[],client=new Client({name:'mcp-rehearsal-read-only',version:'0.1.0'});
 const transport=new StreamableHTTPClientTransport(endpoint,{fetch:async(u,o)=>{
  const request=new Request(u,o);
  if(request.method==='POST'){
   const body=await request.clone().json();
   if(!['initialize','notifications/initialized','tools/list'].includes(body.method))throw new Error('Probe refused a non-read-only operation');
   messages.push({method:body.method,version:request.headers.get('mcp-protocol-version')});
  }
  return fetcher(request);
 }});
 try{
  await client.connect(transport,{timeout:5000});
  const {tools}=await client.listTools({}, {timeout:5000});
  const sequence=messages.slice(0,3).map(x=>x.method),checks=[
   {id:'protocol',status:transport.protocolVersion===protocol?'passed':'failed'},
   {id:'lifecycle',status:JSON.stringify(sequence)===JSON.stringify(['initialize','notifications/initialized','tools/list'])?'passed':'failed'},
   {id:'version-headers',status:messages.filter(x=>x.method!=='initialize').every(x=>x.version===protocol)?'passed':'failed'},
   {id:'tool-discovery',status:tools.length>0?'passed':'failed'}
  ];
  return {schemaVersion:1,scope:'Read-only handshake and discovery, not full protocol conformance or behavior certification.',protocol:transport.protocolVersion,toolCount:tools.length,methods:sequence,passed:checks.filter(x=>x.status==='passed').length,failed:checks.filter(x=>x.status==='failed').length,checks};
 }finally{await client.close();}
}
