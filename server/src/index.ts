import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, PlayerState, ServerMessage } from "@ocenoid/shared/network.js";

const port = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ host: "0.0.0.0", port });
const players = new Map<string, PlayerState>();

function broadcast(message: ServerMessage) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

wss.on("connection", (socket) => {
  const id = randomUUID();
  const player: PlayerState = { id, x: 0, y: 1.5, z: 0, yaw: 0 };
  players.set(id, player);

  socket.send(JSON.stringify({ type: "welcome", id }));
  broadcast({ type: "snapshot", players: [...players.values()] });

  socket.on("message", (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    if (message.type !== "move" || message.state.id !== id) return;
    players.set(id, { ...player, ...message.state, id });
    broadcast({ type: "snapshot", players: [...players.values()] });
  });

  socket.on("close", () => {
    players.delete(id);
    broadcast({ type: "snapshot", players: [...players.values()] });
  });
});

console.log(`Ocenoid server listening on 0.0.0.0:${port}`);
