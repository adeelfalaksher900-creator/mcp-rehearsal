import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {rehearseWorkflow,formatMarkdown} from '../src/index.mjs';import {fixtureAdapter} from '../examples/fixture.mjs';
const run=adapter=>rehearseWorkflow(adapter,{name:'Fixture'});
const failed=(report,id)=>assert.equal(report.checks.find(c=>c.id===id)?.status,'failed');
test('a working adapter passes ten independent contracts and produces deterministic reports',async()=>{
 const a=await run(fixtureAdapter()),b=await run(fixtureAdapter());assert.equal(a.passed,10);assert.equal(a.failed,0);assert.deepEqual(a,b);
 assert.match(formatMarkdown(a),/10 passed, 0 failed/);assert.match(formatMarkdown(a),/Observation boundary/);
});
test('a whole-snapshot undo regression is caught for additions, edits and removals',async()=>{
 const r=await run(fixtureAdapter({bug:'snapshot-undo'}));for(const kind of ['add','edit','remove'])failed(r,`undo-protected-${kind}`);assert.equal(r.failed,3);
});
test('missing consent is a failing contract',async()=>{failed(await run(fixtureAdapter({bug:'missing-consent'})),'approval-required');});
test('always-error adapters cannot pass approval or freshness tests',async()=>{
 const a=fixtureAdapter();a.commit=()=>{throw Error('network timeout with private detail');};const r=await run(a);failed(r,'approval-required');failed(r,'stale-context');assert.ok(r.failed>=8);assert.equal(JSON.stringify(r).includes('private detail'),false);
});
test('no-op approved commits cannot produce a green report',async()=>{
 const a=fixtureAdapter();a.commit=(s,p,{key})=>({state:structuredClone(s),receipt:{key}});const r=await run(a);failed(r,'duplicate-replay');failed(r,'undo-owned');assert.ok(r.failed>=8);
});
test('input mutation during preparation is detected',async()=>{const a=fixtureAdapter(),original=a.prepare;a.prepare=(s,id)=>{const p=original(s,id);s.protected.keep='mutated';return p;};failed(await run(a),'prepare-read-only');});
test('observer detects external changes despite unchanged input JSON',async()=>{
 const a=fixtureAdapter(),original=a.prepare;let writes=0;a.observe=s=>({state:s,writes});a.prepare=(s,id)=>{writes++;return original(s,id);};failed(await run(a),'prepare-read-only');
});
test('changed but feasible context needs a fresh proposal and successful commit',async()=>{
 const a=fixtureAdapter(),original=a.commit;a.commit=(s,p,o)=>original(s,{...p,context:s.context},o);failed(await run(a),'stale-context');
 const b=fixtureAdapter(),prepare=b.prepare;b.prepare=(s,id)=>{if(s.context>1)throw Error('unavailable');return prepare(s,id);};failed(await run(b),'stale-context');
});
test('duplicate-key replay must preserve both state and receipt',async()=>{
 const a=fixtureAdapter(),original=a.commit;a.commit=(s,p,o)=>{const r=original(s,p,o);if(Object.hasOwn(s.receipts,o.key))return {...r,state:{...r.state,revision:r.state.revision+1}};return r;};failed(await run(a),'duplicate-replay');
});
test('an ignored service failure is not a passing rejection',async()=>{
 const a=fixtureAdapter(),original=a.commit;a.commit=(s,p,o)=>original({...s,down:false},p,o);failed(await run(a),'failure-atomicity');
});
test('undo must require approval and restore the prior owned record',async()=>{
 const a=fixtureAdapter(),original=a.undo;a.undo=(s)=>original(s,{confirmed:true});failed(await run(a),'undo-approval');
 const b=fixtureAdapter();b.undo=s=>structuredClone(s);failed(await run(b),'undo-owned');
});
test('adapter setup errors are explicit and report markdown is escaped',async()=>{
 await assert.rejects(run({}),/createState/);const a=fixtureAdapter();a.options=['blue','blue'];await assert.rejects(run(a),/distinct/);
 const report=await rehearseWorkflow(fixtureAdapter(),{name:'A|B\nC'});assert.match(formatMarkdown(report),/A\\\|B C/);
});
test('CLI exits nonzero for its intentionally broken fixture',()=>{
 const cli=new URL('../bin/rehearse.mjs',import.meta.url),r=spawnSync(process.execPath,[cli.pathname,'--demo','--bug','snapshot-undo'],{encoding:'utf8'});
 assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).failed,3);
});

test('a response claiming a write cannot pass when the independent observer sees no change',async()=>{const a=fixtureAdapter(),baseline=a.createState();a.observe=()=>structuredClone(baseline);const r=await run(a);failed(r,'duplicate-replay');failed(r,'undo-owned');assert.ok(r.failed>=8);});
