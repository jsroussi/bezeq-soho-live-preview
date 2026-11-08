import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {calendarPacket} from '../site/src/airlines/calendar-model.js';
import {TARGET_REPOSITORY,SOURCE_COMMIT,SOURCE_TREE,SOURCE_PATH,SITE_PREFIX,FEED_PATH,STATUS_PATH,gitBlobSha,parsePinnedCatalog,parseStatus,feedSource,verifyTreeDelta,publishCalendar,createGithubApi,GithubApiError} from '../scripts/airlines-calendar-publish.mjs';

const hash=value=>createHash('sha1').update(JSON.stringify(value)).digest('hex');
const ids=['paris','milan','marrakech','las-vegas','cancun','tokyo','athens','new-delhi','jerusalem'];
const fixture=()=>({provenance:{synthetic:true},contest:{start:'2026-11-01',end:'2026-12-31'},people:[{privateSentinel:'NEVER_PROJECT_THIS'}],results:[{amount:913}],stops:ids.map((id,i)=>({id,he:'מקום '+i,country:'ארץ '+i,start:new Date(Date.UTC(2026,10,1+i*7)).toISOString().slice(0,10),end:new Date(Date.UTC(2026,10,5+i*7)).toISOString().slice(0,10),photo:id,look:'theme'+i,line:'טקסט '+i,palette:['#112233','#445566','#778899','#aabbcc'],accent:'#abcdef',landmark:{kind:'tower',name:'מבנה '+i},winners:[{name:'NEVER_PROJECT_THIS'}]}))});
const sourceText=value=>'window.CONTEST = '+JSON.stringify(value)+';\n';
const catalog=()=>parsePinnedCatalog(sourceText(fixture()));
const treeEntry=(path,sha,mode='100644')=>({path,sha,type:'blob',mode});
const photoPrefix='contests/2026-11-year-end/site-photos/web/';
const resultsPath=SITE_PREFIX+'/airlines-data.js';

