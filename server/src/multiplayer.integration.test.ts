import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";

let server: ChildProcess;
let port: number;

function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function waitForWelcome(socket: WebSocket): Promise<{ id: string; tickRate: number }> {
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "welcome") {
        socket.off("error", onError);
        resolve(message);
      }
    };
    const onError = (error: Error) => {
      socket.off("message", onMessage);
      reject(error);
    };
    socket.on("message", onMessage);
    socket.once("error", onError);
  });
}

function waitForSnapshotSize(socket: WebSocket, size: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "snapshot" && message.players.length === size) {
        socket.off("error", onError);
        resolve();
      }
    };
    const onError = (error: Error) => {
      socket.off("message", onMessage);
      reject(error);
    };
    socket.on("message", onMessage);
    socket.once("error", onError);
  });
}

before(async () => {
  port = 18000 + Math.floor(Math.random() * 1000);
  server = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server startup timed out")), 5000);
    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes("Ocenoid server listening")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout?.on("data", onData);
    server.once("error", reject);
    server.once("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`server exited with ${code}`));
    });
  });
});

after(async () => {
  server.kill();
  await once(server, "exit").catch(() => undefined);
});

test("enforces four-player room limit and allows replacement after disconnect", async () => {
  const sockets = await Promise.all([connect(), connect(), connect(), connect()]);
  const welcomes = await Promise.all(sockets.map(waitForWelcome));

  assert.equal(new Set(welcomes.map((welcome) => welcome.id)).size, 4);
  assert.ok(welcomes.every((welcome) => welcome.tickRate === 20));

  const fifth = await connect();
  const closePromise = once(fifth, "close");
  const [code, reason] = await closePromise as [number, Buffer];
  assert.equal(code, 1008);
  assert.match(reason.toString(), /4 players maximum/i);

  const remaining = sockets[0];
  const snapshotAfterLeave = waitForSnapshotSize(remaining, 3);
  sockets[3].close();
  await snapshotAfterLeave;

  const replacement = await connect();
  const replacementWelcome = await waitForWelcome(replacement);
  assert.ok(replacementWelcome.id);

  replacement.close();
  sockets.slice(0, 3).forEach((socket) => socket.close());
});
