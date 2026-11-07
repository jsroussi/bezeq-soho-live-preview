// Standalone static preview builder. Reads no environment credentials or employee files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {attachActivity} from '../site/src/airlines/activity.js';
import {evaluate} from '../src/engine.js';
import {buildSiteData} from '../src/site-data.js';
const platform=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SITE_PATH='contests/2026-11-year-end/concepts/live-site/site';
const repo=path.resolve(platform,'../..');
export function syntheticScenario(asOf='2026-11-05'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||asOf<'2026-10-01'||asOf>'2027-01-31'||!Number.isFinite(new Date(asOf+'T12:00:00Z').getTime())||new Date(asOf+'T12:00:00Z').toISOString().slice(0,10)!==asOf)throw Error('Invalid synthetic scenario date');
 const config=JSON.parse(fs.readFileSync(path.join(repo,'contests/2026-11-year-end/contest.json'),'utf8'));
 config.features={...config.features,revealAhead:false,names:'all'};
 // Destination naming is the owner's preview brief. Preserve every configured calendar date.
 Object.assign(config.journey.stops[3],{landmark:{kind:'fountains',name:'מזרקות בלאג׳יו'}});
 Object.assign(config.journey.stops[4],{landmark:{kind:'pier',name:'מזח ודקלים'}});
 const shapes={
  soho:{biznet:6,ipc:4,internet:3},advertising:{directory:5,reseller_existing:3,reseller_new:2},
  electricity:{elec_signed:32},soho_service:{internet:1,biznet:1,realized_ipc:2,answered_calls:80,removals:12,survey24_points:47,survey24_count:5},
  advertising_service:{directory:1,reseller_existing:1,reseller_new:1,answered_calls:80,removals:15,survey24_points:46,survey24_count:5},
  electricity_service:{elec_forwarded:6,elec_realized:4,survey24_points:46,survey24_count:5},
  electricity_retention:{elec_forwarded:5,elec_realized:4,survey24_points:45,survey24_count:5},
  leads144:{leads144_solo:10,leads144_reseller:8},soho_second_line:{saved_biznet:8,saved_internet:6,answered_calls:80,removals:10,survey24_points:46,survey24_count:5},
  soho_telemeeting:{realized_biznet:3,realized_ipc:2,realized_internet:2}
 };
 const deptBySector={soho:'soho_center',advertising:'advertising_centers',electricity:'electricity_center',soho_service:'soho_center',advertising_service:'advertising_centers',electricity_service:'electricity_center',electricity_retention:'electricity_center',leads144:'advertising_centers',soho_second_line:'soho_center',soho_telemeeting:'soho_field'};
 const profileBySector={soho:'soho_sales',advertising:'advertising_sales',electricity:'electricity_sales',soho_service:'soho_service',advertising_service:'advertising_service',electricity_service:'electricity_service',electricity_retention:'electricity_service',leads144:'voice',soho_second_line:'soho_service',soho_telemeeting:'field_sales'};
 const teams=['צוות דמה אופק','צוות דמה מסלול','צוות דמה זרם','צוות דמה ענן','צוות דמה גל','צוות דמה אור','צוות דמה כוכב','צוות דמה מצפן','צוות דמה גשר','צוות דמה מרחב'];
 const users=[],results=[];let seed=20261101,index=0;
 const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(const [sector,shape]of Object.entries(shapes)){
  const team=teams[index++],department=deptBySector[sector];
  config.teams[team]={kind:config.sectors[sector]?.track==='sales'?'sales':'service',department,targets:{},competitionProfile:profileBySector[sector]};
  for(let i=0;i<6;i++){
   const no=String(users.length+1).padStart(2,'0'),uid='synthetic-demo-person-'+no;
   users.push({uid,name:'נציג דמה '+no,role:'rep',sector,team,department});
   if(i===5)continue; // A real roster member with no results: empty is distinct from missing identity.
   const factor=[2.1,1.15,.7,.35,.12][i];
   for(let day=new Date(config.period.start+'T12:00:00Z');day.toISOString().slice(0,10)<=asOf;day.setUTCDate(day.getUTCDate()+1)){
    if(day.getUTCDay()>4)continue;
    for(const [product,rate]of Object.entries(shape)){
     if(i===4&&['survey24_points','survey24_count','reseller_new'].includes(product))continue; // Deliberately pending input.
     const metric=['answered_calls','survey24_points','survey24_count','removals'].includes(product);
     const count=metric?rate:Math.max(1,Math.round(rate*factor*(.8+rnd()*.4)));
     results.push({uid,product,count,date:day.toISOString().slice(0,10)});
    }
    // Keep the fixed stream stable after retiring historical fixture columns.
    if(sector==='soho')rnd();
    if(['soho_second_line','soho_telemeeting'].includes(sector)){rnd();rnd();}
   }
  }
 }
 const first=users[0];
 const roleDefs={rep:{label:'נציג/ה',code:'DEMO-REP',name:first.name,team:first.team,department:first.department},tl:{label:'ראש צוות',code:'DEMO-TL',name:'ראש צוות דמה',team:first.team,department:first.department},dept_manager:{label:'מנהל/ת מחלקה',code:'DEMO-DEPT',name:'מנהל מחלקת דמה',department:first.department},division_manager:{label:'מנהל/ת אגף',code:'DEMO-DIV',name:'מנהל אגף דמה'},admin:{label:'מנהל/ת תחרות',code:'DEMO-ADMIN',name:'מנהל תחרות דמה'},superadmin:{label:'מנהל/ת מערכת',code:'DEMO-ROOT',name:'מנהל מערכת דמה'}};
 for(const [role,def]of Object.entries(roleDefs))if(role!=='rep')users.push({uid:'synthetic-demo-'+role,name:def.name,role,team:def.team??null,department:def.department??null});
 for(const row of results)if(!config.products[row.product])throw Error('Unknown synthetic product: '+row.product);
 const evaluated=evaluate(config,users,results,asOf);
 const site=buildSiteData(config,evaluated,users,'synthetic-public-preview-seed-not-a-credential',{generatedAt:asOf+'T16:30:00.000Z',results,provenance:{synthetic:true,dataKind:'synthetic'}});
 delete site.idShortcut;
 const places={paris:['PARIS','CDG'],milan:['MILAN','MXP'],marrakech:['MARRAKECH','RAK'],'las-vegas':['LAS VEGAS','LAS'],cancun:['CANCUN','CUN'],tokyo:['TOKYO','HND'],athens:['ATHENS','ATH'],'new-delhi':['NEW DELHI','DEL'],jerusalem:['JERUSALEM','TLV']};
 for(const stop of site.stops)if(stop.he){[stop.en,stop.airport]=places[stop.id]??[stop.id,''];stop.photoExt='webp';stop.focus='center 43%';}

 for(const unit of [...site.views.departments,...site.views.teams,site.views.division])if(!unit.competition&&!unit.targets?.length)unit.standing=null;
 site.features={...site.features,adminUrl:null};
 site.contest.synthetic=true;site.contest.example=true;
 roleDefs.rep.personKey=site.people.find(p=>p.name===first.name).key;
 const data={site,roles:roleDefs,departments:Object.fromEntries(Object.entries(config.departments).filter(([k])=>!k.startsWith('_')).map(([k,v])=>[k,{label:v.label}])),meta:{synthetic:true,seed:20261101,generatedAt:site.generatedAt,sourceCommit:'resolved-at-build',photoCredit:'צילום פריז: מאגר התמונות המאושר של הפרויקט',rulesStatus:'draft',fixturePersonCount:site.people.length}};
 const safeConfig=Object.fromEntries(['id','name','division','example','period','calendar','products','sectors','teams','departments','stamps','rulesRevision','managerCompetition','drawPlan','draws','peakDays','sprints','sprintRules','teamLeaders'].filter(k=>config[k]!==undefined).map(k=>[k,config[k]]));
 const keys=new Map(site.people.map(p=>[p.name,p.key])),identities=new Map(users.filter(u=>u.role==='rep').map(u=>[u.uid,keys.get(u.name)]));
 data.engineModel={config:safeConfig,users:users.filter(u=>u.role==='rep').map(({name,role,sector,team,department})=>({key:keys.get(name),name,role,sector,team,department})),results:results.map(({uid,...r})=>({who:identities.get(uid),...r}))};
 attachActivity(data);
 return {data,config,users,results,evaluated};
}
export async function buildAirlines(output=path.join(platform,'exports/airlines-preview'),assetRoot=process.env.AIRLINES_APPROVED_PREVIEW||'/workspace/bezeq-soho-live-preview',asOf=process.env.AIRLINES_AS_OF||'2026-11-05'){
 const siteDir=path.join(output,SITE_PATH);fs.mkdirSync(siteDir,{recursive:true});
 const {data}=syntheticScenario(asOf);
 data.meta.sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
 const serialized=JSON.stringify(data).replaceAll('<','\\u003c');
 if(/synthetic-demo-person-|"uid"|"pinHash"|"secret"/.test(serialized))throw Error('Private input identity leaked into public payload');
 const source=path.join(platform,'site/src/airlines');
 const compiled=await build({absWorkingDir:platform,entryPoints:{airlines:path.join(source,'main.js'),'airlines-excel':path.join(source,'excel.js')},bundle:true,format:'esm',splitting:true,platform:'browser',target:'es2022',outdir:siteDir,chunkNames:'airlines-chunk-[hash]',minify:true,legalComments:'none',metafile:true,external:['airlines-assets/*']});
 fs.writeFileSync(path.join(siteDir,'airlines-data.js'),'window.AIRLINES_DEMO='+serialized+';\n');
 const assets=path.join(siteDir,'airlines-assets');fs.rmSync(assets,{recursive:true,force:true});fs.mkdirSync(assets,{recursive:true});
 for(const stop of data.site.stops.filter(s=>s.he&&s.photo))for(const phone of [false,true]){
  const name=stop.photo+(phone?'-phone':'')+'.'+stop.photoExt;
  const approved=path.join(assetRoot,'contests/2026-11-year-end/site-photos/web',name);
  fs.copyFileSync(approved,path.join(assets,name));
 }
 for(const weight of ['Regular','Bold','Black'])fs.copyFileSync(path.join(platform,'public/fonts',`Simpler-${weight}.otf`),path.join(assets,`Simpler-${weight}.otf`));
 // Preserve incumbent query links without executing old scripts on the new application.
 const previousLegacy=path.join(assetRoot,SITE_PATH,'airlines-legacy.html');
 const legacy=fs.existsSync(previousLegacy)?previousLegacy:path.join(assetRoot,SITE_PATH,'index.html');
 fs.copyFileSync(legacy,path.join(siteDir,'airlines-legacy.html'));
 const version=data.meta.sourceCommit.slice(0,12);
 fs.writeFileSync(path.join(siteDir,'airlines-bootstrap.js'),`(async()=>{try{await import('./airlines-data.js?v=${version}');await import('./airlines.js?v=${version}');}catch{const root=document.getElementById('root'),box=document.createElement('main'),title=document.createElement('h1'),body=document.createElement('p'),retry=document.createElement('button');box.className='bootstrap-error';box.setAttribute('role','alert');title.textContent='לא הצלחנו להכין את הטיסה';body.textContent='טעינת האתר לא הושלמה. בדקו את החיבור ונסו לרענן את הדף.';retry.type='button';retry.className='button';retry.textContent='ניסיון נוסף';retry.addEventListener('click',()=>location.reload());box.append(title,body,retry);root.replaceChildren(box);}})();\n`);
 const html=`<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="BEZEQ AIRLINES — מסביב לעולם ב־60 יום. אתר הדגמה סינתטי לתחרות אגף סוהו, חשמל ושירותי דיגיטל."><meta name="theme-color" content="#20294D"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'"><title>BEZEQ AIRLINES · מסביב לעולם ב־60 יום</title><link rel="icon" type="image/svg+xml" href="airlines-assets/favicon.svg"><link rel="preload" href="airlines-assets/Simpler-Regular.otf" as="font" type="font/otf" crossorigin><link rel="stylesheet" href="airlines.css?v=${version}"><script src="airlines-route.js?v=${version}"></script><script defer src="airlines-bootstrap.js?v=${version}"></script></head><body><div id="root"><p role="status" style="padding:40px;text-align:center">מתכוננים להמראה…</p></div><noscript>יש להפעיל JavaScript כדי להשתמש באתר ההדגמה.</noscript></body></html>`;
 fs.writeFileSync(path.join(siteDir,'index.html'),html);
 fs.writeFileSync(path.join(siteDir,'airlines-route.js'),`const q=new URLSearchParams(location.search);if(q.has('look')||q.has('demoWeek'))location.replace('airlines-legacy.html'+location.search+location.hash);\n`);
 fs.writeFileSync(path.join(assets,'favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#20294d"/><path d="m37 10-9 29-6-13-13-6 28-10Z" fill="none" stroke="#00aeef" stroke-width="3"/></svg>');
 const staticFiles=new Set(['airlines-data.js','airlines-bootstrap.js','airlines-route.js']);
 const outputs=compiled.metafile.outputs;
 function collect(file){const info=outputs[file];if(!info)return;staticFiles.add(path.basename(file));for(const item of info.imports||[])if(!item.external&&item.kind!=='dynamic-import')collect(item.path);}
 collect(Object.keys(outputs).find(file=>outputs[file].entryPoint&&path.resolve(platform,outputs[file].entryPoint)===path.join(source,'main.js')));
 const initialJavaScriptGzipBytes=[...staticFiles].reduce((sum,file)=>sum+gzipSync(fs.readFileSync(path.join(siteDir,file))).length,0);
 if(initialJavaScriptGzipBytes>100*1024)throw Error('Initial JavaScript exceeds100KiB gzip: '+initialJavaScriptGzipBytes);
 fs.writeFileSync(path.join(output,'airlines-build-metafile.json'),JSON.stringify(compiled.metafile));
 fs.writeFileSync(path.join(siteDir,'airlines-build.json'),JSON.stringify({sourceCommit:data.meta.sourceCommit,synthetic:true,seed:data.meta.seed,asOf:data.site.asOf,people:data.site.people.length,scope:SITE_PATH,initialJavaScriptGzipBytes,initialScripts:[...staticFiles],lazyExcel:'airlines-excel.js'},null,2));
 console.log(JSON.stringify({output,siteDir,people:data.site.people.length,roles:Object.keys(data.roles),asOf:data.site.asOf}));return {siteDir,data};
}
if(process.argv[1]===fileURLToPath(import.meta.url))await buildAirlines(process.argv[2],process.argv[3]);
