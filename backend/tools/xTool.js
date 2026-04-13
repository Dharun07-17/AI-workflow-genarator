const axios = require("axios");

async function runX(query) {
  try {
    console.log("[X Tool] Searching via Nitter...");

    // Working Nitter instances as of 2024
    const instances = [
      "https://nitter.poast.org",
      "https://nitter.privacydev.net",
      "https://nitter.net",
      "https://nitter.unixfox.eu"
    ];

    for (const instance of instances) {
      try {
        // Search for actual trending topics instead of the literal query
        const keywords = query
          .toLowerCase()
          .replace(/search|twitter|for|and|summarize|show|me|tweets|about|find|x posts/g, "")
          .trim()
          .split(" ")
          .filter(w => w.length > 2)
          .slice(0, 3)
          .join(" ");

        const searchQuery = keywords || "AI technology";
        const url = `${instance}/search?f=tweets&q=${encodeURIComponent(searchQuery)}`;

        console.log(`[X Tool] Trying: ${url}`);

        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html"
          },
          timeout: 10000
        });

        if (response.status !== 200) continue;

        const html = response.data;

        // Extract tweets using regex patterns
        const tweetPattern = /<div class="tweet-content media-body">([^<]+)/g;
        const usernamePattern = /<a class="username"[^>]*title="@([^"]+)"/g;
        const statsPattern = /<span class="tweet-stat">.*?<span class="icon-[^"]+"><\/span>\s*(\d+)/g;

        const tweets = [];
        const usernames = [];
        let match;

        while ((match = tweetPattern.exec(html)) !== null && tweets.length < 10) {
          tweets.push(match[1].trim());
        }

        while ((match = usernamePattern.exec(html)) !== null && usernames.length < 10) {
          usernames.push(match[1]);
        }

        if (tweets.length > 0) {
          console.log(`[X Tool] Found ${tweets.length} posts from ${instance}`);
          return tweets.map((text, i) => ({
            text:   text,
            author: usernames[i] ? `@${usernames[i]}` : "@unknown",
            source: `X (via ${instance.replace("https://", "")})`
          }));
        }

      } catch (err) {
        console.warn(`[X Tool] ${instance} failed:`, err.message);
        continue;
      }
    }

    console.warn("[X Tool] All Nitter instances failed, using mock");
    return generateMockPosts(query);

  } catch (err) {
    console.error("[X Tool] Error:", err.message);
    return generateMockPosts(query);
  }
}

function generateMockPosts(query) {
  // Extract meaningful keywords from query
  const keywords = query
    .toLowerCase()
    .replace(/search|twitter|for|and|summarize|show|me|tweets|about|find|x posts/g, "")
    .trim() || "technology";

  const mockUsers = [
    "@elonmusk",
    "@OpenAI", 
    "@sama",
    "@karpathy",
    "@ylecun",
    "@AndrewYNg",
    "@hardmaru"
  ];

  const templates = [
    `Just published new research on ${keywords} 🚀`,
    `${keywords} is evolving faster than anyone expected`,
    `Hot take: ${keywords} will change everything in the next 5 years`,
    `New breakthrough in ${keywords} announced today`,
    `Everyone talking about ${keywords} but missing this key point...`,
    `${keywords} update: major progress this week`,
    `Excited to share our latest work on ${keywords}`
  ];

  return templates.slice(0, 5).map((template, i) => ({
    text:     template,
    author:   mockUsers[i % mockUsers.length],
    source:   "Mock",
    likes:    Math.floor(Math.random() * 50000) + 1000,
    retweets: Math.floor(Math.random() * 10000) + 100
  }));
}

module.exports = { runX };
