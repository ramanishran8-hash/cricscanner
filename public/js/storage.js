document.addEventListener("DOMContentLoaded", () => {
  // ✅ Only run on public pages that have a matches wrapper
  const wrapper =
    document.getElementById("matchesWrapper") ||
    document.getElementById("matches-wrapper");

  // 🧩 Stop completely if wrapper isn't found (like on admin.html)
  if (!wrapper) {
    console.log("⚙️ Skipping match render — wrapper not found on this page.");
    return;
  }

  function renderCricAPIMatches() {
    const stored = localStorage.getItem("cricapi_matches");
    if (!stored) {
      console.log("⚠️ No CricAPI data found in localStorage yet.");
      return;
    }

    const matches = JSON.parse(stored);
    wrapper.innerHTML = "";

    matches.slice(0, 8).forEach((m) => {
      const div = document.createElement("div");
      div.className =
        "p-4 bg-slate-800 rounded-lg border border-slate-700 shadow-md hover:border-emerald-400 transition";

      const name = m.name || `${m.teams?.[0]} vs ${m.teams?.[1]}`;
      const venue = m.venue || "Venue TBA";
      const status = m.status || "Status unavailable";

      div.innerHTML = `
        <h3 class="text-lg font-semibold text-white mb-1">${name}</h3>
        <p class="text-sm text-slate-400 mb-1">${venue}</p>
        <p class="text-sm text-emerald-300">${status}</p>
      `;

      wrapper.appendChild(div);
    });
  }

  renderCricAPIMatches();
  window.addEventListener("storage", renderCricAPIMatches);
});

