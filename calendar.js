const STEP = 15;

function minutesToPx(m) {
  return m * (60/60);
}

function snap(m) {
  return Math.round(m/STEP)*STEP;
}

function overlaps(a,b) {
  return a.start < b.end && b.start < a.end;
}
