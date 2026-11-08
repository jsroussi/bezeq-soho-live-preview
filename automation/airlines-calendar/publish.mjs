// Calendar-only publisher for the explicitly approved public, synthetic preview.
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {calendarPacket,israelDate} from './model.mjs';

export const TARGET_REPOSITORY='jsroussi/bezeq-soho-live-preview';
export const TARGET_BRANCH='gh-pages';
export const SITE_PREFIX='contests/2026-11-year-end/concepts/live-site/site';
export const FEED_PATH=SITE_PREFIX+'/airlines-calendar.js';
export const STATUS_PATH=SITE_PREFIX+'/airlines-calendar-status.json';
export const SOURCE_COMMIT='e1c467fed2279429056badba987a13140a4caa21';
export const SOURCE_TREE='a4139fd6fbfc7f5bd5ffe77213545e1d89109e72';
export const SOURCE_PATH=SITE_PREFIX+'/demo-data/week-9.js';
const PHOTO_PREFIX='contests/2026-11-year-end/site-photos/web/';
const PERIOD={start:'2026-11-01',end:'2026-12-31'};
const PLACES={paris:['PARIS','CDG'],milan:['MILAN','MXP'],marrakech:['MARRAKECH','RAK'],'las-vegas':['LAS VEGAS','LAS'],cancun:['CANCUN','CUN'],tokyo:['TOKYO','HND'],athens:['ATHENS','ATH'],'new-delhi':['NEW DELHI','DEL'],jerusalem:['JERUSALEM','TLV']};
const shaPattern=/^[0-9a-f]{40}$/;
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
export const gitBlobSha=text=>createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex');

// JSON.parse only: even a valid assignment followed by executable code is rejected.
export function parsePinnedCatalog(text){
 assert(typeof text==='string'&&text.length<8_000_000,'Invalid pinned source size');
 const match=/^\s*window\.CONTEST\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(text);
 assert(match,'Pinned source must be a JSON assignment');
 let source;try{source=JSON.parse(match[1]);}catch{throw new Error('Pinned source contains invalid JSON');}
 assert(source?.provenance?.synthetic===true,'Pinned source is not explicitly synthetic');
 assert(source.contest?.start===PERIOD.start&&source.contest?.end===PERIOD.end,'Pinned calendar period mismatch');
 assert(Array.isArray(source.stops)&&source.stops.length===9,'Pinned source must contain nine stops');
 const ids=Object.keys(PLACES);
 const stops=source.stops.map((s,i)=>{
  assert(s&&s.id===ids[i]&&typeof s.he==='string'&&s.he.length>0&&typeof s.country==='string','Pinned destination metadata missing');
  const expectedStart=new Date(Date.UTC(2026,10,1+i*7)).toISOString().slice(0,10);
  const expectedEnd=new Date(Date.UTC(2026,10,5+i*7)).toISOString().slice(0,10);
  assert(s.start===expectedStart&&s.end===expectedEnd,'Pinned destination dates mismatch');
  assert(s.photo===s.id&&/^[a-z]+(?:-[a-z]+)*$/.test(s.photo),'Pinned image name invalid');
  assert(typeof s.look==='string'&&typeof s.line==='string'&&Array.isArray(s.palette)&&s.palette.length===4&&s.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c))&&/^#[0-9a-f]{6}$/i.test(s.accent),'Pinned theme metadata invalid');
  assert(s.landmark&&typeof s.landmark.kind==='string'&&typeof s.landmark.name==='string','Pinned landmark metadata missing');
  // Deliberately never project people, source identifiers, results, prizes or rules.
  const landmark=s.id==='las-vegas'?{kind:'fountains',name:'מזרקות בלאג׳יו'}:s.id==='cancun'?{kind:'pier',name:'מזח ודקלים'}:{kind:s.landmark.kind,name:s.landmark.name};
  return {id:s.id,he:s.he,country:s.country,start:s.start,end:s.end,dial:s.dial??null,ll:s.ll??null,tz:s.tz??null,look:s.look,photo:s.photo,line:s.line,palette:[...s.palette],accent:s.accent,landmark,en:PLACES[s.id][0],airport:PLACES[s.id][1],photoExt:'webp',focus:'center 43%',peaks:[]};
 });
 return {period:{...PERIOD},stops};
}

