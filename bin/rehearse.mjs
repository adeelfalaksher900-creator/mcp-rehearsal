#!/usr/bin/env node
import {rehearseWorkflow} from '../src/index.mjs';
import {probeMcp} from '../src/probe.mjs';
import {fixtureAdapter} from '../examples/fixture.mjs';
const args=process.argv.slice(2);
const value=flag=>args[args.indexOf(flag)+1];
if(args.includes('--demo')){
 const bug=args.includes('--bug')?value('--bug'):undefined;
 if(bug&&!['snapshot-undo','missing-consent'].includes(bug))throw Error('Use snapshot-undo or missing-consent');
 const report=await rehearseWorkflow(fixtureAdapter({bug}),{name:bug?`Fictional example with ${bug}`:'Fictional inventory workflow'});
 console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
}else if(args.includes('--probe')){
 try{const report=await probeMcp({url:value('--probe')});console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;}
 catch{console.error('Read-only MCP probe failed. Check endpoint, protocol, access and availability. No tool was called.');process.exitCode=1;}
}else{console.log('Usage: mcp-rehearsal --demo [--bug snapshot-undo|missing-consent]\n       mcp-rehearsal --probe https://your-server.example/mcp\nWorkflow checks execute writes against the disposable adapter you supply. The probe only initializes and lists tools.');process.exitCode=args.length?2:0;}
