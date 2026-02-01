const STEP = 15;
const PX_PER_MIN = 1;

const COLORS = [
 "#4285F4","#EA4335","#34A853","#FBBC05",
 "#A142F4","#F06292","#9CCC65","#FF7043"
];

let events = JSON.parse(localStorage.getItem("evts")||"[]");
let selectedColor = COLORS[0];
let editing = null;

/* ---------- date header ---------- */

function setHeader() {
  const d = new Date();
  const dow = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()];
  document.getElementById("dow").innerText = dow;
  document.getElementById("date").innerText =
    d.getDate()+"."+ (d.getMonth()+1);
}

/* ---------- grid ---------- */

function buildGrid() {
  const grid = document.getElementById("dayGrid");
  grid.innerHTML="";

  for(let h=0;h<24;h++){
    const row=document.createElement("div");
    row.className="hour";

    const lab=document.createElement("div");
    lab.className="hourLabel";
    lab.innerText = h+":00";
    row.appendChild(lab);

    enableLongPress(row, h);

    grid.appendChild(row);
  }
}

/* ---------- long press create ---------- */

function enableLongPress(el, hour) {
  let t=null;
  let startY=0;

  el.addEventListener("pointerdown", e=>{
    startY=e.clientY;
    t=setTimeout(()=>{
      const start = hour*60;
      openCreate(start, start+60);
    },500);
  });

  el.addEventListener("pointermove", e=>{
    if(Math.abs(e.clientY-startY)>10) clearTimeout(t);
  });

  el.addEventListener("pointerup", ()=> clearTimeout(t));
}

/* ---------- bottom sheet ---------- */

const sheet = document.getElementById("sheet");

function openSheet() {
  sheet.classList.add("show");
  sheet.classList.remove("expanded");
}

function expandSheet() {
  sheet.classList.add("expanded");
}

function closeSheet() {
  sheet.classList.remove("show");
  editing=null;
}

document.getElementById("closeSheet").onclick=closeSheet;

/* swipe sheet */

let sy=0;
sheet.addEventListener("pointerdown", e=> sy=e.clientY);
sheet.addEventListener("pointerup", e=>{
  if(e.clientY - sy > 80) closeSheet();
  if(sy - e.clientY > 40) expandSheet();
});

/* ---------- create ---------- */

function openCreate(start,end){
  editing = { id:Date.now(), start,end,title:"",color:selectedColor };
  document.getElementById("titleInput").value="";
  openSheet();
}

/* ---------- colors ---------- */

const cr=document.getElementById("colorRow");
COLORS.forEach(c=>{
  const d=document.createElement("div");
  d.className="colorDot";
  d.style.background=c;
  d.onclick=()=>selectedColor=c;
  cr.appendChild(d);
});

/* ---------- render events ---------- */

function snap(m){ return Math.round(m/STEP)*STEP; }

function renderEvents(){
  document.querySelectorAll(".event").forEach(e=>e.remove());

  const grid = document.getElementById("dayGrid");

  events.forEach(ev=>{
    const el=document.createElement("div");
    el.className="event";
    el.style.background=ev.color;
    el.style.top = ev.start*PX_PER_MIN+"px";
    el.style.height = (ev.end-ev.start)*PX_PER_MIN+"px";
    el.innerText = ev.title;

    const ht=document.createElement("div");
    ht.className="handle top";
    const hb=document.createElement("div");
    hb.className="handle bottom";
    el.appendChild(ht);
    el.appendChild(hb);

    enableDrag(el, ev);

    el.onclick = e=>{
      e.stopPropagation();
      editing = ev;
      document.getElementById("titleInput").value=ev.title;
      openSheet();
      expandSheet();
    };

    grid.appendChild(el);
  });
}

/* ---------- drag / resize ---------- */

function enableDrag(el, ev){
  let mode=null;
  let lastY=0;

  el.addEventListener("pointerdown", e=>{
    e.stopPropagation();
    lastY=e.clientY;

    if(e.target.classList.contains("top")) mode="top";
    else if(e.target.classList.contains("bottom")) mode="bottom";
    else mode="move";

    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", e=>{
    if(!mode) return;
    const dy=e.clientY-lastY;
    lastY=e.clientY;

    const dm=snap(dy/PX_PER_MIN);

    if(mode==="move"){ ev.start+=dm; ev.end+=dm; }
    if(mode==="top"){ ev.start+=dm; }
    if(mode==="bottom"){ ev.end+=dm; }

    renderEvents();
  });

  el.addEventListener("pointerup", ()=>{
    mode=null;
    save();
  });
}

/* ---------- save ---------- */

document.getElementById("saveBtn").onclick=()=>{
  if(!editing) return;

  editing.title =
    document.getElementById("titleInput").value || "Событие";
  editing.color = selectedColor;

  const i = events.findIndex(e=>e.id===editing.id);
  if(i>=0) events[i]=editing;
  else events.push(editing);

  save();
  closeSheet();
  renderEvents();
};

function save(){
  localStorage.setItem("evts",JSON.stringify(events));
}

/* ---------- init ---------- */

setHeader();
buildGrid();
renderEvents();

if("serviceWorker" in navigator)
 navigator.serviceWorker.register("sw.js");
