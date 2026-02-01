let events = Storage.load();
let currentDate = new Date();
let selectedColor = COLORS[0];
let creating = null;

function render() {

  const cal = document.getElementById("calendar");
  cal.innerHTML="";

  for(let h=0;h<24;h++){
    const row=document.createElement("div");
    row.className="hour";

    const label=document.createElement("div");
    label.className="hourLabel";
    label.innerText=h+":00";
    row.appendChild(label);

    row.onpointerdown = e=>{
      creating = {
        start:h*60,
        end:h*60+60,
        color:selectedColor,
        title:""
      };
      openSheet();
    };

    cal.appendChild(row);
  }

  layoutEvents();
}

function layoutEvents() {
  const cal = document.getElementById("calendar");

  events.forEach(ev=>{
    const el=document.createElement("div");
    el.className="event";
    el.style.background=ev.color;

    el.style.top = ev.start + "px";
    el.style.height = (ev.end-ev.start)+"px";
    el.style.left="60px";
    el.style.right="10px";

    el.innerText = ev.title;

    const h1=document.createElement("div");
    h1.className="handle top";
    const h2=document.createElement("div");
    h2.className="handle bottom";
    el.appendChild(h1);
    el.appendChild(h2);

    enableEventDrag(el, ev);

    cal.appendChild(el);
  });
}

document.getElementById("saveBtn").onclick=()=>{
  creating.title = titleInput.value;
  creating.color = selectedColor;
  events.push(creating);
  Storage.save(events);
  closeSheet();
  render();
};

document.getElementById("cancelBtn").onclick=closeSheet;

buildColors();
render();

if ("serviceWorker" in navigator)
 navigator.serviceWorker.register("sw.js");
