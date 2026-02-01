self.addEventListener("install",e=>{
 e.waitUntil(caches.open("p").then(c=>c.addAll([
  "./","./index.html","./style.css","./app.js"
 ])))
});
