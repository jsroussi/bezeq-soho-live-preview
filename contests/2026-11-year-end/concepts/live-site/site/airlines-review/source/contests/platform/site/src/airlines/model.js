import {evaluate} from '../../../src/engine.js';
import {attachActivity,getEffectiveResults} from './activity.js';
export {getEffectiveResults} from './activity.js';
// Local synthetic adapter: scoring and eligibility remain in the unchanged canonical engine.
export function applyPublishedSnapshots(data,published={}){
 const model=data?.engineModel,site=data?.site,effective=getEffectiveResults(data,published);
 if(!effective||!effective.applicable.length)return false;
 const {users,results,applicable}=effective;
 const ev=evaluate(model.config,users,results,site.asOf);
 const score=r=>r.projected??r.attainment??null,round=n=>n==null?null:Math.round(n*10000)/10000;
 const weeks=site.stops.map(s=>s.start<=site.asOf?evaluate(model.config,users,results,s.end<site.asOf?s.end:site.asOf):null);
 const order=['first','business','premium'];
 for(const person of site.people){
  const r=ev.reps.find(x=>x.uid===person.key);if(!r)continue;
  const peers=ev.reps.filter(x=>x.sector===r.sector).sort((a,b)=>a.rankAll-b.rankAll),mine=order.indexOf(r.stamps.class??'economy'),up=order.slice(0,mine<0?order.length:mine).reverse().find(c=>peers.some(x=>x.stamps.class===c));
  const toClass=up?{class:up,stamps:Math.max(0,Math.min(...peers.filter(x=>x.stamps.class===up).map(x=>x.stamps.stamps))-r.stamps.stamps+1)}:null;
  const missing=r.threshold.filter(t=>!t.met&&t.actual<t.min).map(t=>({label:t.label,missing:round(t.min-t.actual)}));
  Object.assign(person,{rank:r.rank??null,of:r.qualifiedCount??0,rankAll:r.rankAll,sectorSize:r.sectorSize,value:round(score(r)),attainment:round(r.attainment),qualified:r.qualified,missing,threshold:r.threshold.map(({label,actual,min,met})=>({label,actual,min,met})),parts:r.parts.map(({label,points,target,attainment})=>({label,points,target,attainment})),weeks:weeks.map((w,i)=>w?(w.reps.find(x=>x.uid===r.uid)?.stamps.stamps??0)-(i&&weeks[i-1]?(weeks[i-1].reps.find(x=>x.uid===r.uid)?.stamps.stamps??0):0):null),stampCard:{...r.stamps,class:r.stamps.class??null,place:r.stamps.place??null,rankingPending:r.stamps.rankingPending??null,drawRoute:ev.drawPlan?.routes[r.uid]??null,toClass}});
  const above=peers.find(x=>x.rankAll===r.rankAll-1),below=peers.find(x=>x.rankAll===r.rankAll+1);
  person.toNext=above?round(Math.max(0,score(above)-score(r))):null;person.fromBelow=below?round(Math.max(0,score(r)-score(below))):null;
  person.around=peers.filter(x=>Math.abs(x.rankAll-r.rankAll)<=2).map(x=>({rank:x.rankAll,name:x.name,value:round(score(x)),me:x.uid===r.uid}));
  const row=site.race.find(x=>x.key===person.key);if(row)Object.assign(row,{rank:person.rank,rankAll:r.rankAll,value:person.value,qualified:r.qualified,missing,stamps:r.stamps.stamps,class:r.stamps.class??null,rankingTied:!!r.rankingTied});
 }
 const summary=(unit,rows,competition)=>{
  unit.people=rows.length;unit.qualified=rows.filter(r=>r.qualified).length;unit.average=round(rows.length?rows.reduce((n,r)=>n+(r.value??0),0)/rows.length:null);
  unit.competition=competition??null;unit.standing=competition?.months.find(m=>m.id===site.asOf.slice(0,7))?.attainment??(site.asOf>model.config.period.end?competition?.months.at(-1)?.attainment??null:null);
 };
 for(const t of site.views.teams)summary(t,site.race.filter(r=>r.team===t.name&&r.department===t.department),ev.teams[t.name]?.competition);
 for(const d of site.views.departments)summary(d,site.race.filter(r=>r.department===d.id),ev.departments[d.id]?.competition);
 summary(site.views.division,site.race,ev.management?.division);
 data.meta.localPublishedWeeks=applicable.map(([w])=>w);attachActivity(data,published);return true;
}
