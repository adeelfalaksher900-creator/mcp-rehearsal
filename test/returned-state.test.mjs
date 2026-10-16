import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseWorkflow} from '../src/index.mjs';
import {fixtureAdapter} from '../examples/fixture.mjs';
const failed=(r,id)=>assert.equal(r.checks.find(c=>c.id===id)?.status,'failed',id);
function externalAdapter(){
 const a=fixtureAdapter();let store;
 for(const name of ['createState','invalidateContext','breakService','changeProtected','undo']){
  const original=a[name];a[name]=(...args)=>{const result=original(...args);store=structuredClone(result);return result;};
 }
 const commit=a.commit;a.commit=(...args)=>{const result=commit(...args);store=structuredClone(result.state);return result;};
 a.observe=()=>structuredClone(store);a.observationScope='Independent fictional external store in memory, read separately from the response.';return a;
}
test('stale returned undo state cannot pass while the independent store is restored',async()=>{
 const good=await rehearseWorkflow(externalAdapter());assert.equal(good.failed,0);
 const a=externalAdapter(),undo=a.undo;a.undo=(s,o)=>{undo(s,o);return structuredClone(s);};const r=await rehearseWorkflow(a);
 for(const id of ['undo-protected-add','undo-protected-edit','undo-protected-remove','undo-owned','undo-approval'])failed(r,id);
});
test('returned protected records must agree with the independent store after commit',async()=>{
 const a=externalAdapter(),commit=a.commit;a.commit=(...args)=>{const r=commit(...args);return {...r,state:{...r.state,protected:{keep:'incorrect response'}}};};
 const r=await rehearseWorkflow(a);failed(r,'approval-required');failed(r,'duplicate-replay');
});
test('every confirmed undo path rejects input mutation',async()=>{
 const a=fixtureAdapter(),undo=a.undo;a.undo=(s,o)=>{const r=undo(s,o);s.revision++;return r;};const r=await rehearseWorkflow(a);failed(r,'undo-owned');failed(r,'undo-approval');
});
test('proposals containing non-JSON values fail the documented adapter contract',async()=>{
 const a=fixtureAdapter(),prepare=a.prepare;a.prepare=(...args)=>({...prepare(...args),unsupported:()=>true});failed(await rehearseWorkflow(a),'prepare-read-only');
});
