self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("planner").then(c=>c.addAll([
      "./","./index.html","./style.css","./app.js"
    ]))
  );
});
