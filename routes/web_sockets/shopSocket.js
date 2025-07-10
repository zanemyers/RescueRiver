import { shopScraper } from "../../shop_scraper/shopScraper.js";
import { initCancellationToken } from "./cancellationToken.js";

export default function shopSocket(ws) {
  const cancelToken = initCancellationToken();

  console.log("🟢 WebSocket connected");

  const sendData = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  };

  ws.on("message", async (message, isBinary) => {
    let payload = null;

    if (isBinary) {
      payload = { fileBuffer: message }; // Wrap it as an object for the scraper
    } else {
      try {
        payload = JSON.parse(message);
      } catch {
        sendData("❌ Invalid message format.");
        ws.close();
        return;
      }

      // 2️⃣ Handle cancellation immediately for JSON
      if (payload.action === "cancel") {
        cancelToken.cancel();
        sendData("❌ Search cancelled.");
        ws.close();
        return;
      }
    }

    try {
      const progressUpdate = (msg) => {
        if (!cancelToken.isCancelled()) sendData(msg);
      };

      const returnFile = async (buffer) => {
        if (!cancelToken.isCancelled()) {
          // Send the Excel file buffer as binary over WS
          sendData(buffer);
        }
      };

      await shopScraper({
        searchParams: payload,
        progressUpdate,
        returnFile,
        cancelToken: cancelToken,
      });

      if (!cancelToken.isCancelled()) {
        sendData("✅ Search complete.");
      }
    } catch (err) {
      console.error("❌ Scraper error:", err);
      if (!cancelToken.isCancelled()) {
        sendData(`❌ Error: ${err.message || "Unknown error"}`);
      }
    } finally {
      ws.close();
    }
  });

  ws.on("close", () => {
    cancelToken.cancel();
    console.log("🔴 WebSocket closed");
  });
}
