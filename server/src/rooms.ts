import { createInitialGameState } from '../../shared/rules.js';
import type { GameState, Color, TimeControl } from '../../shared/types.js';

export interface Room {
  id: string;
  white: string | null;
  black: string | null;
  gameState: GameState;
  createdAt: Date;
  rematchRequests: Set<string>;
  timeControl: TimeControl | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
}

const rooms = new Map<string, Room>();

function genId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom(socketId: string, timeControl: TimeControl | null): Room {
  let id = genId();
  while (rooms.has(id)) id = genId();

  const timeMs = timeControl ? timeControl.minutes * 60 * 1000 : 0;

  const room: Room = {
    id,
    white: socketId,
    black: null,
    gameState: createInitialGameState(),
    createdAt: new Date(),
    rematchRequests: new Set(),
    timeControl,
    whiteTimeMs: timeMs,
    blackTimeMs: timeMs,
    lastMoveTimestamp: 0,
  };
  rooms.set(id, room);
  return room;
}

export function joinRoom(roomId: string, socketId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room || room.black !== null) return null;
  if (room.white === socketId) return null; // same socket can't play both sides
  room.black = socketId;
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

export function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.white === socketId || room.black === socketId) return room;
  }
  return undefined;
}

export function getColorInRoom(room: Room, socketId: string): Color | null {
  if (room.white === socketId) return 'white';
  if (room.black === socketId) return 'black';
  return null;
}

export function updateGameState(roomId: string, state: GameState): void {
  const room = rooms.get(roomId);
  if (room) room.gameState = state;
}

export function removePlayer(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.white === socketId) { room.white = null; return room; }
    if (room.black === socketId) { room.black = null; return room; }
  }
  return undefined;
}

export function cleanupEmptyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room && room.white === null && room.black === null) {
    rooms.delete(roomId);
  }
}

export function resetRoomForRematch(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  // Swap colors
  const temp = room.white;
  room.white = room.black;
  room.black = temp;

  room.gameState = createInitialGameState();
  room.rematchRequests.clear();

  const timeMs = room.timeControl ? room.timeControl.minutes * 60 * 1000 : 0;
  room.whiteTimeMs = timeMs;
  room.blackTimeMs = timeMs;
  room.lastMoveTimestamp = 0; // Starts again when opponent joins or rather, immediately since they are both in the room!
  // Actually, since it's a rematch, both players are here. So start time immediately.
  room.lastMoveTimestamp = Date.now();

  return room;
}
