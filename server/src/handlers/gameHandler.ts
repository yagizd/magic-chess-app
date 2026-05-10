import type { Server, Socket } from 'socket.io';
import {
  getRoomBySocket,
  getColorInRoom,
  updateGameState,
  resetRoomForRematch,
  cleanupEmptyRoom,
} from '../rooms.js';
import { saveMatchResult } from '../db/supabase.js';
import { getValidMoves, applyMove } from '../../../shared/rules.js';
import type { Color, Move } from '../../../shared/types.js';
import { getRoom, getAllRooms } from '../rooms.js';

export function startTimeoutChecker(io: Server) {
  setInterval(() => {
    const now = Date.now();
    for (const room of getAllRooms()) {
      if (!room.timeControl) continue;
      if (room.gameState.isCheckmate || room.gameState.isStalemate || room.gameState.isTimeout) continue;
      if (room.lastMoveTimestamp === 0) continue; // game hasn't started yet

      const elapsed = now - room.lastMoveTimestamp;
      const activeColor = room.gameState.currentTurn;
      
      let timeout = false;
      if (activeColor === 'white' && room.whiteTimeMs - elapsed <= 0) {
        room.whiteTimeMs = 0;
        timeout = true;
      } else if (activeColor === 'black' && room.blackTimeMs - elapsed <= 0) {
        room.blackTimeMs = 0;
        timeout = true;
      }

      if (timeout) {
        room.gameState.isTimeout = true;
        room.gameState.winner = activeColor === 'white' ? 'black' : 'white';
        room.lastMoveTimestamp = now;

        updateGameState(room.id, room.gameState);
        io.to(room.id).emit('game:time_sync', {
          whiteTimeMs: room.whiteTimeMs,
          blackTimeMs: room.blackTimeMs,
          lastMoveTimestamp: room.lastMoveTimestamp,
        });
        io.to(room.id).emit('game:state', room.gameState);
        saveMatchResult(room, room.gameState.winner);
      }
    }
  }, 1000);
}

export function registerGameHandler(io: Server, socket: Socket): void {
  socket.on('game:move', (move: Move) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;

    const color = getColorInRoom(room, socket.id);
    if (!color) return;
    if (room.gameState.currentTurn !== color) return;
    if (room.gameState.isCheckmate || room.gameState.isStalemate) return;

    // Server-side validation — shared rule engine
    const legal = getValidMoves(
      room.gameState.board,
      move.from.row,
      move.from.col,
      room.gameState.enPassantTarget,
    );
    const isLegal = legal.some(
      (m) =>
        m.to.row === move.to.row &&
        m.to.col === move.to.col &&
        (move.promotion ? m.promotion === move.promotion : !m.promotion),
    );
    if (!isLegal) {
      console.warn(`[game] illegal move from ${socket.id}`);
      return;
    }

    // Time calculations
    if (room.timeControl) {
      const now = Date.now();
      const elapsed = now - room.lastMoveTimestamp;
      if (color === 'white') {
        room.whiteTimeMs -= elapsed;
        if (room.whiteTimeMs <= 0) return; // Time out should be handled by interval, but prevent move if already out
        room.whiteTimeMs += room.timeControl.increment * 1000;
      } else {
        room.blackTimeMs -= elapsed;
        if (room.blackTimeMs <= 0) return;
        room.blackTimeMs += room.timeControl.increment * 1000;
      }
      room.lastMoveTimestamp = now;
    }

    const newState = applyMove(room.gameState, move);
    updateGameState(room.id, newState);
    io.to(room.id).emit('game:state', newState);
    if (room.timeControl) {
      io.to(room.id).emit('game:time_sync', {
        whiteTimeMs: room.whiteTimeMs,
        blackTimeMs: room.blackTimeMs,
        lastMoveTimestamp: room.lastMoveTimestamp,
      });
    }

    if (newState.isCheckmate || newState.isStalemate) {
      saveMatchResult(room, newState.winner);
    }
  });

  socket.on('game:resign', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const color = getColorInRoom(room, socket.id);
    if (!color) return;

    const winner: Color = color === 'white' ? 'black' : 'white';
    const newState = {
      ...room.gameState,
      isCheckmate: true,
      winner,
    };
    updateGameState(room.id, newState);
    io.to(room.id).emit('game:state', newState);
    io.to(room.id).emit('game:resigned', { color });

    saveMatchResult(room, winner);
  });

  socket.on('game:rematch_request', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;

    room.rematchRequests.add(socket.id);

    if (room.rematchRequests.size === 2) {
      const resetRoom = resetRoomForRematch(room.id);
      if (resetRoom) {
        // Send accepted event to both with their new colors
        if (resetRoom.white) {
          io.to(resetRoom.white).emit('game:rematch_accepted', { color: 'white' });
        }
        if (resetRoom.black) {
          io.to(resetRoom.black).emit('game:rematch_accepted', { color: 'black' });
        }
        io.to(room.id).emit('game:state', resetRoom.gameState);
        io.to(room.id).emit('game:time_sync', {
          whiteTimeMs: resetRoom.whiteTimeMs,
          blackTimeMs: resetRoom.blackTimeMs,
          lastMoveTimestamp: resetRoom.lastMoveTimestamp,
        });
      }
    } else {
      // Notify the other player
      socket.to(room.id).emit('game:rematch_requested');
    }
  });
}
