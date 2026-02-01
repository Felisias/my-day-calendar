const Storage = {
  load() {
    return JSON.parse(localStorage.getItem("events") || "[]");
  },
  save(data) {
    localStorage.setItem("events", JSON.stringify(data));
  }
};