export function feedSource(packet){
 return 'window.AIRLINES_CALENDAR='+JSON.stringify(packet).replaceAll('<','\\u003c')+";window.dispatchEvent(new CustomEvent('airlines:calendar',{detail:window.AIRLINES_CALENDAR}));\n";
}
export function parseFeed(text){
 const match=/^window\.AIRLINES_CALENDAR=(\{[^\n]*\});window\.dispatchEvent\(new CustomEvent\('airlines:calendar',\{detail:window\.AIRLINES_CALENDAR\}\)\);\n?$/.exec(text);
 assert(match,'Existing calendar feed format is invalid');
 let packet;try{packet=JSON.parse(match[1]);}catch{throw new Error('Existing calendar feed JSON is invalid');}
 assert(packet?.schema===1&&packet.synthetic===true&&packet.channel==='bezeq-airlines-calendar'&&packet.timeZone==='Asia/Jerusalem'&&/^\d{4}-\d{2}-\d{2}$/.test(packet.publishedThrough)&&packet.publishedThrough>='2026-10-31'&&packet.publishedThrough<='2027-01-01','Existing calendar feed identity is invalid');
 return packet;
}

export function parseStatus(text){
 assert(typeof text==='string'&&text.length<4096,'Existing calendar status size invalid');
 let status;try{status=JSON.parse(text);}catch{throw new Error('Existing calendar status JSON invalid');}
 const fields=['schema','synthetic','timeZone','publishedThrough','sourceCommit','origin','publishedAt','runId'];
 assert(status&&typeof status==='object'&&!Array.isArray(status)&&Object.keys(status).every(key=>fields.includes(key)),'Existing calendar status fields invalid');
 assert(status.schema===1&&status.synthetic===true&&status.timeZone==='Asia/Jerusalem'&&status.sourceCommit===SOURCE_COMMIT&&status.origin==='github-actions-calendar','Existing calendar status identity invalid');
 assert(/^\d{4}-\d{2}-\d{2}$/.test(status.publishedThrough)&&status.publishedThrough>='2026-10-31'&&status.publishedThrough<='2027-01-01','Existing calendar status date invalid');
 const instant=new Date(status.publishedAt);
 assert(typeof status.publishedAt==='string'&&Number.isFinite(instant.getTime())&&instant.toISOString()===status.publishedAt,'Existing calendar status time invalid');
 assert(israelDate(instant)===status.publishedThrough,'Existing calendar status time/date mismatch');
 assert(!Object.hasOwn(status,'runId')||typeof status.runId==='string'&&/^\d{1,30}$/.test(status.runId),'Existing calendar status run ID invalid');
 return status;
}

function treeMap(tree){
 assert(tree&&!tree.truncated&&Array.isArray(tree.tree),'Complete Git tree required');
 const map=new Map();
 for(const entry of tree.tree){assert(typeof entry.path==='string'&&!map.has(entry.path)&&shaPattern.test(entry.sha),'Invalid Git tree entry');map.set(entry.path,entry);}
 return map;
}
const sameEntry=(a,b)=>a?.sha===b?.sha&&a?.mode===b?.mode&&a?.type===b?.type;
export function planPublication({packet,sourceTree,targetTree,existingFeed,existingStatus,now,runId}){
 const source=treeMap(sourceTree),target=treeMap(targetTree),content=feedSource(packet),sha=gitBlobSha(content),entries=[];
 let previousStatus;
 if(target.has(FEED_PATH)){
  const feed=target.get(FEED_PATH);assert(feed.type==='blob'&&feed.mode==='100644','Existing calendar feed mode invalid');
  assert(typeof existingFeed==='string'&&gitBlobSha(existingFeed)===feed.sha,'Existing calendar feed integrity mismatch');
  const previous=parseFeed(existingFeed);
  assert(previous.publishedThrough<=packet.publishedThrough,'Calendar rollback refused');
 }
 if(target.has(STATUS_PATH)){
  const status=target.get(STATUS_PATH);assert(status.type==='blob'&&status.mode==='100644','Existing calendar status mode invalid');
  assert(typeof existingStatus==='string'&&gitBlobSha(existingStatus)===status.sha,'Existing calendar status integrity mismatch');
  previousStatus=parseStatus(existingStatus);
  assert(previousStatus.publishedThrough<=packet.publishedThrough,'Calendar status rollback refused');
 }
 for(const stop of packet.stops.filter(s=>s.he)){
  assert(typeof stop.photo==='string'&&/^[a-z]+(?:-[a-z]+)*$/.test(stop.photo),'Revealed image name invalid');
  for(const suffix of ['.webp','-phone.webp']){
   const name=stop.photo+suffix,original=source.get(PHOTO_PREFIX+name),path=SITE_PREFIX+'/airlines-assets/'+name;
   assert(original?.type==='blob'&&original.mode==='100644','Approved revealed image missing or invalid');
   const expected={path,mode:'100644',type:'blob',sha:original.sha};
   if(target.has(path))assert(sameEntry(target.get(path),expected),'Existing revealed asset differs from approved source');
   else entries.push(expected);
  }
 }
 if(target.get(FEED_PATH)?.sha!==sha)entries.push({path:FEED_PATH,mode:'100644',type:'blob',sha});
 const blobs=entries.some(e=>e.path===FEED_PATH)?[{path:FEED_PATH,content,sha}]:[];
 const assetCount=entries.filter(e=>e.path.startsWith(SITE_PREFIX+'/airlines-assets/')).length;
 if(entries.length||!previousStatus||previousStatus.publishedThrough!==packet.publishedThrough){
  assert(runId===undefined||typeof runId==='string'&&/^\d{1,30}$/.test(runId),'Calendar status run ID invalid');
  const instant=new Date(now);assert(Number.isFinite(instant.getTime()),'Calendar status time required');
  const status={schema:1,synthetic:true,timeZone:'Asia/Jerusalem',publishedThrough:packet.publishedThrough,sourceCommit:SOURCE_COMMIT,origin:'github-actions-calendar',publishedAt:instant.toISOString(),...(runId===undefined?{}:{runId})};
  const statusContent=JSON.stringify(status)+'\n';parseStatus(statusContent);
  const statusSha=gitBlobSha(statusContent);
  entries.push({path:STATUS_PATH,mode:'100644',type:'blob',sha:statusSha});
  blobs.push({path:STATUS_PATH,content:statusContent,sha:statusSha});
 }
 return {entries,content,sha,blobs,assetCount};
}

