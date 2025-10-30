console.log("🚀 CricAPI auto-updater started!");
async function fetchCricAPIData() {
  const apiKey = "7282955f-2245-4cc4-becb-1f22ead081fa"; // your CricAPI key
  const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`;

  try {
    console.log("🏏 Fetching latest matches from CricAPI...");
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.data) {
      console.error("⚠️ CricAPI returned no match data:", data);
      return;
    }

    console.log(`✅ ${data.data.length} matches fetched from CricAPI`);
    localStorage.setItem("cricapi_matches", JSON.stringify(data.data));

    // Print first few matches to verify
    data.data.slice(0, 3).forEach((m) => console.log("➡️", m.name, "-", m.status));
  } catch (err) {
    console.error("❌ Error fetching CricAPI data", err);
  }
}

// Run immediately and every 15 mins
fetchCricAPIData();
setInterval(fetchCricAPIData, 15 * 60 * 1000);
