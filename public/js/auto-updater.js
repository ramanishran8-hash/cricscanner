async function fetchCricAPIData() {
  // Instead of process.env, read from a hardcoded or injected public key
  const apiKey =
    window.CRICSANNER_CRICAPI_KEY ||
    "7282955f-2245-4cc4-becb-1f22ead081fa"; // ← your actual CricAPI key here temporarily

  if (!apiKey) {
    console.error("❌ CricAPI key missing. Set CRICSANNER_CRICAPI_KEY or inline key.");
    return;
  }

  const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`;

  try {
    console.log("🏏 Fetching latest matches from CricAPI...");
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.data) {
      console.error("⚠️ CricAPI returned no match data", data);
      return;
    }

    console.log(`✅ ${data.data.length} matches fetched from CricAPI`);
    localStorage.setItem("cricapi_matches", JSON.stringify(data.data));

    // Log a few matches to confirm
    data.data.slice(0, 3).forEach((m) => console.log("➡️", m.name, "-", m.status));
  } catch (err) {
    console.error("❌ Error fetching CricAPI data", err);
  }
}

// Fetch immediately, then every 15 minutes
fetchCricAPIData();
setInterval(fetchCricAPIData, 15 * 60 * 1000);

