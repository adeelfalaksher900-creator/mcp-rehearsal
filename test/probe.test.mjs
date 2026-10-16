import test from 'node:test';import assert from 'node:assert/strict';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {probeMcp} from '../src/probe.mjs';
test('the official SDK probe negotiates, initializes and discovers without calling any tool',async()=>{
 const methods=[];let executions=0;
 const report=await probeMcp({url:'https://fixture.test/mcp',fetch:async request=>{
  if(request.method==='POST')methods.push((await request.clone().json()).method);
  const server=new McpServer({name:'read-only-probe-fixture',version:'1'});
  server.registerTool('fictional_write',{inputSchema:{},annotations:{readOnlyHint:false}},async()=>{executions++;return {content:[{type:'text',text:'changed'}]};});
  const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});await server.connect(transport);return transport.handleRequest(request);
 }});
 assert.equal(report.failed,0);assert.equal(report.passed,4);assert.equal(report.toolCount,1);assert.equal(executions,0);
 assert.deepEqual(methods,['initialize','notifications/initialized','tools/list']);
});
test('the probe refuses credential-bearing or nonlocal insecure URLs before fetch',async()=>{
 let called=false;const fetch=()=>{called=true;throw Error('Should not fetch');};
 for(const url of ['https://name:secret@example.test/mcp','https://example.test/mcp?token=secret','http://example.test/mcp','file:///etc/passwd'])await assert.rejects(probeMcp({url,fetch}));
 assert.equal(called,false);
});