// Entirely in-memory Git/Pages API. Fixtures contain no source or employee data.
function fakeApi({existingPacket,existingStatus,source=fixture(),missingImage,omitTargetImage,hook}={}){
 const calls=[],blobs=new Map(),trees=new Map(),commits=new Map();
 const putBlob=content=>{const sha=gitBlobSha(content);blobs.set(sha,content);return sha;};
 const sourceEntries=[treeEntry(SOURCE_PATH,putBlob(sourceText(source)))];
 for(const id of ids)for(const suffix of ['.webp','-phone.webp'])if(id+suffix!==missingImage)sourceEntries.push(treeEntry(photoPrefix+id+suffix,putBlob('synthetic image '+id+suffix)));
 trees.set(SOURCE_TREE,{sha:SOURCE_TREE,truncated:false,tree:sourceEntries});commits.set(SOURCE_COMMIT,{tree:{sha:SOURCE_TREE}});
 const initial=[treeEntry(resultsPath,putBlob('results dated 2026-11-05; sentinel 913')),treeEntry('legacy/executable',putBlob('legacy bytes'),'100755'),{path:'legacy',sha:hash('legacytree'),type:'tree',mode:'040000'},treeEntry('legacy/link',putBlob('../target'),'120000')];
 if(existingPacket){initial.push(treeEntry(FEED_PATH,putBlob(feedSource(existingPacket))));for(const s of existingPacket.stops.filter(s=>s.he))for(const suffix of ['.webp','-phone.webp'])if(s.photo+suffix!==omitTargetImage)initial.push(treeEntry(SITE_PREFIX+'/airlines-assets/'+s.photo+suffix,sourceEntries.find(e=>e.path===photoPrefix+s.photo+suffix).sha));}
 if(existingStatus!==undefined)initial.push(treeEntry(STATUS_PATH,putBlob(typeof existingStatus==='string'?existingStatus:JSON.stringify(existingStatus)+'\n')));
 const addCommit=entries=>{const treeSha=hash(entries);trees.set(treeSha,{sha:treeSha,truncated:false,tree:entries});const sha=hash({treeSha,ordinal:commits.size});commits.set(sha,{tree:{sha:treeSha}});return sha;};
 const state={head:addCommit(initial),latest:null,builds:0,refs:0,initial,blobs,trees,calls};
 state.advance=()=>{const current=trees.get(commits.get(state.head).tree.sha).tree;state.head=addCommit([...current,treeEntry('unrelated-concurrent-'+commits.size,putBlob('concurrent preserved'))]);};
 const api={async request(method,path,body){
  calls.push({method,path,body});
  const overridden=await hook?.({method,path,body,state});if(overridden!==undefined)return overridden;
  if(method==='GET'&&path==='/git/ref/heads/gh-pages')return {object:{sha:state.head}};
  if(method==='GET'&&path.startsWith('/git/commits/'))return commits.get(path.slice('/git/commits/'.length));
  if(method==='GET'&&path.startsWith('/git/trees/'))return trees.get(path.slice('/git/trees/'.length).split('?')[0]);
  if(method==='GET'&&path.startsWith('/git/blobs/'))return {encoding:'base64',content:Buffer.from(blobs.get(path.slice('/git/blobs/'.length))).toString('base64')};
  if(method==='POST'&&path==='/git/blobs')return {sha:putBlob(body.content)};
  if(method==='POST'&&path==='/git/trees'){
   const map=new Map(trees.get(body.base_tree).tree.map(e=>[e.path,e]));for(const e of body.tree)map.set(e.path,e);
   const entries=[...map.values()],sha=hash(entries);trees.set(sha,{sha,truncated:false,tree:entries});return {sha};
  }
  if(method==='POST'&&path==='/git/commits'){const sha=hash(body);commits.set(sha,{tree:{sha:body.tree},parents:body.parents});return {sha};}
  if(method==='PATCH'&&path==='/git/refs/heads/gh-pages'){
   assert.equal(body.force,false);if(commits.get(body.sha).parents[0]!==state.head)throw new GithubApiError(422,method,path);
   state.refs++;state.head=body.sha;return {object:{sha:state.head}};
  }
  if(method==='GET'&&path==='/pages')return {build_type:'legacy',source:{branch:'gh-pages',path:'/'}};
  if(method==='GET'&&path==='/pages/builds/latest'){if(!state.latest)throw new GithubApiError(404,method,path);return state.latest;}
  if(method==='POST'&&path==='/pages/builds'){state.builds++;state.latest={status:'queued',commit:state.head};return state.latest;}
  throw Error('Unhandled fake endpoint '+method+' '+path);
 }};
 state.current=()=>trees.get(commits.get(state.head).tree.sha).tree;
 return {api,state};
}
const noRefWrites=state=>assert.equal(state.calls.filter(c=>c.method==='PATCH').length,0);

test('strict immutable JSON projection excludes results, identities and future source fields',()=>{
 const parsed=catalog();assert.equal(parsed.stops.length,9);assert.equal(parsed.stops[1].start,'2026-11-08');assert.equal(parsed.stops[1].en,'MILAN');
 assert.equal(JSON.stringify(parsed).includes('NEVER_PROJECT_THIS'),false);assert.equal('results'in parsed,false);
 assert.deepEqual(parsed.stops[3].landmark,{kind:'fountains',name:'מזרקות בלאג׳יו'});assert.deepEqual(parsed.stops[4].landmark,{kind:'pier',name:'מזח ודקלים'});
 const coordinates=fixture();Object.assign(coordinates.stops[0],{dial:'+33',ll:[2.35,48.85],tz:'Europe/Paris'});assert.deepEqual(parsePinnedCatalog(sourceText(coordinates)).stops[0].ll,[2.35,48.85]);assert.equal(parsePinnedCatalog(sourceText(coordinates)).stops[0].dial,'+33');assert.equal(parsePinnedCatalog(sourceText(coordinates)).stops[0].tz,'Europe/Paris');
 for(const text of ['window.CONTEST = {}; process.exit();','window.CONTEST = {bad};','window.CONTEST = (()=>({}))();'])assert.throws(()=>parsePinnedCatalog(text));
 const bad=fixture();bad.provenance.synthetic=false;assert.throws(()=>parsePinnedCatalog(sourceText(bad)),/synthetic/);
 const dates=fixture();dates.stops[1].start='2026-11-09';assert.throws(()=>parsePinnedCatalog(sourceText(dates)),/dates/);
});

