// /api/fetchMatches.js
export default async function handler(req, res) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_CRICAPI_KEY; // use your env var
    const response = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`);

    if (!response.ok) {
      return res.status(response.status).json({
        status: "error",
        message: "Failed to fetch matches from CricAPI",
      });
    }

    const data = await response.json();

    // Optional: you can filter or format data here if needed
    res.status(200).json({
      status: "success",
      fetchedAt: new Date().toISOString(),
      matches: data.data || data.matches || [],
    });
  } catch (error) {
    console.error("Proxy API error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}

