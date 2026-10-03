import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientInput, ClientMessage, PlayerState, ServerMessage } from "@ocenoid/shared/network.js";
import { PhysicsSimulation } from "./physics.js";

const port = Number(process.env.PORT ?? 8787);
const maxPlayers = 4;
const tickRate = 20;
const tickMs = 1000 / tickRate;
const moveSpeed = 4;
const physics = await PhysicsSimulation.create();
const wss = new WebSocketServer({ host: "0.0.0.0", port });
const players = new Map<string, PlayerState>();
const inputs = new Map<string, ClientInput>();
let serverTick = 0;

/**
 * Deck spawn positions derived from the GLB (PlayerSpawn_1–4 node world coords).
 * Y is set to deck surface height (≈1.2) so characters land on the deck.
 * X/Z come from the GLB spawn nodes; the boat sits at world origin.
 */
const SPAWN_POSITIONS: Array<{ x: number; y: number; z: number }> = [
  { x: -1.7, y: 1.2, z: -1.12 },
  { x: -0.6, y: 1.2, z: -1.12 },
  { x:  0.6, y: 1.2, z: -1.12 },
  { x:  1.7, y: 1.2, z: -1.12 },
];

/** Names matching the four OcenoidCharacter appearance presets (slot order). */
const SLOT_NAMES = ["Coral", "Kelp", "Abyss", "Frost"];

/** Tracks which spawn slots are currently occupied (index 0–3). */
const occupiedSlots = new Set<number>();

function getNextFreeSlot(): number {
  for (let i = 0; i < maxPlayers; i++) {
    if (!occupiedSlots.has(i)) return i;
  }
  return 0; // should never happen — connection is refused before we get here
}

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
  const spawnIndex = getNextFreeSlot();
  occupiedSlots.add(spawnIndex);

  const spawn = SPAWN_POSITIONS[spawnIndex];
  const name  = SLOT_NAMES[spawnIndex];

  const player = { id, x: spawn.x, y: spawn.y, z: spawn.z, yaw: 0, name };
  players.set(id, player);
  physics.addPlayer(player);
  inputs.set(id, { forward: 0, right: 0, yaw: 0, sequence: 0 });

  socket.send(JSON.stringify({ type: "welcome", id, tickRate, spawnIndex, name } satisfies ServerMessage));
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
      right:   Math.max(-1, Math.min(1, input.right)),
      yaw:     input.yaw,
      sequence: Number.isFinite(input.sequence) ? input.sequence : 0,
    });
  });

  socket.on("close", () => {
    players.delete(id);
    inputs.delete(id);
    physics.removePlayer(id);
    occupiedSlots.delete(spawnIndex);
    broadcast({ type: "snapshot", serverTick, players: [...players.values()] });
  });

  socket.on("error", (error) => console.error(`WebSocket error for ${id}:`, error.message));
});

setInterval(() => {
  serverTick += 1;
  const dt = tickMs / 1000;
  const updated = physics.step([...players.values()], inputs, moveSpeed, dt);
  for (const player of updated) players.set(player.id, player);
  broadcast({ type: "snapshot", serverTick, players: [...players.values()] });
}, tickMs);

wss.on("error", (error) => console.error("WebSocket server error:", error));
wss.on("listening", () => console.log(`Ocenoid server listening on 0.0.0.0:${port} (max ${maxPlayers}, ${tickRate}Hz)`));
