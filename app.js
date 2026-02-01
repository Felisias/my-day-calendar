const SNAP=15;
const PX_PER_MIN=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hourH'))/60;

let baseDate=new Date();
let events=load();

const pager=document.getElementById("pager");
const pages=[pagePrev,pageCurrent,pageNext];

renderAll();

/* ---------- pager swipe ---------- */

let sx;

pager.ontouchstart=e=> sx=e.touches[0].clientX;
pager.ontouchend=e=>{
 let dx=e.changedTouches[0].clientX-sx;
 if(Math.abs(dx)>60){
  baseDate.setDate(baseDate.getDate()+(dx<0?1:-1));
  renderAll();
 }
};

/* ---------- long press create ---------- */

let pressTimer,draft;

function attachLongPress(page,dateKey){
 page.onpointerdown=e=>{
  if(e.target!==page) return;
  pressTimer=setTimeout(()=>startDraft(e,page,dateKey),350);
 };
 page.onpointerup=()=>clearTimeout(pressTimer);
 page.onpointermove=()=>clearTimeout(pressTimer);
}

function startDraft(e,page,dateKey){
 const y=e.offsetY+page.scrollTop;
 const m=snap(Math.floor(y/PX_PER_MIN()));

 draft=document.createElement("div");
 draft.className="draft";
 draft.style.top=m*PX_PER_MIN()+"px";
 draft.style.height=60*PX_PER_MIN()+"px";
 page.appendChild(draft);

 makeDraftResizable(draft);
 openSheetMini(m,dateKey);
}

/* ---------- draft resize ---------- */

function makeDraftResizable(el){
 const dot=document.createElement("div");
 dot.className="handle-dot";
 dot.style.bottom="-7px";
 el.appendChild(dot);

 let sy,sh;

 dot.onpointerdown=e=>{
  sy=e.clientY;
  sh=parseFloat(el.style.height);
  e.stopPropagation();
 };

 dot.onpointermove=e=>{
  if(sy==null) return;
  let mins=snap((sh+(e.clientY-sy))/PX_PER_MIN());
  el.style.height=Math.max(15*PX_PER_MIN(),mins*PX_PER_MIN())+"px";
 };

 dot.onpointerup=()=>sy=null;
}

/* ---------- sheet ---------- */

const sheet=document.getElementById("sheet");

function openSheetMini(min,dateKey){
 sheet.classList.add("show");
 sheet.dataset.start=min;
 sheet.dataset.date=dateKey;
}

titleInput.onfocus=()=>sheet.classList.add("full");
cancelBtn.onclick=closeSheet;

function closeSheet(){
 sheet.classList.remove("show","full");
 if(draft) draft.remove();
}

/* ---------- save ---------- */

saveBtn.onclick=()=>{
 const start=+sheet.dataset.start;
 const dur=parseFloat(draft.style.height)/PX_PER_MIN();

 events.push({
  id:Date.now(),
  date:sheet.dataset.date,
  title:titleInput.value||"Событие",
  start:minToTime(start),
  end:minToTime(start+dur),
  color:selectedColor,
  repeat:repeatInput.value
 });

 store();
 closeSheet();
 renderAll();
};

/* ---------- palette ---------- */

const colors=["#4285F4","#EA4335","#FBBC05","#34A853","#A142F4","#24C1E0","#F06292"];
let selectedColor=colors[0];

colors.forEach(c=>{
 const d=document.createElement("div");
 d.className="color-dot";
 d.style.background=c;
 d.onclick=()=>selectedColor=c;
 palette.appendChild(d);
});

/* ---------- render ---------- */

function renderAll(){
 renderHeader();
 renderPages();
}

function renderHeader(){
 dow.innerText=["ВС","ПН","ВТ","СР","ЧТ","ПТ","СБ"][baseDate.getDay()];
 dayCircle.innerText=baseDate.getDate();
}

function renderPages(){
 [-1,0,1].forEach((off,i)=>{
  const d=new Date(baseDate);
  d.setDate(d.getDate()+off);
  renderDay(pages[i],key(d));
 });
 pager.style.transform="translateX(-100%)";
}

function renderDay(page,dateKey){
 page.innerHTML="";
 for(let h=0;h<24;h++){
  const l=document.createElement("div");
  l.className="hour";
  l.style.top=(h*parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hourH'))-6)+"px";
  l.innerText=h+":00";
  page.appendChild(l);
 }

 attachLongPress(page,dateKey);

 expand(events).filter(e=>e.date===dateKey).forEach(drawEvent.bind(null,page));
}

function drawEvent(page,ev){
 const el=document.createElement("div");
 el.className="event";
 el.style.background=ev.color;

 const s=toMin(ev.start);
 const e=toMin(ev.end);

 el.style.top=s*PX_PER_MIN()+"px";
 el.style.height=(e-s)*PX_PER_MIN()+"px";
 el.style.left="60px";
 el.style.right="8px";

 el.innerHTML=ev.title;
 page.appendChild(el);
}

/* ---------- utils ---------- */

function snap(m){return Math.round(m/SNAP)*SNAP}
function toMin(t){let[a,b]=t.split(":");return a*60+ +b}
function minToTime(m){return String(m/60|0).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function key(d){return d.toISOString().slice(0,10)}

function expand(list){
 const out=[];
 list.forEach(e=>{
  if(e.repeat==="none") out.push(e);
  if(e.repeat==="daily") for(let i=0;i<7;i++) out.push({...e,date:key(new Date(new Date(e.date).setDate(new Date(e.date).getDate()+i)))});
  if(e.repeat==="weekly") for(let i=0;i<4;i++) out.push({...e,date:key(new Date(new Date(e.date).setDate(new Date(e.date).getDate()+i*7)))});
  if(e.repeat==="monthly") out.push(e);
 });
 return out;
}

function store(){localStorage.setItem("planner",JSON.stringify(events))}
function load(){return JSON.parse(localStorage.getItem("planner")||"[]")}
