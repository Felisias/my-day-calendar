const COLORS = [
 "#4285F4","#EA4335","#34A853","#FBBC05",
 "#A142F4","#24C1E0","#F06292","#9CCC65"
];

const sheet = document.getElementById("sheet");
const titleInput = document.getElementById("titleInput");
const sheetMore = document.getElementById("sheetMore");

function openSheet() {
  sheet.classList.remove("hidden");
}

function closeSheet() {
  sheet.classList.add("hidden");
}

function buildColors() {
  const row = document.getElementById("colorRow");
  COLORS.forEach(c=>{
    const d=document.createElement("div");
    d.className="colorDot";
    d.style.background=c;
    d.onclick=()=> selectedColor=c;
    row.appendChild(d);
  });
}
