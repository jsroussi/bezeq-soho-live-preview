import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticScenario} from '../scripts/build-airlines-preview.mjs';
import {israelDate,millisecondsToIsraelMidnight,calendarPacket,validateCalendarPacket,applyCalendarPacket,presentationStops,presentationNow,presentationDate} from '../site/src/airlines/calendar-model.js';

const fixture=syntheticScenario('2026-11-05');
const clone=value=>structuredClone(value);
const catalog={period:fixture.config.period,stops:fixture.config.journey.stops};
const at=date=>new Date(date.length===10?date+'T12:00:00Z':date);
const packet=date=>calendarPacket(catalog,at(date));

test('Israeli dates and next-midnight delay use the exact winter boundary',()=>{
 assert.equal(israelDate(at('2026-11-07T21:59:59.999Z')),'2026-11-07');
 assert.equal(israelDate(at('2026-11-07T22:00:00.000Z')),'2026-11-08');
 assert.equal(millisecondsToIsraelMidnight(at('2026-11-07T21:59:59.999Z')),1);
 assert.equal(millisecondsToIsraelMidnight(at('2026-11-07T22:00:00.000Z')),24*3600000);
});

test('midnight delay covers DST days and is always positive and bounded',()=>{
 for(const value of ['2026-03-26T22:00:00Z','2026-03-27T00:30:00Z','2026-10-24T21:00:00Z','2026-10-25T00:30:00Z','2026-11-08T09:00:00Z']){
  const now=at(value),delay=millisecondsToIsraelMidnight(now);
  assert.ok(delay>0&&delay<=26*3600000);
  assert.equal(israelDate(new Date(+now+delay-1)),israelDate(now));
  assert.notEqual(israelDate(new Date(+now+delay)),israelDate(now));
 }
 assert.equal(millisecondsToIsraelMidnight(at('2026-03-26T22:00:00Z')),23*3600000);
 assert.equal(millisecondsToIsraelMidnight(at('2026-10-24T21:00:00Z')),25*3600000);
 assert.throws(()=>israelDate(new Date(NaN)),RangeError);
 assert.throws(()=>millisecondsToIsraelMidnight(new Date(NaN)),RangeError);
});

test('Milan calendar changes independently of the 5 November results and scoring',()=>{
 const data=clone(fixture.data),before=clone(data),p=packet('2026-11-08');
 assert.equal(p.now.stop,1);assert.equal(p.stops[1].he,'מילאנו');
 assert.equal(p.stops[1].start,'2026-11-08');assert.equal(p.stops[1].end,'2026-11-12');
 assert.deepEqual(applyCalendarPacket(data,p),{accepted:true,changed:true});
 assert.equal(presentationStops(data.site)[1].he,'מילאנו');
 assert.deepEqual(presentationNow(data.site),{stop:1});
 assert.equal(presentationDate(data.site),'2026-11-08');
 assert.equal(data.site.asOf,'2026-11-05');
 const person=data.site.people.find(p=>p.key===data.roles.rep.personKey);
 assert.equal(person.stampCard.stamps,378);
 assert.equal(person.activity.groups.find(group=>group.id==='sales').quantity,137);
 delete data.site.presentation;assert.deepEqual(data,before);
});

test('all nine canonical dates stay unchanged, with deterministic packets and no hidden metadata',()=>{
 const before=JSON.stringify(catalog),p=packet('2026-11-07');
 assert.deepEqual(p,packet('2026-11-07T21:59:59.999Z'));
 assert.equal(JSON.stringify(catalog),before);
 assert.equal(p.schema,1);assert.equal(p.synthetic,true);assert.equal(p.channel,'bezeq-airlines-calendar');
 assert.equal(p.timeZone,'Asia/Jerusalem');assert.equal(p.publishedThrough,'2026-11-07');
 assert.deepEqual(p.period,{start:catalog.period.start,end:catalog.period.end});
 assert.deepEqual(p.stops.map(s=>[s.start,s.end]),catalog.stops.map(s=>[s.start,s.end]));
 assert.equal(p.now.stop,0);
 for(const [i,stop] of p.stops.entries())if(i){
  assert.equal(stop.id,'stop'+(i+1));assert.equal(stop.status,'upcoming');
  for(const [key,value] of Object.entries(stop))if(!['id','start','end','status'].includes(key))assert.deepEqual(value,key==='peaks'?[]:null,key);
 }
 assert.ok(!JSON.stringify(p).includes('מילאנו'));
 assert.ok(!JSON.stringify(p).includes('milan'));
});

