// /public/js/displayMatches.js

function renderMatches() {
  const matches = JSON.parse(localStorage.getItem("matches") || "[]");
  const container = document.getElementById("matchesList");

  if (!container) return;
  container.innerHTML = "";

  if (matches.length === 0) {
    container.innerHTML = `<p class="text-gray-400">No matches available yet.</p>`;
    return;
  }

  matches.forEach(match => {
    const teams = match.teamInfo?.map(t => t.name).join(" vs ") || "TBD";
    const card = document.createElement("div");
    card.className =
      "bg-gray-800 rounded-2xl p-4 shadow-md hover:shadow-lg transition text-gray-200";

    card.innerHTML = `
      <h3 class="text-lg font-semibold text-white mb-1">${match.name}</h3>
      <p class="text-sm">${teams}</p>
      <p class="text-sm"><b>Venue:</b> ${match.venue || "Unknown"}</p>
      <p class="text-sm"><b>Status:</b> ${match.status}</p>
      <p class="text-xs text-gray-400 mt-2">
        ${new Date(match.date).toLocaleString()}
      </p>
    `;
    container.appendChild(card);
  });
}

// Initial render
document.addEventListener("DOMContentLoaded", renderMatches);

// Re-render automatically if new data is saved
window.addEventListener("storage", e => {
  if (e.key === "matches") renderMatches();
});

