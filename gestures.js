function enableEventDrag(el, ev) {

  let mode=null;

  el.addEventListener("pointerdown", e=>{
    if(e.target.classList.contains("handle")) {
      mode = e.target.classList.contains("top") ? "resizeTop" : "resizeBottom";
    } else {
      mode="move";
    }
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", e=>{
    if(!mode) return;
    const dy = e.movementY;
    const dm = snap(dy);

    if(mode==="move") {
      ev.start += dm;
      ev.end += dm;
    }

    if(mode==="resizeBottom") ev.end += dm;
    if(mode==="resizeTop") ev.start += dm;

    render();
  });

  el.addEventListener("pointerup", ()=> mode=null);
}
