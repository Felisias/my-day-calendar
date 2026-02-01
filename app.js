const STEP=15;
const PX=1;

const COLORS=[
 "#4285F4","#EA4335","#34A853","#FBBC05",
 "#A142F4","#F06292","#9CCC65","#FF7043"
];

let events=JSON.parse(localStorage.getItem("ev")||"[]");
let curDate=new Date();
let editing=null;
let selectedColor=COLORS[0];

/* ---------- header ---------- */

function header(){
 const d=curDate;
 const dow=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()];
 dowEl.innerText=dow;
 dateEl.innerText=d.getDate()+"."+(d.getMonth()+1);
}

const dowEl=document.getElementById("dow");
const dateEl=document.getElementById("date");

/* ---------- build day ---------- */

function buildDay(offset=0){
 const d=new Date(curDate);
 d.setDate(d.getDate()+offset);

 const day=document.createElement("div");
 day.className="day";

 for(let h=0;h<24;h++){
  const row=document.createElement("div");
  row.className="hour";

  const lab=document.createElement("div");
  lab.className="hourLabel";
  lab.innerText=h+":00";
  row.appendChild(lab);

  enableCreateGesture(row,h,day);

  day.appendChild(row);
 }

 renderEvents(day,d);
 return day;
}

/* ---------- slider days ---------- */

const slider=document.getElementById("daySlider");

function renderSlider(){
 slider.innerHTML="";
 const prev=buildDay(-1);
 const cur=buildDay(0);
 const next=buildDay(1);

 prev.style.left="-100%";
 cur.style.left="0";
 next.style.left="100%";

 slider.append(prev,cur,next);
}

/* ---------- swipe days ---------- */

let sx=0;

dayViewport.onpointerdown=e=>sx=e.clientX;
dayViewport.onpointerup=e=>{
 const dx=e.clientX-sx;
 if(Math.abs(dx)<80) return;

 curDate.setDate(curDate.getDate()+(dx<0?1:-1));
 header();
 renderSlider();
};

/* ---------- create gesture ---------- */

function enableCreateGesture(row,hour,day){
 let startY=0,startX=0,timer=null,moved=false;

 row.addEventListener("pointerdown",e=>{
  startY=e.clientY;
  startX=e.clientX;
  moved=false;

  timer=setTimeout(()=>{
   if(moved) return;
   startPreview(hour,day);
  },450);
 });

 row.addEventListener("pointermove",e=>{
  if(Math.abs(e.clientY-startY)>12 ||
     Math.abs(e.clientX-startX)>12){
     moved=true;
     clearTimeout(timer);
  }
 });

 row.addEventListener("pointerup",()=>{
  clearTimeout(timer);
 });
}

/* ---------- preview box ---------- */

let preview=null;

function startPreview(hour,day){
 const start=hour*60;
 preview={start,end:start+60};

 const box=document.createElement("div");
 box.className="preview";
 box.style.top=start*PX+"px";
 box.style.height="60px";

 day.appendChild(box);

 enablePreviewResize(box);
 openSheet();
}

/* ---------- preview resize ---------- */

function enablePreviewResize(box){
 let lastY=0;

 box.onpointerdown=e=>{
  lastY=e.clientY;
  box.setPointerCapture(e.pointerId);
 };

 box.onpointermove=e=>{
  if(!preview) return;
  const dy=e.clientY-lastY;
  lastY=e.clientY;
  preview.end+=snap(dy);
  box.style.height=(preview.end-preview.start)*PX+"px";
 };

 box.onpointerup=()=>{};
}

/* ---------- events render ---------- */

function renderEvents(day,date){
 const key=date.toDateString();
 events.filter(e=>e.day===key).forEach(ev=>{
  const el=document.createElement("div");
  el.className="event";
  el.style.background=ev.color;
  el.style.top=ev.start*PX+"px";
  el.style.height=(ev.end-ev.start)*PX+"px";
  el.innerText=ev.title;

  const ht=document.createElement("div");
  ht.className="handle top";
  const hb=document.createElement("div");
  hb.className="handle bottom";
  el.append(ht,hb);

  enableDragResize(el,ev);
  el.onclick=()=>{
    editing=ev;
    titleInput.value=ev.title;
    openSheet(true);
  };

  day.appendChild(el);
 });
}

/* ---------- drag resize ---------- */

function enableDragResize(el,ev){
 let mode=null,lastY=0;

 el.onpointerdown=e=>{
  e.stopPropagation();
  lastY=e.clientY;
  mode=e.target.classList.contains("top")?"top":
       e.target.classList.contains("bottom")?"bottom":"move";
  el.setPointerCapture(e.pointerId);
 };

 el.onpointermove=e=>{
  if(!mode) return;
  const dy=e.clientY-lastY;
  lastY=e.clientY;
  const dm=snap(dy);

  if(mode==="move"){ ev.start+=dm; ev.end+=dm; }
  if(mode==="top"){ ev.start+=dm; }
  if(mode==="bottom"){ ev.end+=dm; }

  el.style.top=ev.start*PX+"px";
  el.style.height=(ev.end-ev.start)*PX+"px";
 };

 el.onpointerup=()=>{
  mode=null;
  save();
 };
}

/* ---------- sheet ---------- */

const sheet=document.getElementById("sheet");
const titleInput=document.getElementById("titleInput");

function openSheet(expand=false){
 sheet.classList.remove("hidden");
 sheet.classList.add("show");
 if(expand) sheet.classList.add("expanded");
}

function closeSheet(){
 sheet.classList.remove("show","expanded");
 preview=null;
 editing=null;
}

closeBtn.onclick=closeSheet;

/* auto expand when typing */

titleInput.oninput=()=>{
 if(titleInput.value.length>0)
   sheet.classList.add("expanded");
};

/* ---------- colors ---------- */

colorRow.innerHTML="";
COLORS.forEach(c=>{
 const d=document.createElement("div");
 d.className="colorDot";
 d.style.background=c;
 d.onclick=()=>selectedColor=c;
 colorRow.appendChild(d);
});

/* ---------- save ---------- */

saveBtn.onclick=()=>{
 if(preview){
  events.push({
   id:Date.now(),
   day:curDate.toDateString(),
   start:preview.start,
   end:preview.end,
   title:titleInput.value||"Событие",
   color:selectedColor
  });
 }

 if(editing){
  editing.title=titleInput.value;
  editing.color=selectedColor;
 }

 save();
 closeSheet();
 renderSlider();
};

function save(){
 localStorage.setItem("ev",JSON.stringify(events));
}

function snap(px){
 return Math.round((px/PX)/STEP)*STEP;
}

/* ---------- init ---------- */

header();
renderSlider();

if("serviceWorker" in navigator)
 navigator.serviceWorker.register("sw.js");
