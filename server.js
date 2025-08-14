import "dotenv/config"; // Load environment variables from .env
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import http from "http";
import { WebSocketServer } from "ws";

// Route and WebSocket handlers
import routes from "./routes/index.js";
import { errorHandler } from "./routes/error.js";
import { reportSocket, shopSocket } from "./sockets/index.js";

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server manually to attach WebSocket server to same port
const server = http.createServer(app);

// WebSocket server setup (not attached to Express directly)
const wss = new WebSocketServer({ noServer: true });

// Upgrade HTTP connection to WebSocket when requested
server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

// Handle WebSocket connections
wss.on("connection", (ws, req) => {
  const { url } = req;

  if (url === "/ws/shop") {
    // Connect to shop scraper WebSocket
    shopSocket(ws, req);
  } else if (url === "/ws/report") {
    // Connect to report scraper WebSocket
    reportSocket(ws, req);
  } else {
    // Unknown WebSocket route, close connection
    ws.close();
  }
});

// Resolve __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up view engine with layouts
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/base");

// Serve static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap")));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Attach application routes
app.use("/", routes);

// Generic error handler (must be last middleware)
app.use(errorHandler);

// Start HTTP server (WebSocket is attached to the same server)
server.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});
