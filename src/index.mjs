const required=['createState','prepare','commit','undo','invalidateContext','breakService','changeProtected','viewProtected','viewOwned','observe','classifyError'];

// Adapter state and projections must contain JSON data. Object key order is immaterial.
function canonical(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 throw new TypeError('Expected finite, acyclic JSON data');
}
const snapshot=value=>JSON.stringify(canonical(value));
const assert=(condition,detail)=>{if(!condition)throw new ContractFailure(detail);};
class ContractFailure extends Error{}
const unchanged=(before,after,detail)=>assert(before===snapshot(after),detail);

/** Run only against disposable fixtures. This function executes writes and undo. */
export async function rehearseWorkflow(adapter,{name='Workflow'}={}){
 for(const method of required)if(typeof adapter?.[method]!=='function')throw new TypeError(`Adapter requires ${method}()`);
 if(!Array.isArray(adapter.options)||adapter.options.length<2||adapter.options[0]===adapter.options[1])throw new TypeError('Adapter requires two distinct feasible options');
 if(typeof adapter.observationScope!=='string'||!adapter.observationScope.trim())throw new TypeError('Describe the observation boundary');
 const [a,b]=adapter.options,checks=[];
 const observed=async s=>{const value=await adapter.observe(s);snapshot(value);return value;};
 const observation=async s=>snapshot(await observed(s));
 const owned=async s=>snapshot(await adapter.viewOwned(await observed(s)));
 const protectedData=async s=>snapshot(await adapter.viewProtected(await observed(s)));
 const commit=async(s,p,key,{replay=false}={})=>{
  const before=snapshot(s),ownedBefore=await owned(s),protectedBefore=await protectedData(s),observedBefore=await observation(s),r=await adapter.commit(s,p,{key,confirmed:true});
  unchanged(before,s,'Commit mutated its input state');
  assert(r&&r.state&&r.receipt,'Commit must return state and receipt');
  snapshot(r.state);
  if(!replay)assert(ownedBefore!==await owned(r.state),'Approved commit made no observable owned change');
  if(replay)assert(observedBefore===await observation(r.state),'Replay changed independently observed state');
  assert(await owned(r.state)===snapshot(await adapter.viewOwned(r.state)),'Returned owned data disagrees with the observer');
  assert(protectedBefore===await protectedData(r.state),'Commit changed protected data');return r;
 };
 const rejectedUnchanged=async(s,operation,category,detail)=>{
  const before=snapshot(s),observedBefore=await observation(s);let rejected=false;
  try{await operation();}catch(e){assert(adapter.classifyError(e)===category,'Unexpected error cannot establish the intended rejection');rejected=true;}
  assert(rejected,detail);unchanged(before,s,'Rejected operation mutated its input state');
  assert(observedBefore===await observation(s),'Rejected operation changed the observed state');
 };
 const cases=[
  ['prepare-read-only','Prepare does not write',async()=>{
   const s=await adapter.createState(),before=snapshot(s),observedBefore=await observation(s),p=await adapter.prepare(s,a);
   assert(p!==null&&p!==undefined,'Prepare did not return a proposal');unchanged(before,s,'Prepare mutated its input state');assert(observedBefore===await observation(s),'Prepare changed the observed state');
  }],
  ['approval-required','Commit requires explicit approval',async()=>{
   const s=await adapter.createState(),p=await adapter.prepare(s,a);
   await rejectedUnchanged(s,()=>adapter.commit(s,p,{key:'rehearsal-no-consent',confirmed:false}),'approval-required','Unconfirmed commit succeeded');
   await commit(s,await adapter.prepare(s,a),'rehearsal-positive-consent');
  }],
  ['duplicate-replay','Duplicate approval has no additional effect',async()=>{
   const s=await adapter.createState(),p=await adapter.prepare(s,a),first=await commit(s,p,'rehearsal-replay'),before=snapshot(first.state);
   const replay=await commit(first.state,p,'rehearsal-replay',{replay:true});unchanged(before,replay.state,'Replay changed state, revision or audit history');
   unchanged(snapshot(first.receipt),replay.receipt,'Replay returned a different receipt');
  }],
  ['stale-context','Changed context rejects the old proposal',async()=>{
   const s=await adapter.createState(),p=await adapter.prepare(s,a),changed=await adapter.invalidateContext(structuredClone(s));
   assert(snapshot(changed)!==snapshot(s),'Adapter did not invalidate context');
   await rejectedUnchanged(changed,()=>adapter.commit(changed,p,{key:'rehearsal-stale',confirmed:true}),'stale-context','Stale proposal was committed');
   await commit(changed,await adapter.prepare(changed,a),'rehearsal-fresh-positive');
  }],
  ['failure-atomicity','Failed commit leaves its input intact',async()=>{
   const initial=await adapter.createState(),baseline=await commit(initial,await adapter.prepare(initial,a),'rehearsal-working-service'),s=baseline.state,p=await adapter.prepare(s,b),failed=await adapter.breakService(structuredClone(s));
   assert(snapshot(failed)!==snapshot(s),'Adapter did not inject a failure');
   await rejectedUnchanged(failed,()=>adapter.commit(failed,p,{key:'rehearsal-failure',confirmed:true}),'service-unavailable','Commit succeeded during the injected failure');
  }],
  ...['add','edit','remove'].map(kind=>[
   `undo-protected-${kind}`,`Undo preserves unrelated ${kind}`,async()=>{
    const s=await adapter.createState(),originalOwned=await owned(s),first=await commit(s,await adapter.prepare(s,a),'rehearsal-scope'),originalProtected=await protectedData(first.state);
    const changed=await adapter.changeProtected(structuredClone(first.state),kind),protectedBefore=await protectedData(changed);
    assert(protectedBefore!==originalProtected,'Adapter did not change protected data');
    const inputBefore=snapshot(changed),restored=await adapter.undo(changed,{confirmed:true});
    unchanged(inputBefore,changed,'Undo mutated its input state');
    assert(protectedBefore===await protectedData(restored),'Undo overwrote unrelated data');
    assert(originalOwned===await owned(restored),'Undo did not restore the original owned data');
   }
  ]),
  ['undo-owned','Undo restores the previous owned change',async()=>{
   const s=await adapter.createState(),first=await commit(s,await adapter.prepare(s,a),'rehearsal-first');
   const firstOwned=await owned(first.state),second=await commit(first.state,await adapter.prepare(first.state,b),'rehearsal-second');
   assert(firstOwned!==await owned(second.state),'Adapter options did not produce different owned data');
   const restored=await adapter.undo(second.state,{confirmed:true});
   assert(firstOwned===await owned(restored),'Undo did not restore the prior approved change');
  }],
  ['undo-approval','Undo also requires explicit approval',async()=>{
   const s=await adapter.createState(),originalOwned=await owned(s),first=await commit(s,await adapter.prepare(s,a),'rehearsal-undo-consent');
   await rejectedUnchanged(first.state,()=>adapter.undo(first.state,{confirmed:false}),'approval-required','Unconfirmed undo succeeded');
   const restored=await adapter.undo(first.state,{confirmed:true});
   assert(originalOwned===await owned(restored),'Confirmed undo did not restore owned data');
  }]
 ];
 for(const [id,title,run]of cases){
  try{await run();checks.push({id,title,status:'passed'});}
  catch(e){checks.push({id,title,status:'failed',detail:e instanceof ContractFailure?e.message:'Adapter threw unexpectedly or returned unsupported JSON data'});}
 }
 return {schemaVersion:1,name,observationScope:adapter.observationScope,scope:'Disposable-fixture workflow contract checks. Not security certification or full MCP conformance.',passed:checks.filter(x=>x.status==='passed').length,failed:checks.filter(x=>x.status==='failed').length,checks};
}

export function formatMarkdown(report){
 const text=value=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
 return `# ${text(report.name)}\n\n${report.passed} passed, ${report.failed} failed.\n\n${text(report.scope)}\n\nObservation boundary: ${text(report.observationScope)}\n\n| Check | Result | Detail |\n| --- | --- | --- |\n${report.checks.map(c=>`| ${text(c.title)} | ${c.status} | ${text(c.detail||'')} |`).join('\n')}\n`;
}
