// /api/fetchMatches.js
// 🏏 Serverless API route for CricScanner
// Fetches matches from CricAPI via secure backend (to protect API key)

export default async function handler(req, res) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_CRICAPI_KEY; // stored in Vercel env vars

    if (!apiKey) {
      return res.status(500).json({ status: "error", message: "Missing API key" });
    }

    // Fetch from CricAPI
    const apiRes = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
    const data = await apiRes.json();

    if (!apiRes.ok || !data.data) {
      return res.status(500).json({
        status: "error",
        message: data.reason || "CricAPI request failed",
      });
    }

    // Simplify and format matches
    const matches = data.data.map(match => ({
      id: match.id,
      name: match.name,
      teamInfo: match.teamInfo,
      venue: match.venue,
      status: match.status,
      date: match.date,
      matchType: match.matchType,
    }));

    // Send structured response
    return res.status(200).json({
      status: "success",
      matches,
      tournaments: [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Error in fetchMatches API:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
