const cal = document.getElementById("calendar");
const sheet = document.getElementById("sheet");

const SNAP = 15;
const HOUR_H = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hourH'));
const PX_PER_MIN = () => HOUR_H()/60;

let date = new Date();
let events = load();

render();

/* ---------- navigation ---------- */

prevBtn.onclick = () => { date.setDate(date.getDate()-1); render(); };
nextBtn.onclick = () => { date.setDate(date.getDate()+1); render(); };

/* ---------- create by tap ---------- */

cal.addEventListener("pointerdown", e => {
  if (e.target !== cal) return;

  const rect = cal.getBoundingClientRect();
  const y = e.clientY - rect.top + cal.scrollTop;
  const m = snap(Math.floor(y / PX_PER_MIN()));

  startInput.value = minToTime(m);
  endInput.value = minToTime(m+60);
  openSheet();
});

/* ---------- sheet ---------- */

function openSheet(){ sheet.classList.add("show"); }

saveBtn.onclick = () => {
  events.push({
    id: Date.now(),
    date: key(date),
    title: titleInput.value || "Событие",
    start: startInput.value,
    end: endInput.value,
    color: colorInput.value,
    repeat: repeatInput.value
  });
  store();
  sheet.classList.remove("show");
  render();
};

/* ---------- render ---------- */

function render(){
  cal.innerHTML="";
  dateLabel.innerText = date.toLocaleDateString("ru-RU",{weekday:"short",day:"numeric",month:"short"});
  drawHours();
  drawEvents(layout(expand(events)));
}

function drawHours(){
  for(let h=0;h<24;h++){
    const d=document.createElement("div");
    d.className="hour";
    d.style.top=(h*HOUR_H()-6)+"px";
    d.innerText=h+":00";
    cal.appendChild(d);
  }
}

/* ---------- layout overlap ---------- */

function layout(list){
  list.sort((a,b)=>toMin(a.start)-toMin(b.start));
  const cols=[];

  list.forEach(ev=>{
    let placed=false;
    for(const col of cols){
      if(toMin(ev.start)>=col.end){
        col.end=toMin(ev.end);
        col.items.push(ev);
        placed=true;
        break;
      }
    }
    if(!placed){
      cols.push({end:toMin(ev.end),items:[ev]});
    }
  });

  const w = 92/cols.length;

  cols.forEach((col,i)=>{
    col.items.forEach(ev=>{
      ev._left = 6 + i*w;
      ev._width = w-2;
    });
  });

  return list;
}

/* ---------- draw events ---------- */

function drawEvents(list){
  list.forEach(ev=>{
    const el=document.createElement("div");
    el.className="event";
    el.style.background=ev.color;

    const s=toMin(ev.start);
    const e=toMin(ev.end);

    el.style.top=s*PX_PER_MIN()+"px";
    el.style.height=(e-s)*PX_PER_MIN()+"px";
    el.style.left=ev._left+"%";
    el.style.width=ev._width+"%";

    el.innerHTML = `
      <div>${ev.title}</div>
      <div class="event-time">${ev.start} – ${ev.end}</div>
    `;

    dragEvent(el,ev);
    resizeEvent(el,ev);

    cal.appendChild(el);
  });
}

/* ---------- drag ---------- */

function dragEvent(el,ev){
  let startY, startTop;

  el.onpointerdown = e=>{
    startY=e.clientY;
    startTop=parseFloat(el.style.top);
    el.setPointerCapture(e.pointerId);
  };

  el.onpointermove = e=>{
    if(startY==null) return;
    const dy=e.clientY-startY;
    const mins=snap((startTop+dy)/PX_PER_MIN());
    el.style.top = mins*PX_PER_MIN()+"px";
  };

  el.onpointerup = ()=>{
    if(startY==null) return;
    const mins=parseFloat(el.style.top)/PX_PER_MIN();
    const dur=toMin(ev.end)-toMin(ev.start);
    ev.start=minToTime(mins);
    ev.end=minToTime(mins+dur);
    store();
    startY=null;
    render();
  };
}

/* ---------- resize ---------- */

function resizeEvent(el,ev){
  const r=document.createElement("div");
  r.className="resize";
  el.appendChild(r);

  let sy, sh;

  r.onpointerdown=e=>{
    e.stopPropagation();
    sy=e.clientY;
    sh=parseFloat(el.style.height);
    r.setPointerCapture(e.pointerId);
  };

  r.onpointermove=e=>{
    if(sy==null) return;
    const dy=e.clientY-sy;
    const mins=snap((sh+dy)/PX_PER_MIN());
    el.style.height = Math.max(15*PX_PER_MIN(), mins*PX_PER_MIN())+"px";
  };

  r.onpointerup=()=>{
    if(sy==null) return;
    const dur=parseFloat(el.style.height)/PX_PER_MIN();
    ev.end=minToTime(toMin(ev.start)+dur);
    store();
    sy=null;
    render();
  };
}

/* ---------- repeat ---------- */

function expand(list){
  const out=[];
  list.forEach(ev=>{
    if(ev.repeat==="none") out.push(ev);
    if(ev.repeat==="daily")
      for(let i=0;i<7;i++) out.push({...ev,date:shift(ev.date,i)});
    if(ev.repeat==="weekly")
      for(let i=0;i<4;i++) out.push({...ev,date:shift(ev.date,i*7)});
  });
  return out.filter(e=>e.date===key(date));
}

/* ---------- utils ---------- */

function snap(m){ return Math.round(m/SNAP)*SNAP; }
function toMin(t){ let[a,b]=t.split(":"); return a*60+ +b; }
function minToTime(m){
  m=Math.max(0,Math.min(1439,m));
  return String(m/60|0).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
}
function key(d){ return d.toISOString().slice(0,10); }
function shift(k,d){ let x=new Date(k); x.setDate(x.getDate()+d); return key(x); }

function store(){ localStorage.setItem("gcal_like",JSON.stringify(events)); }
function load(){ return JSON.parse(localStorage.getItem("gcal_like")||"[]"); }
