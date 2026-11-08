import {applyCalendarPacket,millisecondsToIsraelMidnight} from './calendar-model.js';

// The clock schedules a reload only. It never reveals a destination: the trusted
// publisher has already redacted the same-origin packet before the browser gets it.
export function watchCalendar(data,{onChange=()=>{},onAvailable=()=>{},onUnavailable=()=>{},intervalMs=300000,source='airlines-calendar.js',now=()=>new Date()}={}){
 let stopped=false,inflight=null,deadline=null,midnight=null,sequence=0;
 const consume=packet=>{
  if(stopped)return false;
  const result=applyCalendarPacket(data,packet);
  if(!result.accepted){onUnavailable();return false;}
  onAvailable();if(result.changed)onChange();return true;
 };
 const received=e=>consume(e.detail);
 const reload=()=>{
  if(stopped||inflight||document.visibilityState==='hidden')return;
  const url=new URL(source,document.baseURI);
  if(url.origin!==location.origin){onUnavailable();return;}
  url.searchParams.set('refresh',String(+now())+'-'+(++sequence));
  const script=document.createElement('script');inflight=script;
  const done=failed=>{
   if(inflight!==script)return;
   clearTimeout(deadline);deadline=null;inflight=null;script.onload=null;script.onerror=null;script.remove();
   if(stopped)return;
   if(failed)onUnavailable();else consume(window.AIRLINES_CALENDAR);
  };
  script.src=url.href;script.async=true;script.onload=()=>done(false);script.onerror=()=>done(true);
  deadline=setTimeout(()=>done(true),12000);document.head.append(script);
 };
 const scheduleMidnight=()=>{
  if(stopped)return;
  clearTimeout(midnight);
  midnight=setTimeout(()=>{reload();scheduleMidnight();},millisecondsToIsraelMidnight(now())+1000);
 };
 const visible=()=>{if(document.visibilityState==='visible'){reload();scheduleMidnight();}};
 window.addEventListener('airlines:calendar',received);
 window.addEventListener('focus',visible);
 window.addEventListener('pageshow',visible);
 document.addEventListener('visibilitychange',visible);
 if(window.AIRLINES_CALENDAR)consume(window.AIRLINES_CALENDAR);
 const interval=setInterval(reload,intervalMs);scheduleMidnight();reload();
 return ()=>{
  if(stopped)return;stopped=true;clearInterval(interval);clearTimeout(deadline);clearTimeout(midnight);
  if(inflight){inflight.onload=null;inflight.onerror=null;inflight.remove();inflight=null;}
  window.removeEventListener('airlines:calendar',received);window.removeEventListener('focus',visible);window.removeEventListener('pageshow',visible);document.removeEventListener('visibilitychange',visible);
 };
}