test('weekend fallback, next reveal, prelaunch and finale follow the calendar',()=>{
 for(const date of ['2026-11-13','2026-11-14']){
  const p=packet(date);assert.equal(p.now.stop,1);assert.equal(p.stops[1].status,'past');assert.equal(p.stops[2].he,null);
 }
 const next=packet('2026-11-15');assert.equal(next.now.stop,2);assert.equal(next.stops[2].he,'מרקש');
 const pre=packet('2026-10-31');assert.equal(pre.now.stop,'before');assert.ok(pre.stops.every(s=>s.status==='upcoming'&&s.he===null));
 const after=packet('2027-01-01');assert.equal(after.now.stop,'after');assert.equal(after.stops.at(-1).he,'ירושלים');assert.ok(after.stops.every(s=>s.status==='past'));
 for(const p of [pre,next,after])assert.equal(validateCalendarPacket(fixture.data.site,p),true);
});

test('only display metadata is copied; optional supplied labels and approved peak descriptions survive',()=>{
 const source=clone(catalog);Object.assign(source.stops[1],{en:'MILAN',airport:'MXP',photoExt:'jpg',focus:'center 43%',score:999,uid:'private-person',prize:'unapproved'});
 source.stops[1].peaks=[{date:'2026-11-09',theme:'יום שיא מאושר',text:'פעילות',prize:'secret prize',multiplier:3,organizer:'person',themePalette:['#123456']}];
 const p=calendarPacket(source,at('2026-11-08')),stop=p.stops[1];
 assert.equal(stop.photoExt,'webp');assert.equal(stop.en,'MILAN');assert.equal(stop.airport,'MXP');
 assert.equal(stop.peaks[0].theme,'יום שיא מאושר');assert.equal(stop.peaks[0].text,'פעילות');
 for(const key of ['score','uid','prize','multiplier','organizer'])assert.ok(!JSON.stringify(p).includes('"'+key+'"'));
 assert.equal(validateCalendarPacket(fixture.data.site,p),true);
 const generic=packet('2026-11-08').stops[1].peaks[0];assert.equal(generic.theme,'יום שיא בסגנון איטליה');assert.equal(generic.date,null);assert.equal(generic.tbd,true);
});

test('validator rejects future leakage, altered schedules and malformed metadata without throwing',()=>{
 const good=packet('2026-11-08'),bad=mutate=>{const p=clone(good);mutate(p);return p;};
 const cases=[null,[],{},'packet',bad(p=>p.synthetic=false),bad(p=>p.schema=2),bad(p=>p.channel='other'),bad(p=>p.timeZone='UTC'),bad(p=>p.period.end='2027-01-01'),bad(p=>p.stops.pop()),bad(p=>p.now.stop=2),bad(p=>p.publishedThrough='2026-02-30'),bad(p=>p.publishedThrough='2026-11-08T12:00:00Z'),bad(p=>p.people=[]),bad(p=>p.stops[1].start='2026-11-07'),bad(p=>p.stops[1].end='2026-11-13'),bad(p=>p.stops[1].status='upcoming'),bad(p=>p.stops[1].photo='../private'),bad(p=>p.stops[1].photoExt='jpg'),bad(p=>p.stops[1].ll=[null,2]),bad(p=>p.stops[1].peaks[0].multiplier=3),bad(p=>p.stops[1].landmark.params={uid:'person'}),bad(p=>p.stops[2].he='מרקש'),bad(p=>p.stops[2].id='marrakech'),bad(p=>p.stops[2].photo='marrakech'),bad(p=>p.stops[2].en='MARRAKECH'),bad(p=>p.stops[2].landmark={kind:'arch'}),bad(p=>p.stops[2].peaks=[{theme:'secret'}])];
 for(const p of cases)assert.equal(validateCalendarPacket(fixture.data.site,p),false,JSON.stringify(p));
 for(const site of [null,{},[],{stops:[]}])assert.equal(validateCalendarPacket(site,good),false);
});

test('application requires synthetic preview, clones packets, rejects old replays and reports idempotence',()=>{
 const data=clone(fixture.data),p=packet('2026-11-08');
 assert.equal(presentationStops(data.site),data.site.stops);assert.equal(presentationNow(data.site),data.site.now);assert.equal(presentationDate(data.site),data.site.asOf);
 assert.deepEqual(applyCalendarPacket(data,p),{accepted:true,changed:true});
 assert.notEqual(data.site.presentation,p);assert.notEqual(data.site.presentation.stops,p.stops);
 assert.deepEqual(applyCalendarPacket(data,clone(p)),{accepted:true,changed:false});
 p.stops[1].he='mutated';assert.equal(data.site.presentation.stops[1].he,'מילאנו');
 const before=JSON.stringify(data);
 assert.deepEqual(applyCalendarPacket(data,packet('2026-11-07')),{accepted:false,changed:false});
 assert.deepEqual(applyCalendarPacket(data,{}),{accepted:false,changed:false});assert.equal(JSON.stringify(data),before);
 for(const input of [null,{}, {...clone(fixture.data),meta:{synthetic:false}}, {...clone(fixture.data),meta:{}}])assert.deepEqual(applyCalendarPacket(input,packet('2026-11-08')),{accepted:false,changed:false});
});
