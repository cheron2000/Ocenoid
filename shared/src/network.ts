export type PlayerState = {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

export type ServerMessage =
  | { type: "welcome"; id: string }
  | { type: "snapshot"; players: PlayerState[] };

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "move"; state: PlayerState };
