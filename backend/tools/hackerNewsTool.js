const axios = require("axios");

async function runHackerNews(query) {
  try {
    console.log("[HackerNews] Searching...");

    // Extract meaningful keywords from complex queries
    const extractKeywords = (text) => {
      const stopWords = /\b(search|find|show|me|get|fetch|for|and|the|a|an|on|in|about|compare|them|with|hacker|news|reddit)\b/gi;
      const cleaned = text
        .replace(stopWords, " ")
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 4)
        .join(" ");
      
      return cleaned || text;
    };

    const keywords = extractKeywords(query);
    console.log("[HackerNews] Keywords:", keywords);

    const response = await axios.get("https://hn.algolia.com/api/v1/search", {
      params: {
        query: keywords,
        tags: "story",
        hitsPerPage: 10
      },
      timeout: 10000
    });

    const hits = response.data?.hits || [];

    if (hits.length === 0) {
      console.warn("[HackerNews] No results, trying broader search");
      
      // Try again with just the first word
      const fallbackQuery = keywords.split(" ")[0] || "technology";
      const fallbackResponse = await axios.get("https://hn.algolia.com/api/v1/search", {
        params: {
          query: fallbackQuery,
          tags: "story",
          hitsPerPage: 10
        },
        timeout: 10000
      });

      const fallbackHits = fallbackResponse.data?.hits || [];
      
      if (fallbackHits.length === 0) {
        return [{ title: "No results found", url: "" }];
      }

      console.log(`[HackerNews] Found ${fallbackHits.length} stories (fallback)`);
      return fallbackHits.map((h, i) => ({
        rank:     i + 1,
        title:    h.title,
        url:      h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        points:   h.points || 0,
        comments: h.num_comments || 0,
        author:   h.author,
        source:   "Hacker News"
      }));
    }

    console.log(`[HackerNews] Found ${hits.length} stories`);
    return hits.map((h, i) => ({
      rank:     i + 1,
      title:    h.title,
      url:      h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      points:   h.points || 0,
      comments: h.num_comments || 0,
      author:   h.author,
      source:   "Hacker News"
    }));

  } catch (err) {
    console.error("[HackerNews] Error:", err.message);
    return [{ title: `[MOCK] HN result for: ${query}`, url: "#" }];
  }
}

module.exports = { runHackerNews };
