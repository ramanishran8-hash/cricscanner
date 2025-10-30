async function fetchCricAPIData() {
  const apiKey = process.env.NEXT_PUBLIC_CRICAPI_KEY;

  if (!apiKey) {
    console.error("❌ CricAPI key missing! Add NEXT_PUBLIC_CRICAPI_KEY in Vercel settings.");
    return;
  }

  const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`;

  try {
    console.log("🌐 Fetching latest matches from CricAPI...");
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.data) {
      console.error("⚠️ CricAPI returned no match data:", data);
      return;
    }

    console.log(`✅ ${data.data.length} matches fetched from CricAPI`);
    localStorage.setItem("cricapi_matches", JSON.stringify(data.data));

    data.data.slice(0, 3).forEach((m) => console.log("🏏", m.name, "-", m.status));

  } catch (err) {
    console.error("❌ Error fetching CricAPI data:", err);
  }
}

fetchCricAPIData();
setInterval(fetchCricAPIData, 15 * 60 * 1000);
