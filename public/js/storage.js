document.addEventListener("DOMContentLoaded", () => {
  // Look for the correct wrapper (public index.html)
  const wrapper = document.getElementById("matchesWrapper") || document.getElementById("matches-wrapper");
  if (!wrapper) return; // Stop if not on index page

  function renderCricAPIMatches() {
    const stored = localStorage.getItem("cricapi_matches");
    if (!stored) {
      console.log("⚠️ No CricAPI data found in localStorage yet.");
      return;
    }

    const matches = JSON.parse(stored);
    wrapper.innerHTML = ""; // Clear old content

    matches.slice(0, 6).forEach((m) => {
      const div = document.createElement("div");
      div.className = "p-4 bg-slate-800 rounded-lg border border-slate-700 shadow-md hover:border-emerald-400 transition";

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

  // Render initially and whenever localStorage updates
  renderCricAPIMatches();
  window.addEventListener("storage", renderCricAPIMatches);
});
