import {animatePart, reducedMotion} from '../looks/native-motion.js';
import {onCleanup} from '../lifecycle.js';

const visited = new Set();
let keyboardMode = false;
const NS = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}

// A decorative arrival arc, without revealing any future destination.
function flightTrace(hero, play) {
  const svg = svgElement('svg', {class:'air-flight-trace', viewBox:'0 0 1000 800', 'aria-hidden':'true', focusable:'false'});
  const path = svgElement('path', {class:'air-flight-arc', d:'M920 680 C600 760 120 110 410 280', pathLength:'1'});
  const craft = svgElement('g', {class:'air-flight-craft'});
  craft.append(svgElement('path', {d:'M18 -18 5 21 -3 4 -20 -3 18 -18Z'}));
  const beacon = svgElement('circle', {class:'air-flight-beacon', cx:'410',cy:'280',r:'13'});
  svg.append(path, craft, beacon); hero.append(svg);
  play(path, [
    {strokeDashoffset:1,opacity:0,offset:0},
    {strokeDashoffset:.98,opacity:.7,offset:.08},
    {strokeDashoffset:0,opacity:.7,offset:.78},
    {strokeDashoffset:0,opacity:0,offset:1}
  ], {duration:1800}, 'flight-path');
  const length=path.getTotalLength(), frames=[];
  for(let i=0;i<=30;i++){
    const at=i/30,point=path.getPointAtLength(length*at),next=path.getPointAtLength(Math.min(length,length*at+1)),previous=path.getPointAtLength(Math.max(0,length*at-1));
    const angle=Math.atan2(next.y-previous.y,next.x-previous.x)*180/Math.PI+45;
    frames.push({transform:`translate(${point.x}px,${point.y}px) rotate(${angle}deg)`,opacity:i===0||i===30?0:1,offset:at});
  }
  play(craft,frames,{duration:1450,easing:'cubic-bezier(.45,0,.25,1)'},'flight-craft');
  play(beacon,[{opacity:0,transform:'scale(.65)'},{opacity:.8,transform:'scale(1)'},{opacity:0,transform:'scale(1.4)'}],{duration:600,delay:1200},'arrival-beacon');
}

export function mountAirlinesMotion(root, {route, role, stop}) {
  const key=`${role||'public'}:${route}:${stop?.id||'before'}`;
  let frame=null,observer=null,stopped=false;
  const running=new Set();
  const stopMotion=()=>{
    stopped=true;
    if(frame!==null)cancelAnimationFrame(frame);
    observer?.disconnect();
    for(const animation of running)animation.cancel();
    running.clear();
  };
  const keyboard=()=>{keyboardMode=true;stopMotion();};
  const pointer=()=>{keyboardMode=false;};
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{if(preference.matches)stopMotion();};
  const visibility=()=>{if(document.hidden)stopMotion();};
  window.addEventListener('keydown',keyboard,true);
  window.addEventListener('pointerdown',pointer,true);
  preference.addEventListener('change',changed);
  document.addEventListener('visibilitychange',visibility);
  onCleanup(root,()=>{
    stopMotion();
    window.removeEventListener('keydown',keyboard,true);
    window.removeEventListener('pointerdown',pointer,true);
    preference.removeEventListener('change',changed);
    document.removeEventListener('visibilitychange',visibility);
  });
  if(reducedMotion()||keyboardMode||visited.has(key)||(['admin','superadmin'].includes(role)&&!['home','journey'].includes(route)))return;
  const play=(el,frames,options={},name='reveal')=>{
    if(stopped||!el)return null;
    const animation=animatePart(root,el,frames,options);
    if(animation){
      animation.id='airlines-'+name;running.add(animation);
      const release=()=>running.delete(animation);
      animation.addEventListener('finish',release,{once:true});
      animation.addEventListener('cancel',release,{once:true});
    }
    return animation;
  };
  const rise=[{opacity:.45,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}];
  frame=requestAnimationFrame(()=>{
    if(stopped||!root.isConnected)return;
    visited.add(key);
    const hero=root.querySelector('.hero');
    if(hero){
      play(hero.querySelector('.hero-photo'),[{transform:'scale(1.055) translateX(1%)'},{transform:'scale(1) translateX(0)'}],{duration:1800},'photo-arrival');
      hero.querySelectorAll('.hero-eyebrow,#hero-title,.hero-english,.hero-body,.hero-actions,.hero-period').forEach((el,i)=>play(el,rise,{duration:580,delay:Math.min(i*55,220)},'hero-copy'));
      play(hero.querySelector('.flight-strip'),[{opacity:.6,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,delay:160},'flight-strip');
      if(stop?.he)flightTrace(hero,play);
    }
    const pass=root.querySelector('.boarding-pass');
    if(pass){
      play(pass,[{opacity:.65,transform:'translateY(16px) rotate(.6deg) scale(.985)'},{opacity:1,transform:'translateY(0) rotate(0) scale(1)'}],{duration:460},'boarding-pass');
      const stamp=pass.querySelector('.passport-stamp');
      if(stamp){
        const rest=getComputedStyle(stamp).transform;
        play(stamp,[{opacity:.4,transform:`${rest==='none'?'':rest} scale(1.16)`},{opacity:1,transform:rest}],{duration:320,delay:180},'passport-stamp');
      }
    }
    root.querySelectorAll('.progress-track>span').forEach(el=>play(el,[{transform:'scaleX(0)'},{transform:el.style.transform||'scaleX(1)'}],{duration:520,delay:80},'progress'));
    play(root.querySelector('.team-brief,.department-brief,.division-brief'),rise,{duration:320},'brief');
    const reveal=el=>{
      el.dataset.motionRevealed='true';
      if(el.matches('.route-track')){
        el.querySelectorAll('.route-stop').forEach((stop,i)=>play(stop,[{opacity:.5,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],{duration:400,delay:Math.min(i*28,180)},'journey-stop'));
        play(el.querySelector('.current .route-dot>svg'),[{transform:'translate(14px,-8px) rotate(-12deg)'},{transform:'translate(0,0) rotate(0)'}],{duration:600,delay:100},'journey-arrival');
      }else el.querySelectorAll('.how-step').forEach((step,i)=>play(step,rise,{duration:420,delay:i*65},'journey-step'));
    };
    if(typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);reveal(entry.target);}},{threshold:.12});
      root.querySelectorAll('.route-track,.how-steps').forEach(el=>observer.observe(el));
    }
  });
}
