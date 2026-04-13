async function runReddit(query) {
  try {
    const lower = query.toLowerCase();

    // Extract meaningful keywords from complex queries
    const extractKeywords = (text) => {
      const stopWords = /\b(search|find|show|me|get|fetch|for|and|the|a|an|on|in|about|compare|them|with)\b/gi;
      return text
        .replace(stopWords, " ")
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 3)
        .join(" ") || text;
    };

    let url;

    if (lower.includes("top") && lower.includes("all time")) {
      url = "https://www.reddit.com/r/all/top.json?t=all&limit=10";
    } else if (lower.includes("top") && lower.includes("today")) {
      url = "https://www.reddit.com/r/all/top.json?t=day&limit=10";
    } else if (lower.includes("top") && lower.includes("week")) {
      url = "https://www.reddit.com/r/all/top.json?t=week&limit=10";
    } else if (lower.includes("top") && lower.includes("month")) {
      url = "https://www.reddit.com/r/all/top.json?t=month&limit=10";
    } else if (lower.includes("top") && lower.includes("year")) {
      url = "https://www.reddit.com/r/all/top.json?t=year&limit=10";
    } else if (lower.includes("front page") || lower.includes("home page")) {
      url = "https://www.reddit.com/.json?limit=10";
    } else if (lower.includes("new") || lower.includes("latest")) {
      url = "https://www.reddit.com/r/all/new.json?limit=10";
    } else if (lower.includes("rising")) {
      url = "https://www.reddit.com/r/all/rising.json?limit=10";
    } else if (lower.includes("hot")) {
      url = "https://www.reddit.com/r/all/hot.json?limit=10";
    } else {
      // Extract keywords for search
      const keywords = extractKeywords(query);
      url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keywords)}&sort=relevance&limit=10`;
    }

    console.log("[Reddit] Fetching:", url);

    const response = await fetch(url, {
      headers: { "User-Agent": "ai-workflow-bot/1.0" }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data  = await response.json();
    const posts = data?.data?.children?.map((c, i) => ({
      rank:      i + 1,
      title:     c.data.title,
      subreddit: c.data.subreddit_name_prefixed,
      score:     c.data.score,
      comments:  c.data.num_comments,
      url:       `https://reddit.com${c.data.permalink}`,
      type:      c.data.is_video ? "video" : c.data.post_hint || "text"
    })) || [];

    if (posts.length === 0) {
      return [{ title: "No results found", url: "" }];
    }

    console.log(`[Reddit] Got ${posts.length} posts`);
    return posts;

  } catch (err) {
    console.warn("[Reddit] Error:", err.message);
    return [{ title: `[MOCK] Reddit result for: ${query}`, url: "#" }];
  }
}

module.exports = { runReddit };