test('Israel midnight advances only calendar while preserving frozen results and all unrelated modes',async()=>{
 const {api,state}=fakeApi();
 const first=await publishCalendar({api,now:'2026-11-07T21:59:59Z'});assert.equal(first.changed,true);
 const resultBlob=state.current().find(e=>e.path===resultsPath);
 const before=state.blobs.get(state.current().find(e=>e.path===FEED_PATH).sha);assert.equal(JSON.parse(before.split('=')[1].split(';window.')[0]).now.stop,0);
 const second=await publishCalendar({api,now:'2026-11-07T22:00:00Z'});assert.equal(second.changed,true);assert.equal(second.assetCount,2);
 const packet=JSON.parse(state.blobs.get(state.current().find(e=>e.path===FEED_PATH).sha).split('=')[1].split(';window.')[0]);
 assert.equal(packet.now.stop,1);assert.equal(packet.publishedThrough,'2026-11-08');assert.equal(packet.stops[2].he,null);
 assert.equal(state.current().filter(e=>e.path.startsWith(SITE_PREFIX+'/airlines-assets/')).length,4);
 assert.deepEqual(state.current().find(e=>e.path===resultsPath),resultBlob);
 for(const original of state.initial)assert.deepEqual(state.current().find(e=>e.path===original.path),original);
 assert.equal(state.calls.filter(c=>c.method==='POST'&&c.path==='/git/trees').every(c=>Boolean(c.body.base_tree)),true);
});

test('same Israeli day is deterministic and no-op; unchanged packet retries failed Pages build',async()=>{
 const {api,state}=fakeApi();await publishCalendar({api,now:'2026-11-08T01:00:00Z'});const refs=state.refs,commits=state.calls.filter(c=>c.path==='/git/commits'&&c.method==='POST').length;
 state.latest={status:'errored',commit:state.head};const recovered=await publishCalendar({api,now:'2026-11-08T18:00:00Z'});
 assert.equal(recovered.changed,false);assert.equal(recovered.pages.requested,true);assert.equal(state.refs,refs);assert.equal(state.builds,2);
 const again=await publishCalendar({api,now:'2026-11-08T18:30:00Z'});assert.equal(again.pages.requested,false);assert.equal(state.refs,refs);
 assert.equal(state.calls.filter(c=>c.path==='/git/commits'&&c.method==='POST').length,commits);
});