// Validate all non-tree objects and their modes; ancestor tree SHAs necessarily change.
export function verifyTreeDelta(before,after,entries){
 const old=treeMap(before),next=treeMap(after),allowed=new Map(entries.map(e=>[e.path,e]));
 assert(allowed.size===entries.length,'Duplicate planned change');
 for(const [path,entry]of old){
  assert(next.has(path),'Tree deletion refused');
  if(entry.type==='tree')assert(next.get(path).type==='tree'&&next.get(path).mode===entry.mode,'Tree mode/type change refused');
  else assert(sameEntry(next.get(path),allowed.get(path)??entry),'Unrelated blob or mode changed');
 }
 for(const [path,entry]of next){
  if(entry.type==='tree'){
   assert(old.has(path)||entries.some(e=>e.path.startsWith(path+'/')),'Unrelated directory added');
   assert(entry.mode==='040000','Invalid directory mode');
  }else if(!old.has(path))assert(allowed.has(path)&&sameEntry(entry,allowed.get(path)),'Unrelated blob added');
 }
 for(const entry of entries){
  assert(entry.path===FEED_PATH||entry.path===STATUS_PATH||entry.path.startsWith(SITE_PREFIX+'/airlines-assets/'),'Publication path is forbidden');
  assert(entry.sha&&sameEntry(next.get(entry.path),entry),'Planned blob not applied');
  assert(entry.path===FEED_PATH||entry.path===STATUS_PATH||!old.has(entry.path),'Existing asset overwrite refused');
 }
}

