window.CricStorage = {
  async getData() {
    try {
      const stored = localStorage.getItem("cricapi_matches");
      if (!stored) return { tournaments: [], matches: [] };

      const data = JSON.parse(stored);
      const matches = data.map((m, i) => ({
        id: i,
        teamA: m.teams?.[0] || "TBD",
        teamB: m.teams?.[1] || "TBD",
        startTime: m.dateTimeGMT,
        endTime: m.dateTimeGMT,
        location: m.venue || "Venue TBA",
        scoreA: m.score?.[0]?.r || null,
        scoreB: m.score?.[1]?.r || null,
        status: m.status || "Match status unavailable",
        tournamentId: m.series_id || "default",
      }));

      const tournaments = [
        ...new Set(matches.map((m) => m.tournamentId)),
      ].map((id) => ({ id, name: `Series ${id}`, location: "—" }));

      return { tournaments, matches };
    } catch (err) {
      console.error("❌ Error parsing CricAPI data:", err);
      return { tournaments: [], matches: [] };
    }
  },
};

// Optional rendering (only if matches-wrapper exists)
document.addEventListener("DOMContentLoaded", () => {
  const wrapper =
    document.getElementById("matches-wrapper") ||
    document.getElementById("matchesWrapper");

  // 🧩 Safety check — stop if on admin page
  if (!wrapper) return;

  function renderCricAPIMatches() {
    const stored = localStorage.getItem("cricapi_matches");
    if (!stored) {
      console.log("No CricAPI data found in localStorage yet.");
      return;
    }

    const matches = JSON.parse(stored);
    wrapper.innerHTML = "";

    matches.slice(0, 5).forEach((m) => {
      const div = document.createElement("div");
      div.className = "p-4 mb-2 bg-slate-800 rounded-lg";
      div.innerHTML = `
        <h3 class="text-white font-semibold">${m.name || `${m.teams?.[0]} vs ${m.teams?.[1]}`}</h3>
        <p class="text-slate-400 text-sm">${m.status || "Match status unavailable"}</p>
      `;
      wrapper.appendChild(div);
    });
  }

  renderCricAPIMatches();
  window.addEventListener("storage", renderCricAPIMatches);
});
