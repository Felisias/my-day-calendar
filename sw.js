self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("cal").then(c=>c.addAll([
      "./",
      "./index.html",
      "./style.css",
      "./app.js"
    ]))
  );
});