export class GithubApiError extends Error{constructor(status,method,path){super(`GitHub API ${method} ${path} failed (${status})`);this.status=status;}}
export function createGithubApi({token,fetchImpl=globalThis.fetch}){
 assert(typeof token==='string'&&token.length>0,'GH_TOKEN or GITHUB_TOKEN is required');
 return {async request(method,path,body){
  assert(/^\/[a-zA-Z0-9_?=./%-]+$/.test(path)&&!path.includes('..'),'Invalid GitHub API path');
  const response=await fetchImpl('https://api.github.com/repos/'+TARGET_REPOSITORY+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw new GithubApiError(response.status,method,path);
  if(response.status===204)return null;
  try{return await response.json();}catch{throw new Error('GitHub API returned invalid JSON');}
 }};
}
async function readBlob(api,entry){
 assert(entry?.type==='blob'&&shaPattern.test(entry.sha),'Expected Git blob');
 const blob=await api.request('GET','/git/blobs/'+entry.sha);
 assert(blob.encoding==='base64'&&typeof blob.content==='string','Git blob encoding mismatch');
 const bytes=Buffer.from(blob.content.replaceAll('\n',''),'base64');
 assert(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===entry.sha,'Git blob integrity mismatch');
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function currentHead(api){const ref=await api.request('GET','/git/ref/heads/'+TARGET_BRANCH);assert(shaPattern.test(ref?.object?.sha),'Invalid branch head');return ref.object.sha;}
async function loadTree(api,commit){const detail=await api.request('GET','/git/commits/'+commit);assert(shaPattern.test(detail?.tree?.sha),'Invalid commit tree');const tree=await api.request('GET','/git/trees/'+detail.tree.sha+'?recursive=1');assert(tree.sha===detail.tree.sha,'Git tree integrity mismatch');return tree;}
async function assertPagesTarget(api){
 const pages=await api.request('GET','/pages');
 assert(pages.source?.branch===TARGET_BRANCH&&pages.source?.path==='/'&&pages.build_type==='legacy','Pages must use legacy gh-pages root');
}
export async function ensurePagesBuild(api,commit){
 await assertPagesTarget(api);
 let latest;
 try{latest=await api.request('GET','/pages/builds/latest');}catch(error){if(error.status!==404)throw error;}
 if(latest?.commit===commit&&['built','building','queued'].includes(latest.status))return {requested:false,status:latest.status};
 const build=await api.request('POST','/pages/builds');
 return {requested:true,status:build?.status??'requested'};
}

export async function publishCalendar({api,now=new Date(),repository=TARGET_REPOSITORY,maxAttempts=3,runId}){
 assert(repository===TARGET_REPOSITORY,'Repository guard refused target');
 assert(Number.isInteger(maxAttempts)&&maxAttempts>=1&&maxAttempts<=5,'Invalid retry bound');
 const instant=new Date(now);assert(Number.isFinite(instant.getTime()),'Invalid calendar time');
 const date=israelDate(instant);
 if(date<'2026-10-31'||date>'2027-01-01')return {changed:false,reason:'outside-2026-calendar'};
 await assertPagesTarget(api);
 const sourceTree=await loadTree(api,SOURCE_COMMIT);
 assert(sourceTree.sha===SOURCE_TREE,'Pinned source tree mismatch');
 const source=treeMap(sourceTree),catalog=parsePinnedCatalog(await readBlob(api,source.get(SOURCE_PATH))),packet=calendarPacket(catalog,instant);
 assert(packet.publishedThrough===date,'Calendar model returned unexpected publication date');
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const head=await currentHead(api),targetTree=await loadTree(api,head),target=treeMap(targetTree);
  const existingFeed=target.has(FEED_PATH)?await readBlob(api,target.get(FEED_PATH)):undefined;
  const existingStatus=target.has(STATUS_PATH)?await readBlob(api,target.get(STATUS_PATH)):undefined;
  const plan=planPublication({packet,sourceTree,targetTree,existingFeed,existingStatus,now:instant,runId});
  if(!plan.entries.length){
   if(await currentHead(api)!==head)continue;
   return {changed:false,date,commit:head,assetCount:0,pages:await ensurePagesBuild(api,head)};
  }
  for(const planned of plan.blobs){
   const blob=await api.request('POST','/git/blobs',{content:planned.content,encoding:'utf-8'});
   assert(blob.sha===planned.sha,'Created calendar blob integrity mismatch');
  }
  const tree=await api.request('POST','/git/trees',{base_tree:targetTree.sha,tree:plan.entries});
  assert(shaPattern.test(tree.sha),'Created tree SHA invalid');
  const verified=await api.request('GET','/git/trees/'+tree.sha+'?recursive=1');
  verifyTreeDelta(targetTree,verified,plan.entries);
  const commit=await api.request('POST','/git/commits',{message:'Advance synthetic preview calendar to '+date,tree:tree.sha,parents:[head]});
  assert(shaPattern.test(commit.sha),'Created commit SHA invalid');
  if(await currentHead(api)!==head)continue;
  try{await api.request('PATCH','/git/refs/heads/'+TARGET_BRANCH,{sha:commit.sha,force:false});}
  catch(error){if([409,422].includes(error.status)&&await currentHead(api)!==head)continue;throw error;}
  return {changed:true,date,commit:commit.sha,assetCount:plan.assetCount,pages:await ensurePagesBuild(api,commit.sha)};
 }
 throw new Error('Branch advanced during bounded publication retries; no forced update attempted');
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const repository=process.env.GITHUB_REPOSITORY??TARGET_REPOSITORY;
  assert(repository===TARGET_REPOSITORY,'Repository guard refused workflow context');
  const result=await publishCalendar({api:createGithubApi({token:process.env.GH_TOKEN??process.env.GITHUB_TOKEN}),repository,runId:process.env.GITHUB_RUN_ID});
  console.log(JSON.stringify(result));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