test('first automation run atomically adds missing provenance status; later same-day run preserves it and next day advances both files',async()=>{
 const packet=calendarPacket(catalog(),new Date('2026-11-08T01:00:00Z'));
 const {api,state}=fakeApi({existingPacket:packet}),originalFeed=state.current().find(e=>e.path===FEED_PATH);
 const first=await publishCalendar({api,now:'2026-11-08T12:00:00Z',runId:'123456'});
 assert.equal(first.changed,true);assert.equal(first.assetCount,0);assert.equal(first.pages.requested,true);
 assert.deepEqual(state.calls.find(c=>c.method==='POST'&&c.path==='/git/trees').body.tree.map(e=>e.path),[STATUS_PATH]);
 const statusEntry=state.current().find(e=>e.path===STATUS_PATH),statusBytes=state.blobs.get(statusEntry.sha);
 assert.deepEqual(parseStatus(statusBytes),{schema:1,synthetic:true,timeZone:'Asia/Jerusalem',publishedThrough:'2026-11-08',sourceCommit:SOURCE_COMMIT,origin:'github-actions-calendar',publishedAt:'2026-11-08T12:00:00.000Z',runId:'123456'});
 assert.deepEqual(state.current().find(e=>e.path===FEED_PATH),originalFeed);
 for(const original of state.initial)assert.deepEqual(state.current().find(e=>e.path===original.path),original);
 const sameDay=await publishCalendar({api,now:'2026-11-08T18:00:00Z',runId:'999999'});
 assert.equal(sameDay.changed,false);assert.equal(state.refs,1);assert.deepEqual(state.current().find(e=>e.path===STATUS_PATH),statusEntry);assert.equal(state.blobs.get(statusEntry.sha),statusBytes);
 const nextDay=await publishCalendar({api,now:'2026-11-09T12:30:00Z',runId:'234567'});
 assert.equal(nextDay.changed,true);assert.equal(nextDay.assetCount,0);assert.equal(nextDay.pages.requested,true);
 assert.deepEqual(state.calls.filter(c=>c.method==='POST'&&c.path==='/git/trees').at(-1).body.tree.map(e=>e.path).sort(),[FEED_PATH,STATUS_PATH].sort());
 assert.deepEqual(parseStatus(state.blobs.get(state.current().find(e=>e.path===STATUS_PATH).sha)),{schema:1,synthetic:true,timeZone:'Asia/Jerusalem',publishedThrough:'2026-11-09',sourceCommit:SOURCE_COMMIT,origin:'github-actions-calendar',publishedAt:'2026-11-09T12:30:00.000Z',runId:'234567'});
 for(const original of state.initial.filter(e=>e.path!==FEED_PATH))assert.deepEqual(state.current().find(e=>e.path===original.path),original);
});

test('unexpected or invalid existing automation status fails before any Git object or ref mutation',async()=>{
 const packet=calendarPacket(catalog(),new Date('2026-11-08T12:00:00Z'));
 const valid={schema:1,synthetic:true,timeZone:'Asia/Jerusalem',publishedThrough:'2026-11-08',sourceCommit:SOURCE_COMMIT,origin:'github-actions-calendar',publishedAt:'2026-11-08T01:00:00.000Z'};
 for(const existingStatus of ['not JSON',{...valid,unknown:'field'},{...valid,sourceCommit:hash('other')},{...valid,origin:'manual'},{...valid,publishedAt:'invalid'},{...valid,publishedThrough:'2026-11-09'},{...valid,runId:'bad'}]){
  const {api,state}=fakeApi({existingPacket:packet,existingStatus});
  await assert.rejects(publishCalendar({api,now:'2026-11-08T12:00:00Z'}),/status/);noRefWrites(state);assert.equal(state.calls.some(c=>c.method==='POST'),false);
 }
 const preserve=fakeApi({existingPacket:packet,existingStatus:valid});assert.equal((await publishCalendar({api:preserve.api,now:'2026-11-08T18:00:00Z',runId:'999'})).changed,false);noRefWrites(preserve.state);
 assert.deepEqual(JSON.parse(preserve.state.blobs.get(preserve.state.current().find(e=>e.path===STATUS_PATH).sha)),valid);
});

test('repairing an approved missing revealed image also updates provenance in the same tree',async()=>{
 const packet=calendarPacket(catalog(),new Date('2026-11-08T01:00:00Z'));
 const existingStatus={schema:1,synthetic:true,timeZone:'Asia/Jerusalem',publishedThrough:'2026-11-08',sourceCommit:SOURCE_COMMIT,origin:'github-actions-calendar',publishedAt:'2026-11-08T01:00:00.000Z',runId:'123'};
 const {api,state}=fakeApi({existingPacket:packet,existingStatus,omitTargetImage:'milan-phone.webp'});
 const result=await publishCalendar({api,now:'2026-11-08T18:00:00Z',runId:'456'});assert.equal(result.assetCount,1);assert.equal(result.changed,true);
 const changed=state.calls.find(c=>c.method==='POST'&&c.path==='/git/trees').body.tree;
 assert.deepEqual(changed.map(e=>e.path).sort(),[SITE_PREFIX+'/airlines-assets/milan-phone.webp',STATUS_PATH].sort());
 assert.equal(parseStatus(state.blobs.get(state.current().find(e=>e.path===STATUS_PATH).sha)).publishedAt,'2026-11-08T18:00:00.000Z');
 assert.equal(parseStatus(state.blobs.get(state.current().find(e=>e.path===STATUS_PATH).sha)).runId,'456');
});

