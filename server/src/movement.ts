import type { PlayerState, ClientInput } from "@ocenoid/shared/network.js";

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function applyInput(player: PlayerState, input: ClientInput, dt: number, speed: number): PlayerState {
  const forward = finite(input.forward, 0);
  const right = finite(input.right, 0);
  const length = Math.hypot(forward, right);
  const scale = length > 1 ? 1 / length : 1;
  const yaw = finite(input.yaw, player.yaw);

  // Convert camera-relative input into world-space movement.
  // Camera at yaw=0 sits at +Z looking toward -Z, so forward = -Z and right = +X.
  const localForward = forward * scale;
  const localRight = right * scale;
  const worldX = localRight * Math.cos(yaw) - localForward * Math.sin(yaw);
  const worldZ = -localForward * Math.cos(yaw) - localRight * Math.sin(yaw);

  // Only update the player's facing yaw when actually moving.
  const moving = Math.abs(forward) > 0.001 || Math.abs(right) > 0.001;
  const facingYaw = moving ? Math.atan2(worldX, -worldZ) : player.yaw;

  return {
    ...player,
    x: player.x + worldX * speed * dt,
    z: player.z + worldZ * speed * dt,
    yaw: facingYaw,
  };
}
