const cal = document.getElementById("calendar");
const sheet = document.getElementById("sheet");

let hourH = 100;
document.documentElement.style.setProperty("--hourH", hourH+"px");

const SNAP = 15;

let mode = "day";
let baseDate = new Date();
let events = load();

render();

/* ---------- TAP CREATE ---------- */

cal.onclick = e => {
  if (e.target !== cal) return;

  const y = cal.scrollTop + e.clientY;
  const mins = snap(Math.floor(y / (hourH/60)));

  startInput.value = minToTime(mins);
  endInput.value = minToTime(mins+60);

  openSheet();
};

/* ---------- BOTTOM SHEET ---------- */

function openSheet(){
  sheet.classList.add("show");
}

saveBtn.onclick = () => {
  events.push({
    id: Date.now(),
    date: key(baseDate),
    title: titleInput.value,
    start: startInput.value,
    end: endInput.value,
    color: colorInput.value,
    category: categoryInput.value,
    tags: tagsInput.value,
    repeat: repeatInput.value
  });
  store();
  sheet.classList.remove("show");
  render();
};

/* ---------- RENDER ---------- */

function render(){
  cal.innerHTML="";
  drawHours();
  drawEvents(layout(expand(events)));
  dateTitle.innerText = baseDate.toDateString();
}

function drawHours(){
  for(let h=0;h<24;h++){
    const d=document.createElement("div");
    d.className="hour";
    d.style.top=(h*hourH-6)+"px";
    d.innerText=h+":00";
    cal.appendChild(d);
  }
}

/* ---------- EVENT LAYOUT (overlap like google) ---------- */

function layout(list){
  list.sort((a,b)=>toMin(a.start)-toMin(b.start));
  let cols=[];

  list.forEach(ev=>{
    let placed=false;
    for(let col of cols){
      if(toMin(ev.start)>=col.end){
        col.items.push(ev);
        col.end=toMin(ev.end);
        placed=true;
        break;
      }
    }
    if(!placed){
      cols.push({end:toMin(ev.end),items:[ev]});
    }
  });

  const width = 90/cols.length;

  cols.forEach((col,i)=>{
    col.items.forEach(ev=>{
      ev._left = 60 + i*width;
      ev._width = width-2;
    });
  });

  return list;
}

function drawEvents(list){
  list.forEach(ev=>{
    const el=document.createElement("div");
    el.className="event";
    el.style.background=ev.color;

    const s=toMin(ev.start);
    const e=toMin(ev.end);

    el.style.top=s*(hourH/60)+"px";
    el.style.height=(e-s)*(hourH/60)+"px";
    el.style.left=ev._left+"%";
    el.style.width=ev._width+"%";

    el.innerHTML = ev.title;

    enableDrag(el,ev);
    enableResize(el,ev);

    cal.appendChild(el);
  });
}

/* ---------- DRAG ---------- */

function enableDrag(el,ev){
  let sy, st;

  el.onpointerdown = e=>{
    sy=e.clientY;
    st=parseFloat(el.style.top);
    el.setPointerCapture(e.pointerId);
  };

  el.onpointermove = e=>{
    if(sy==null) return;
    let dy=e.clientY-sy;
    let mins = snap((st+dy)/(hourH/60));
    el.style.top = mins*(hourH/60)+"px";
  };

  el.onpointerup = ()=>{
    const mins=parseFloat(el.style.top)/(hourH/60);
    const dur=toMin(ev.end)-toMin(ev.start);
    ev.start=minToTime(mins);
    ev.end=minToTime(mins+dur);
    store();
    sy=null;
  };
}

/* ---------- RESIZE ---------- */

function enableResize(el,ev){
  const r=document.createElement("div");
  r.className="resize";
  el.appendChild(r);

  let sy, sh;

  r.onpointerdown=e=>{
    e.stopPropagation();
    sy=e.clientY;
    sh=parseFloat(el.style.height);
  };

  r.onpointermove=e=>{
    if(sy==null) return;
    let dy=e.clientY-sy;
    let mins=snap((sh+dy)/(hourH/60));
    el.style.height=mins*(hourH/60)+"px";
  };

  r.onpointerup=()=>{
    const dur=parseFloat(el.style.height)/(hourH/60);
    ev.end=minToTime(toMin(ev.start)+dur);
    store();
    sy=null;
  };
}

/* ---------- SWIPE DAY ---------- */

let touchX;

document.body.addEventListener("touchstart",e=>{
  touchX=e.touches[0].clientX;
});

document.body.addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].clientX-touchX;
  if(Math.abs(dx)>60){
    baseDate.setDate(baseDate.getDate()+(dx<0?1:-1));
    render();
  }
});

/* ---------- REPEAT ---------- */

function expand(list){
  const out=[];
  list.forEach(ev=>{
    if(ev.repeat==="none") out.push(ev);
    if(ev.repeat==="daily")
      for(let i=0;i<7;i++) out.push({...ev,date:shift(ev.date,i)});
    if(ev.repeat==="weekly")
      for(let i=0;i<4;i++) out.push({...ev,date:shift(ev.date,i*7)});
  });
  return out.filter(e=>e.date===key(baseDate));
}

/* ---------- UTILS ---------- */

function toMin(t){let[a,b]=t.split(":");return a*60+ +b;}
function minToTime(m){m=Math.max(0,m);return String(m/60|0).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function snap(m){return Math.round(m/SNAP)*SNAP}
function key(d){return d.toISOString().slice(0,10)}
function shift(k,d){let x=new Date(k);x.setDate(x.getDate()+d);return key(x)}

function store(){localStorage.setItem("cal",JSON.stringify(events))}
function load(){return JSON.parse(localStorage.getItem("cal")||"[]")}
