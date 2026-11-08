// Presentation only. The catalog belongs to the trusted publisher, never to this browser module.
const TIME_ZONE='Asia/Jerusalem',CHANNEL='bezeq-airlines-calendar';
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const displayFields=['he','country','dial','ll','look','photo','photoNight','line','palette','accent','peakPalette','tz','landmark','photoExt','en','airport','focus'];
const stopFields=['id','start','end','status','peaks',...displayFields];
const parameterFields=['height','base','levels','flare','arms','dome','width','arch','attic','bands','columns','depth','pediment','cables','bend'];
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const only=(x,keys)=>plain(x)&&Object.keys(x).every(k=>keys.includes(k));
const text=(x,max=4000)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(x);
const slug=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(x);
const color=x=>typeof x==='string'&&/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(x);
const palette=x=>Array.isArray(x)&&x.length>0&&x.length<=12&&x.every(color);
const isoDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const status=(stop,date)=>date<stop.start?'upcoming':date>stop.end?'past':'current';
const selected=(stops,period,date)=>date>period.end?'after':date<period.start?'before':stops.findIndex(s=>s.start<=date&&date<=s.end)>=0?stops.findIndex(s=>s.start<=date&&date<=s.end):stops.findLastIndex(s=>s.start<=date)>=0?stops.findLastIndex(s=>s.start<=date):'before';
const copy=x=>JSON.parse(JSON.stringify(x));

export function israelDate(now=new Date()){
 const date=new Date(now);if(!Number.isFinite(+date))throw new RangeError('Invalid calendar time');
 const parts=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}

export function millisecondsToIsraelMidnight(now=new Date()){
 const timestamp=+new Date(now),today=israelDate(now);
 // Search the actual IANA date boundary; a DST day is not necessarily 24 hours.
 let low=1,high=26*3600000;
 while(low<high){const middle=Math.floor((low+high)/2);if(israelDate(new Date(timestamp+middle))===today)low=middle+1;else high=middle;}
 return low;
}

function projectLandmark(source){
 if(!plain(source))return null;
 const result={};for(const key of ['kind','name','icon'])if(source[key]!=null)result[key]=source[key];
 if(plain(source.params))result.params=Object.fromEntries(parameterFields.filter(k=>source.params[k]!=null).map(k=>[k,source.params[k]]));
 return result;
}

function projectPeak(peak,stop){
 return {date:peak.date??null,theme:peak.theme||`יום שיא בסגנון ${stop.country??stop.he}`,tbd:!!peak.tbd||!peak.theme,text:peak.text??null,themePhoto:peak.themePhoto??null,themePalette:peak.themePalette??null};
}

export function calendarPacket(catalog,now=new Date()){
 const date=israelDate(now);
 if(!plain(catalog)||!plain(catalog.period)||!Array.isArray(catalog.stops))throw new TypeError('Invalid presentation catalog');
 const period={start:catalog.period.start,end:catalog.period.end};
 const stops=catalog.stops.map((source,index)=>{
  const state=status(source,date),stop={id:state==='upcoming'?'stop'+(index+1):source.id,start:source.start,end:source.end,status:state};
  if(state==='upcoming'){for(const key of displayFields)stop[key]=null;stop.peaks=[];return stop;}
  for(const key of displayFields){
   if(['en','airport','focus'].includes(key)&&source[key]==null)continue;
   stop[key]=key==='photoExt'?'webp':key==='landmark'?projectLandmark(source[key]):source[key]??null;
  }
  stop.peaks=(Array.isArray(source.peaks)&&source.peaks.length?source.peaks:[{}]).map(peak=>projectPeak(peak,source));
  return stop;
 });
 const result={schema:1,synthetic:true,channel:CHANNEL,timeZone:TIME_ZONE,publishedThrough:date,period,now:{stop:selected(stops,period,date)},stops};
 const reference={contest:period,stops:catalog.stops};
 if(!validateCalendarPacket(reference,result))throw new TypeError('Invalid presentation catalog');
 return copy(result);
}

function validLandmark(value){
 return only(value,['kind','name','icon','params'])&&text(value.kind,100)&&(!Object.hasOwn(value,'name')||text(value.name,500))&&(!Object.hasOwn(value,'icon')||slug(value.icon))&&(!Object.hasOwn(value,'params')||(only(value.params,parameterFields)&&Object.values(value.params).every(v=>typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v))||(typeof v==='string'&&/^[a-zA-Z0-9 -]{1,60}$/.test(v)))));
}