test('malformed source and missing approved image fail before creating any Git object',async()=>{
 for(const options of [{source:{...fixture(),provenance:{synthetic:false}}},{missingImage:'milan-phone.webp'}]){
  const {api,state}=fakeApi(options);await assert.rejects(publishCalendar({api,now:'2026-11-08T12:00:00Z'}));noRefWrites(state);
  assert.equal(state.calls.some(c=>['POST','PATCH'].includes(c.method)),false);
 }
});

test('existing asset mismatch refuses overwrite and earlier day refuses calendar rollback',async()=>{
 const packet=calendarPacket(catalog(),new Date('2026-11-08T12:00:00Z'));
 const mismatch=fakeApi({existingPacket:packet,hook:({method,path,state})=>{if(method==='GET'&&path.startsWith('/git/trees/')&&!path.includes(SOURCE_TREE)){const t=structuredClone(state.trees.get(path.slice('/git/trees/'.length).split('?')[0]));t.tree.find(e=>e.path.endsWith('/milan.webp')).sha=hash('different asset');return t;}}});
 await assert.rejects(publishCalendar({api:mismatch.api,now:'2026-11-08T12:00:00Z'}),/differs/);noRefWrites(mismatch.state);
 const rollback=fakeApi({existingPacket:packet});await assert.rejects(publishCalendar({api:rollback.api,now:'2026-11-07T12:00:00Z'}),/rollback/);noRefWrites(rollback.state);
});

test('concurrent branch advance rebuilds from newest tree without losing concurrent blob',async()=>{
 let reads=0;const {api,state}=fakeApi({hook:({method,path,state})=>{if(method==='GET'&&path==='/git/ref/heads/gh-pages'&&++reads===2)state.advance();}});
 const result=await publishCalendar({api,now:'2026-11-08T12:00:00Z'});assert.equal(result.changed,true);assert.equal(state.refs,1);
 assert.equal(state.current().some(e=>e.path.startsWith('unrelated-concurrent-')),true);
});

test('a race between last head check and non-force update is retried safely',async()=>{
 let raced=false;const {api,state}=fakeApi({hook:({method,path,state})=>{if(method==='PATCH'&&!raced){raced=true;state.advance();throw new GithubApiError(422,method,path);}}});
 await publishCalendar({api,now:'2026-11-08T12:00:00Z'});assert.equal(state.refs,1);assert.equal(state.current().some(e=>e.path.startsWith('unrelated-concurrent-')),true);
});

test('persistent concurrency exhausts bounded retries without ref mutation',async()=>{
 let reads=0;const {api,state}=fakeApi({hook:({method,path,state})=>{if(method==='GET'&&path==='/git/ref/heads/gh-pages'&&++reads%2===0)state.advance();}});
 await assert.rejects(publishCalendar({api,now:'2026-11-08T12:00:00Z',maxAttempts:2}),/bounded/);noRefWrites(state);
});

test('tree verification rejects unrelated modification, deletion, mode drift and injected addition',()=>{
 const before={tree:[treeEntry('unrelated',hash('a'),'100755')]},feed=treeEntry(FEED_PATH,hash('feed'));
 for(const entries of [[],[treeEntry('unrelated',hash('b'),'100755'),feed],[treeEntry('unrelated',hash('a')),feed],[...before.tree,feed,treeEntry('injected',hash('extra'))]])assert.throws(()=>verifyTreeDelta(before,{tree:entries},[feed]));
 assert.doesNotThrow(()=>verifyTreeDelta(before,{tree:[...before.tree,feed]},[feed]));
});

