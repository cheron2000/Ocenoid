import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";

let server: ChildProcess;
let port: number;

function connectAndWaitForWelcome(): Promise<{ socket: WebSocket, welcome: { id: string; tickRate: number } }> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.once("error", reject);
    socket.on("message", (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "welcome") {
        resolve({ socket, welcome: message });
      }
    });
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
      console.log("CHILD STDOUT:", chunk.toString());
      if (chunk.toString().includes("Ocenoid server listening")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout?.on("data", onData);
    server.stderr?.on("data", (chunk) => console.log("CHILD STDERR:", chunk.toString()));
    server.once("error", reject);
    server.once("exit", (code) => {
      console.log("CHILD EXITED WITH CODE", code);
      if (code !== null && code !== 0) reject(new Error(`server exited with ${code}`));
    });
  });
});

after(async () => {
  server.kill();
  await once(server, "exit").catch(() => undefined);
});

test("enforces four-player room limit and allows replacement after disconnect", async () => {
  const connections = await Promise.all([connectAndWaitForWelcome(), connectAndWaitForWelcome(), connectAndWaitForWelcome(), connectAndWaitForWelcome()]);
  const sockets = connections.map(c => c.socket);
  const welcomes = connections.map(c => c.welcome);

  assert.equal(new Set(welcomes.map((welcome) => welcome.id)).size, 4);
  assert.ok(welcomes.every((welcome) => welcome.tickRate === 20));

  const fifth = new WebSocket(`ws://127.0.0.1:${port}`);
  const closePromise = once(fifth, "close");
  const [code, reason] = await closePromise as [number, Buffer];
  assert.equal(code, 1008);
  assert.match(reason.toString(), /4 players maximum/i);

  const remaining = sockets[0];
  const snapshotAfterLeave = waitForSnapshotSize(remaining, 3);
  sockets[3].close();
  await snapshotAfterLeave;

  const replacement = await connectAndWaitForWelcome();
  assert.ok(replacement.welcome.id);

  replacement.socket.close();
  sockets.slice(0, 3).forEach((socket) => socket.close());
});
