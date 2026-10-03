import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, PlayerState, ServerMessage } from "@ocenoid/shared/network.js";

const port = Number(process.env.PORT ?? 8787);
const maxPlayers = 4;
const tickRate = 20;
const tickMs = 1000 / tickRate;
const moveSpeed = 4;
const wss = new WebSocketServer({ host: "0.0.0.0", port });
const players = new Map<string, PlayerState>();
const inputs = new Map<string, { forward: number; right: number; yaw: number }>();
let serverTick = 0;

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
  players.set(id, { id, x: 0, y: 1.5, z: 0, yaw: 0 });
  inputs.set(id, { forward: 0, right: 0, yaw: 0 });

  socket.send(JSON.stringify({ type: "welcome", id, tickRate }));
  broadcast({ type: "snapshot", serverTick, players: [...players.values()] });

  socket.on("message", (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    if (message.type !== "input") return;
    const input = message.input;
    if (!Number.isFinite(input.forward) || !Number.isFinite(input.right) || !Number.isFinite(input.yaw)) return;
    inputs.set(id, {
      forward: Math.max(-1, Math.min(1, input.forward)),
      right: Math.max(-1, Math.min(1, input.right)),
      yaw: input.yaw,
    });
  });

  socket.on("close", () => {
    players.delete(id);
    inputs.delete(id);
    broadcast({ type: "snapshot", serverTick, players: [...players.values()] });
  });

  socket.on("error", (error) => console.error(`WebSocket error for ${id}:`, error.message));
});

setInterval(() => {
  serverTick += 1;
  const dt = tickMs / 1000;
  for (const [id, player] of players) {
    const input = inputs.get(id);
    if (!input) continue;
    const length = Math.hypot(input.forward, input.right);
    const scale = length > 1 ? 1 / length : 1;
    player.x += input.right * scale * moveSpeed * dt;
    player.z -= input.forward * scale * moveSpeed * dt;
    player.yaw = input.yaw;
  }
  broadcast({ type: "snapshot", serverTick, players: [...players.values()] });
}, tickMs);

wss.on("error", (error) => console.error("WebSocket server error:", error));
console.log(`Ocenoid server listening on 0.0.0.0:${port} (max ${maxPlayers}, ${tickRate}Hz)`);