function validPeak(peak,stop){
 return exact(peak,['date','theme','tbd','text','themePhoto','themePalette'])&&(peak.date===null||(isoDate(peak.date)&&peak.date>=stop.start&&peak.date<=stop.end))&&text(peak.theme,500)&&typeof peak.tbd==='boolean'&&(peak.text===null||text(peak.text))&&(peak.themePhoto===null||slug(peak.themePhoto))&&(peak.themePalette===null||palette(peak.themePalette));
}

function validMetadata(stop){
 if(!text(stop.he,200)||!text(stop.country,200)||!slug(stop.id)||stop.photoExt!=='webp')return false;
 for(const key of ['dial','line','en','airport'])if(stop[key]!=null&&!text(stop[key],key==='line'?4000:200))return false;
 for(const key of ['look','photo','photoNight'])if(stop[key]!=null&&!slug(stop[key]))return false;
 if(stop.ll!==null&&(!Array.isArray(stop.ll)||stop.ll.length!==2||!stop.ll.every(Number.isFinite)||Math.abs(stop.ll[0])>180||Math.abs(stop.ll[1])>90))return false;
 for(const key of ['palette','peakPalette'])if(stop[key]!==null&&!palette(stop[key]))return false;
 if(stop.accent!==null&&!color(stop.accent))return false;
 if(stop.tz!==null){if(!text(stop.tz,100))return false;try{new Intl.DateTimeFormat('en',{timeZone:stop.tz});}catch{return false;}}
 if(stop.focus!=null&&(typeof stop.focus!=='string'||! /^(?:center|left|right|top|bottom|\d{1,3}(?:\.\d+)?%)(?: (?:center|left|right|top|bottom|\d{1,3}(?:\.\d+)?%))?$/.test(stop.focus)))return false;
 return (stop.landmark===null||validLandmark(stop.landmark))&&Array.isArray(stop.peaks)&&stop.peaks.length>0&&stop.peaks.length<=30&&stop.peaks.every(p=>validPeak(p,stop));
}

export function validateCalendarPacket(site,packet){
 try{
  if(!plain(site)||!Array.isArray(site.stops)||site.stops.length!==9||!plain(site.contest))return false;
  if(!exact(packet,['schema','synthetic','channel','timeZone','publishedThrough','period','now','stops'])||packet.schema!==1||packet.synthetic!==true||packet.channel!==CHANNEL||packet.timeZone!==TIME_ZONE||!isoDate(packet.publishedThrough))return false;
  if(!exact(packet.period,['start','end'])||!isoDate(packet.period.start)||!isoDate(packet.period.end)||packet.period.start>packet.period.end||packet.period.start!==site.contest.start||packet.period.end!==site.contest.end)return false;
  if(!exact(packet.now,['stop'])||!Array.isArray(packet.stops)||packet.stops.length!==site.stops.length)return false;
  for(let index=0;index<packet.stops.length;index++){
   const stop=packet.stops[index],original=site.stops[index];
   if(!only(stop,stopFields)||!plain(original)||!isoDate(stop.start)||!isoDate(stop.end)||stop.start>stop.end||stop.start!==original.start||stop.end!==original.end||stop.start<packet.period.start||stop.end>packet.period.end||(index&&stop.start<=packet.stops[index-1].end)||stop.status!==status(stop,packet.publishedThrough))return false;
   if(stop.status==='upcoming'){
    if(stop.id!=='stop'+(index+1)||!Array.isArray(stop.peaks)||stop.peaks.length||displayFields.some(key=>Object.hasOwn(stop,key)&&stop[key]!==null))return false;
   }else{
    const required=displayFields.filter(key=>!['en','airport','focus'].includes(key));
    if(!required.every(key=>Object.hasOwn(stop,key))||!validMetadata(stop)||(original.he&&stop.id!==original.id))return false;
   }
  }
  return packet.now.stop===selected(packet.stops,packet.period,packet.publishedThrough);
 }catch{return false;}
}

export function applyCalendarPacket(data,packet){
 const rejected={accepted:false,changed:false};
 try{
  if(data?.meta?.synthetic!==true||!validateCalendarPacket(data.site,packet))return rejected;
  const previous=data.site.presentation;
  if(previous&&(!validateCalendarPacket(data.site,previous)||packet.publishedThrough<previous.publishedThrough))return rejected;
  const changed=JSON.stringify(previous)!==JSON.stringify(packet);
  if(changed)data.site.presentation=copy(packet);
  return {accepted:true,changed};
 }catch{return rejected;}
}

export const presentationStops=site=>site?.presentation?.stops??site?.stops;
export const presentationNow=site=>site?.presentation?.now??site?.now;
export const presentationDate=site=>site?.presentation?.publishedThrough??site?.asOf;
