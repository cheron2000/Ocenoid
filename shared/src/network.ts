export type PlayerState = {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Display name shown above the character */
  name: string;
};

export type ClientInput = {
  forward: number;
  right: number;
  yaw: number;
  sequence: number;
};

export type ServerMessage =
  | { type: "welcome"; id: string; tickRate: number; spawnIndex: number; name: string }
  | { type: "snapshot"; serverTick: number; players: PlayerState[] };

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "input"; input: ClientInput };