test('API errors before mutation and Pages build failures remain visible and recoverable',async()=>{
 const denied=fakeApi({hook:({method,path})=>{if(path.startsWith('/git/trees/'))throw new GithubApiError(403,method,path);}});
 await assert.rejects(publishCalendar({api:denied.api,now:'2026-11-08T12:00:00Z'}),/403/);noRefWrites(denied.state);
 let failed=false;const retry=fakeApi({hook:({method,path})=>{if(path==='/pages/builds'&&!failed){failed=true;throw new GithubApiError(503,method,path);}}});
 await assert.rejects(publishCalendar({api:retry.api,now:'2026-11-08T12:00:00Z'}),/503/);assert.equal(retry.state.refs,1);
 const recovered=await publishCalendar({api:retry.api,now:'2026-11-08T13:00:00Z'});assert.equal(recovered.changed,false);assert.equal(recovered.pages.requested,true);assert.equal(retry.state.refs,1);
});

test('wrong Pages source or a mutated resulting tree fail before ref mutation',async()=>{
 const wrong=fakeApi({hook:({method,path})=>{if(path==='/pages')return {build_type:'legacy',source:{branch:'main',path:'/'}};}});
 await assert.rejects(publishCalendar({api:wrong.api,now:'2026-11-08T12:00:00Z'}),/gh-pages/);noRefWrites(wrong.state);assert.equal(wrong.state.calls.some(c=>c.method==='POST'),false);
 const tampered=fakeApi({hook:({method,path,state})=>{
  if(method==='GET'&&path.startsWith('/git/trees/')&&state.calls.some(c=>c.path==='/git/trees'&&c.method==='POST')){
   const tree=structuredClone(state.trees.get(path.slice('/git/trees/'.length).split('?')[0]));tree.tree.find(e=>e.path===resultsPath).mode='100755';return tree;
  }
 }});
 await assert.rejects(publishCalendar({api:tampered.api,now:'2026-11-08T12:00:00Z'}),/Unrelated blob or mode/);noRefWrites(tampered.state);
});

test('repository guard, pinned tree integrity and year bounds fail closed',async()=>{
 const wrong=fakeApi();await assert.rejects(publishCalendar({api:wrong.api,repository:'other/repo',now:'2026-11-08T12:00:00Z'}),/guard/);assert.equal(wrong.state.calls.length,0);
 const pinned=fakeApi({hook:({method,path})=>{if(path==='/git/commits/'+SOURCE_COMMIT)return {tree:{sha:hash('wrong')}};if(path==='/git/trees/'+hash('wrong')+'?recursive=1')return {sha:hash('wrong'),tree:[]};}});
 await assert.rejects(publishCalendar({api:pinned.api,now:'2026-11-08T12:00:00Z'}),/Pinned source tree/);noRefWrites(pinned.state);
 for(const now of ['2026-10-30T12:00:00Z','2027-01-02T12:00:00Z','2027-11-08T12:00:00Z']){const f=fakeApi();assert.equal((await publishCalendar({api:f.api,now})).reason,'outside-2026-calendar');assert.equal(f.state.calls.length,0);}
 const final=fakeApi();const ended=await publishCalendar({api:final.api,now:'2026-12-31T22:03:00Z'});assert.equal(ended.date,'2027-01-01');
});

test('native API client pins HTTPS repository and never follows redirects or leaks credentials',async()=>{
 const captured=[];const api=createGithubApi({token:'TEST_TOKEN_DO_NOT_LOG',fetchImpl:async(url,init)=>{captured.push({url,init});return {ok:false,status:403};}});
 await assert.rejects(api.request('GET','/pages'),error=>error.message==='GitHub API GET /pages failed (403)'&&!error.message.includes('TEST_TOKEN'));
 assert.equal(captured[0].url,'https://api.github.com/repos/'+TARGET_REPOSITORY+'/pages');assert.equal(captured[0].init.redirect,'error');
 await assert.rejects(api.request('GET','https://other.invalid'),/Invalid GitHub API path/);await assert.rejects(api.request('GET','/../secrets'),/Invalid GitHub API path/);
});
