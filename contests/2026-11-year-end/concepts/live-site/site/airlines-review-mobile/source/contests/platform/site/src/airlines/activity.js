// Raw quantities remain independent of stamp multipliers and bonuses.
const kinds=[
 ['sales','יחידות מכירה',['biznet','ipc','internet','directory','reseller_existing','reseller_new','realized_biznet','realized_ipc','realized_internet']],
 ['agreements','הסכמים חתומים',['elec_signed']],['forwarded','לידים שהועברו',['elec_forwarded']],
 ['realized','לידים שמומשו',['elec_realized','leads144_solo','leads144_reseller']],
 ['retained','יחידות שנשמרו',['saved_biznet','saved_internet']]
];
const kindByProduct=new Map(kinds.flatMap(([id,,products])=>products.map(p=>[p,id])));
export function getEffectiveResults(data,published={}){
 const model=data?.engineModel,site=data?.site;if(data?.meta?.synthetic!==true||!model||!site)return null;
 const users=model.users.map(({key,...u})=>({...u,uid:key}));let results=model.results.map(({who,...r})=>({...r,uid:who}));
 const names=Array.from({length:6},(_,i)=>'נציג דמה '+String(i+1).padStart(2,'0'));
 const applicable=published&&typeof published==='object'?Object.entries(published).filter(([week,s])=>/^[1-9]$/.test(week)&&s?.synthetic===true&&s.week===week&&s.totals&&typeof s.totals==='object'&&Object.keys(s.totals).length===6&&names.every(n=>Object.hasOwn(s.totals,n)&&Number.isSafeInteger(s.totals[n])&&s.totals[n]>=0&&s.totals[n]<=1000000)&&site.stops[Number(week)-1]?.start<=site.asOf):[];
 for(const [week,snapshot]of applicable){
  const stop=site.stops[Number(week)-1],members=users.filter(u=>names.includes(u.name)),keys=new Set(members.map(u=>u.uid));
  results=results.filter(r=>!(keys.has(r.uid)&&r.product==='biznet'&&r.date>=stop.start&&r.date<=stop.end));
  for(const u of members)results.push({uid:u.uid,product:'biznet',count:snapshot.totals[u.name],date:stop.end<site.asOf?stop.end:site.asOf});
 }
 return {users,results,applicable};
}
function groupsFor(products,partialProducts=new Set()){
 return kinds.filter(([id])=>products.some(p=>p.kind===id)).map(([id,label])=>{
  const rows=products.filter(p=>p.kind===id),known=rows.filter(p=>p.quantity!==null);
  return {id,label,quantity:known.length?known.reduce((n,p)=>n+p.quantity,0):null,partial:rows.some(p=>p.quantity===null||partialProducts.has(p.id))};
 });
}
function expectedProducts(config,sector){
 const rules=config.stamps?.sectors?.[sector]?.rules??[];
 return [...new Set(rules.filter(r=>['per','step','beyond','gate'].includes(r.type)).flatMap(r=>r.type==='gate'?(r.all??[]).flatMap(c=>c.products??[]):r.products??[]))].filter(id=>kindByProduct.has(id));
}
function summaryFor(config,ids,rows,start,end){
 const totals=new Map();for(const row of rows){if(typeof row.date!=='string'||row.date<start||row.date>end||!ids.includes(row.product)||!Number.isFinite(row.count))continue;totals.set(row.product,(totals.get(row.product)??0)+row.count);}
 const products=ids.map(id=>({id,label:config.products?.[id]?.label??id,quantity:totals.get(id)??null,kind:kindByProduct.get(id)}));return {groups:groupsFor(products),products};
}
export function attachActivity(data,published={}){
 const effective=getEffectiveResults(data,published);if(!effective)return false;const {config}=data.engineModel,site=data.site,start=config.period.start,end=site.asOf<config.period.end?site.asOf:config.period.end;
 for(const person of site.people){
  const user=effective.users.find(u=>u.uid===person.key),ids=expectedProducts(config,user?.sector??person.sector),rows=effective.results.filter(r=>r.uid===person.key),summary=summaryFor(config,ids,rows,start,end);
  person.activity={...summary,weeks:site.stops.map(stop=>stop.start>site.asOf?null:summaryFor(config,ids,rows,stop.start>start?stop.start:start,stop.end<end?stop.end:end))};
 }
 return true;
}
function aggregate(summaries){
 const products=new Map(),partialProducts=new Set();
 for(const summary of summaries)for(const product of summary?.products??[]){
  const previous=products.get(product.id);if(product.quantity===null)partialProducts.add(product.id);
  if(!previous)products.set(product.id,{...product});else if(product.quantity!==null)previous.quantity=(previous.quantity??0)+product.quantity;
  if(summary.groups.some(g=>g.id===product.kind&&g.partial))partialProducts.add(product.id);
 }
 const rows=[...products.values()];return {groups:groupsFor(rows,partialProducts),products:rows};
}
export function summarizeActivity(people){
 const summaries=people.map(p=>p.activity).filter(Boolean),summary=aggregate(summaries),count=Math.max(0,...summaries.map(s=>s.weeks?.length??0));
 return {...summary,weeks:Array.from({length:count},(_,i)=>{const weeks=summaries.map(s=>s.weeks?.[i]).filter(Boolean);return weeks.length?aggregate(weeks):null;})};
}
