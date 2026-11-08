// Small shared DOM primitives. Dynamic text always uses text nodes.
export const fmt = n => new Intl.NumberFormat('he-IL',{maximumFractionDigits:1}).format(Number(n)||0);
export function h(tag,attrs={},...children){
 const el=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs||{})){
  if(value==null||value===false)continue;
  if(key==='class'||key==='className')el.className=value;
  else if(key==='style'&&typeof value==='object')Object.assign(el.style,value);
  else if(key.startsWith('on')&&typeof value==='function')el.addEventListener(key.slice(2).toLowerCase(),value);
  else if(key==='dataset')Object.assign(el.dataset,value);
  else if(['value','checked','disabled','selected','multiple','required','readOnly','tabIndex'].includes(key))el[key]=value;
  else el.setAttribute(key,value===true?'':String(value));
 }
 for(const child of children.flat(Infinity))if(child!=null&&child!==false)el.append(child instanceof Node?child:document.createTextNode(String(child)));
 return el;
}
export function icon(name,size=20){
 const paths={plane:'M22 2 9 15M22 2l-7 20-4-9-9-4 20-7Z',arrow:'M19 12H5m6-6-6 6 6 6',lock:'M6 11V7a6 6 0 0 1 12 0v4M5 11h14v11H5z',check:'m5 12 4 4L19 6',close:'m6 6 12 12M18 6 6 18',menu:'M4 6h16M4 12h16M4 18h16',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',chart:'M4 20h17M7 16v-6m5 6V4m5 12V8',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',upload:'M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5',shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',chevron:'m15 18-6-6 6-6',logout:'M9 3H3v18h6m6-14 5 5-5 5M8 12h12'};
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v]of Object.entries({width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.chart);svg.append(path);return svg;
}
export const button=(label,onClick,cls='button',attrs={})=>h('button',{type:'button',class:cls,onclick:onClick,...attrs},label);
export const panel=(title,...children)=>h('section',{class:'panel'},title?h('h2',{},title):null,...children);
export const badge=(label,tone='')=>h('span',{class:`badge ${tone}`},label);
export function table(headers,rows){return h('div',{class:'table-wrap',tabindex:'0','aria-label':'טבלה נגללת'},h('table',{},h('thead',{},h('tr',{},...headers.map(x=>h('th',{scope:'col'},x)))),h('tbody',{},...rows.map(row=>h('tr',{},...row.map(x=>h('td',{},x)))))));}
export const empty=(title='אין נתונים להצגה',text='אפשר לשנות את הסינון ולנסות שוב.')=>h('div',{class:'empty-state',role:'status'},icon('search',28),h('h3',{},title),h('p',{},text));
