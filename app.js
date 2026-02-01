const calendar = document.getElementById("calendar");
const modal = document.getElementById("modal");

const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const dayBtn = document.getElementById("dayViewBtn");
const weekBtn = document.getElementById("weekViewBtn");

const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

let viewMode = "day";
let hourHeight = 100;
document.documentElement.style.setProperty("--hourHeight", hourHeight + "px");

const PX_PER_MIN = () => hourHeight / 60;
const SNAP = 15;

let events = loadEvents();
let selectedDate = new Date();

renderAll();

/* ---------- VIEW ---------- */

dayBtn.onclick = () => { viewMode = "day"; renderAll(); };
weekBtn.onclick = () => { viewMode = "week"; renderAll(); };

zoomInBtn.onclick = () => {
  hourHeight = Math.min(200, hourHeight + 20);
  document.documentElement.style.setProperty("--hourHeight", hourHeight + "px");
  renderAll();
};

zoomOutBtn.onclick = () => {
  hourHeight = Math.max(60, hourHeight - 20);
  document.documentElement.style.setProperty("--hourHeight", hourHeight + "px");
  renderAll();
};

/* ---------- MODAL ---------- */

addBtn.onclick = () => modal.classList.remove("hidden");
cancelBtn.onclick = () => modal.classList.add("hidden");

saveBtn.onclick = () => {
  const ev = {
    id: Date.now(),
    title: titleInput.value,
    start: startInput.value,
    end: endInput.value,
    color: colorInput.value,
    category: categoryInput.value,
    tags: tagsInput.value,
    repeat: repeatInput.value,
    date: dateKey(selectedDate)
  };

  events.push(ev);
  saveEvents();
  modal.classList.add("hidden");
  renderAll();
};

/* ---------- RENDER ---------- */

function renderAll() {
  calendar.innerHTML = "";
  renderHours();
  if (viewMode === "week") renderWeekLines();
  renderEventsExpanded();
}

function renderHours() {
  for (let h=0; h<24; h++) {
    const d = document.createElement("div");
    d.className = "hour-label";
    d.style.top = (h * hourHeight - 6) + "px";
    d.innerText = String(h).padStart(2,"0")+":00";
    calendar.appendChild(d);
  }
}

function renderWeekLines() {
  for (let i=1;i<7;i++){
    const line = document.createElement("div");
    line.className="day-col-line";
    line.style.left = (i*(100/7))+"%";
    calendar.appendChild(line);
  }
}

function renderEventsExpanded() {
  const list = expandRepeats(events);

  list.forEach(ev => drawEvent(ev));
}

function drawEvent(ev) {
  const start = timeToMin(ev.start);
  const end = timeToMin(ev.end);

  const el = document.createElement("div");
  el.className = "event";
  el.style.background = ev.color;

  el.style.top = start * PX_PER_MIN() + "px";
  el.style.height = (end-start) * PX_PER_MIN() + "px";

  if (viewMode === "week") {
    const dayIndex = dayOffset(ev.date);
    el.style.left = (dayIndex*(100/7)+1)+"%";
    el.style.width = (100/7 - 2)+"%";
  } else {
    el.style.left = "60px";
    el.style.right = "6px";
  }

  el.innerHTML = `
    <div class="event-title">${ev.title}</div>
    <div>${ev.category || ""}</div>
    <div class="event-tags">${ev.tags || ""}</div>
  `;

  makeDraggable(el, ev);
  calendar.appendChild(el);
}

/* ---------- DRAG ---------- */

function makeDraggable(el, ev) {
  let startY, startTop;

  el.onpointerdown = e => {
    startY = e.clientY;
    startTop = parseFloat(el.style.top);
    el.setPointerCapture(e.pointerId);
  };

  el.onpointermove = e => {
    if (startY == null) return;

    const dy = e.clientY - startY;
    let newTop = startTop + dy;

    let minutes = newTop / PX_PER_MIN();
    minutes = Math.round(minutes / SNAP) * SNAP;
    newTop = minutes * PX_PER_MIN();

    el.style.top = newTop + "px";
  };

  el.onpointerup = () => {
    const minutes = parseFloat(el.style.top) / PX_PER_MIN();
    const dur = timeToMin(ev.end) - timeToMin(ev.start);

    ev.start = minToTime(minutes);
    ev.end = minToTime(minutes + dur);

    saveEvents();
    startY = null;
  };
}

/* ---------- REPEAT ---------- */

function expandRepeats(base) {
  const out = [];

  base.forEach(ev => {
    if (ev.repeat === "none") out.push(ev);

    if (ev.repeat === "daily") {
      for (let i=0;i<7;i++){
        out.push({...ev, date: shiftDate(ev.date,i)});
      }
    }

    if (ev.repeat === "weekly") {
      for (let i=0;i<4;i++){
        out.push({...ev, date: shiftDate(ev.date,i*7)});
      }
    }
  });

  return out;
}

/* ---------- UTILS ---------- */

function timeToMin(t){
  const [h,m]=t.split(":").map(Number);
  return h*60+m;
}

function minToTime(m){
  m = Math.max(0, Math.min(1439, m));
  const h=Math.floor(m/60);
  const mm=m%60;
  return String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0");
}

function dateKey(d){
  return d.toISOString().slice(0,10);
}

function shiftDate(key,days){
  const d=new Date(key);
  d.setDate(d.getDate()+days);
  return dateKey(d);
}

function dayOffset(key){
  const d=new Date(key);
  return (d.getDay()+6)%7;
}

function saveEvents(){
  localStorage.setItem("smartcal_events", JSON.stringify(events));
}

function loadEvents(){
  return JSON.parse(localStorage.getItem("smartcal_events")||"[]");
}
