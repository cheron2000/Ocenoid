export type PlayerState = {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

export type ClientInput = {
  forward: number;
  right: number;
  yaw: number;
  sequence: number;
};

export type ServerMessage =
  | { type: "welcome"; id: string; tickRate: number }
  | { type: "snapshot"; serverTick: number; players: PlayerState[] };

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "input"; input: ClientInput };
