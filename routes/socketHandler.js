import { shopScraper } from "../shop_scraper/shopScraper.js";

export default function shopSocketHandler(ws) {
  ws.on("message", async (message) => {
    let payload = {};
    try {
      payload = JSON.parse(message);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      ws.send("❌ Invalid message format.");
      ws.close();
      return;
    }

    const { apiKey, query, lat, lng, maxResults } = payload;

    const send = (msg) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    };

    try {
      // 👇 Pass the payload along with progressUpdate
      await shopScraper({
        apiKey,
        query,
        lat,
        lng,
        maxResults,
        progressUpdate: send,
      });

      send("✅ Search complete.");
    } catch (err) {
      send(`❌ Error: ${err.message}`);
    } finally {
      ws.close();
    }
  });
}
