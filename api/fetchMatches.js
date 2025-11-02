// /api/fetchMatches.js
// 🏏 Combined data fetcher for CricScanner
// Fetches both matches and tournaments from CricAPI
// Uses environment variable for API key (NEXT_PUBLIC_CRICAPI_KEY)

export default async function handler(req, res) {
  const apiKey = process.env.NEXT_PUBLIC_CRICAPI_KEY;

  if (!apiKey) {
    return res.status(500).json({ status: "error", message: "API key not found in environment variables." });
  }

  try {
    // Fetch matches
    const matchRes = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
    const matchData = await matchRes.json();

    // Fetch tournaments
    const tourRes = await fetch(`https://api.cricapi.com/v1/tournaments?apikey=${apiKey}`);
    const tourData = await tourRes.json();

    // Validate responses
    if (matchData.status !== "success" || tourData.status !== "success") {
      console.warn("⚠️ CricAPI returned an invalid structure:", { matchData, tourData });
      return res.status(500).json({ status: "error", message: "Invalid response from CricAPI" });
    }

    // Combine and send both
    res.status(200).json({
      status: "success",
      matches: matchData.data || [],
      tournaments: tourData.data || [],
      fetchedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Error fetching from CricAPI:", error);
    res.status(500).json({ status: "error", message: "Server error fetching data" });
  }
}
