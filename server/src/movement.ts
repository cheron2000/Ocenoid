import type { PlayerState, ClientInput } from "@ocenoid/shared/network.js";

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function applyInput(player: PlayerState, input: ClientInput, dt: number, speed: number): PlayerState {
  const forward = finite(input.forward, 0);
  const right = finite(input.right, 0);
  const length = Math.hypot(forward, right);
  const scale = length > 1 ? 1 / length : 1;

  return {
    ...player,
    x: player.x + right * scale * speed * dt,
    z: player.z - forward * scale * speed * dt,
    yaw: finite(input.yaw, player.yaw),
  };
}
