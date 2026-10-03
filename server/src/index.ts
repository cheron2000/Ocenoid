import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, PlayerState, ServerMessage } from "@ocenoid/shared/network.js";

const port = Number(process.env.PORT ?? 8787);
const maxPlayers = 4;
const wss = new WebSocketServer({ host: "0.0.0.0", port });
const players = new Map<string, PlayerState>();

function broadcast(message: ServerMessage) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

wss.on("connection", (socket) => {
  if (players.size >= maxPlayers) {
    socket.close(1008, "Ocenoid room is full (4 players maximum).");
    return;
  }

  const id = randomUUID();
  const player: PlayerState = { id, x: 0, y: 1.5, z: 0, yaw: 0 };
  players.set(id, player);
  console.log(`Player connected: ${id} (${players.size}/${maxPlayers})`);

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
    console.log(`Player disconnected: ${id} (${players.size}/${maxPlayers})`);
    broadcast({ type: "snapshot", players: [...players.values()] });
  });

  socket.on("error", (error) => {
    console.error(`WebSocket error for ${id}:`, error.message);
  });
});

wss.on("error", (error) => console.error("WebSocket server error:", error));
console.log(`Ocenoid server listening on 0.0.0.0:${port} (max ${maxPlayers} players)`);
