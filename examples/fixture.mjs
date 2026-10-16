// Small fictional inventory workflow. No server, account or real side effects.
const reject=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
export function fixtureAdapter({bug}={}){
 const createState=()=>({revision:0,context:1,down:false,owned:{choice:null,note:null},protected:{keep:'original',remove:'old'},receipts:{},history:[]});
 return {
  options:['blue','green'],createState,
  observationScope:'Pure JSON state returned by the fictional adapter. No external systems.',observe:s=>structuredClone(s),
  classifyError:e=>e.code||'unexpected',
  prepare:(s,choice)=>{if(s.down)throw Error('Unavailable');return {choice,revision:s.revision,context:s.context};},
  commit:(s,p,{key,confirmed})=>{
   if(!confirmed&&bug!=='missing-consent')reject('approval-required','Approval required');
   if(Object.hasOwn(s.receipts,key))return {state:s,receipt:s.receipts[key]};
   if(s.down)reject('service-unavailable','Unavailable');
   if(p.revision!==s.revision||p.context!==s.context)reject('stale-context','Recheck required');
   const next=structuredClone(s);next.history.push({owned:structuredClone(s.owned),protected:structuredClone(s.protected)});next.revision++;next.owned={choice:p.choice,note:`Selected ${p.choice}`};
   const receipt={revision:next.revision,key};next.receipts[key]=receipt;return {state:next,receipt};
  },
  undo:(s,{confirmed})=>{if(!confirmed)reject('approval-required','Approval required');const next=structuredClone(s),previous=next.history.pop();if(!previous)throw Error('Nothing to undo');next.owned=previous.owned;if(bug==='snapshot-undo')next.protected=previous.protected;next.revision++;return next;},
  invalidateContext:s=>({...s,context:s.context+1}),breakService:s=>({...s,down:true}),
  changeProtected:(s,kind)=>{if(kind==='add')s.protected.added='new';if(kind==='edit')s.protected.keep='edited';if(kind==='remove')delete s.protected.remove;return s;},
  viewProtected:s=>s.protected,viewOwned:s=>s.owned
 };
}
