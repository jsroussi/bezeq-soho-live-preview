import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syntheticScenario} from '../scripts/build-airlines-preview.mjs';
test('airlines synthetic data is deterministic, identity-free and covers six roles and current sectors',()=>{
 const a=syntheticScenario(),b=syntheticScenario();
 assert.deepEqual(a.data,b.data);assert.equal(a.data.site.people.length,60);assert.equal(a.data.site.sectors.length,10);
 assert.deepEqual(Object.keys(a.data.roles),['rep','tl','dept_manager','division_manager','admin','superadmin']);
 assert.ok(a.data.site.people.every(p=>/^נציג דמה \d+$/.test(p.name)));
 const json=JSON.stringify(a.data);assert.doesNotMatch(json, /"uid"|"secret"|"pinHash"|synthetic-demo-person-/);
 const cases=a.data.site.people.map(p=>p.stampCard?.draw?.met);
 for(const state of [true,false,null])assert.ok(cases.includes(state));
 assert.ok(a.data.site.people.some(p=>p.stampCard?.stamps===0));
});
test('airlines future destinations are removed from the payload, including photos and landmarks',()=>{
 const {data,config}=syntheticScenario();assert.equal(data.site.stops.length,9);assert.equal(data.site.stops[0].he,'פריז');
 for(const s of data.site.stops.slice(1)){assert.equal(s.he,null);assert.equal(s.country,null);assert.equal(s.landmark,null);assert.equal(s.photo,null);assert.equal(s.status,'upcoming');}
 const original=JSON.parse(fs.readFileSync(new URL('../../2026-11-year-end/contest.json',import.meta.url)));
 assert.deepEqual(config.journey.stops.map(s=>[s.start,s.end]),original.journey.stops.map(s=>[s.start,s.end]));
 assert.equal(config.journey.stops[1].he,'מילאנו');
});
test('airlines week transitions and completed weeks use canonical calendar and engine history',()=>{
 const {data}=syntheticScenario('2026-11-17');
 assert.deepEqual(data.site.stops.slice(0,3).map(s=>s.status),['past','past','current']);
 assert.equal(data.site.stops[1].he,'מילאנו');assert.equal(data.site.stops[2].he,'מרקש');
 assert.ok(data.site.people.every(p=>p.weeks.slice(0,3).every(Number.isFinite)));
 assert.ok(data.site.people.every(p=>p.weeks.slice(3).every(n=>n===null)));
});
