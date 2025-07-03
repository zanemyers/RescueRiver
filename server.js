import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import http from "http";
import { WebSocketServer } from "ws";

// Route files
import routes from "./routes/routes.js";
import { errorHandler } from "./routes/error.js";
import socketHandler from "./routes/socketHandler.js";

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server (required for WebSockets)
const server = http.createServer(app);

// WebSocket server attached to the same HTTP server
const wss = new WebSocketServer({ server });
wss.on("connection", socketHandler); // 👈 delegate to your modular handler

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/base");

// Static
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap")));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", routes);
app.use(errorHandler);

// Start both HTTP and WebSocket on the same port
server.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});
