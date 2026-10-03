import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ host: "0.0.0.0", port });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "welcome", message: "Connected to Ocenoid LAN server." }));
});

console.log(`Ocenoid server listening on 0.0.0.0:${port}`);
