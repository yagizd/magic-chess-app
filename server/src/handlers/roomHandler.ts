import type { Server, Socket } from 'socket.io';
import {
  createRoom,
  joinRoom,
  removePlayer,
  cleanupEmptyRoom,
} from '../rooms.js';

import type { TimeControl } from '../../../shared/types.js';

export function registerRoomHandler(io: Server, socket: Socket): void {
  socket.on('room:create', ({ timeControl }: { timeControl: TimeControl | null } = { timeControl: null }) => {
    // Socket can only be in one room at a time
    const room = createRoom(socket.id, timeControl);
    socket.join(room.id);
    socket.emit('room:joined', { roomId: room.id, color: 'white', timeControl: room.timeControl });
    console.log(`[room] created ${room.id} by ${socket.id} with TC:`, timeControl?.label || 'none');
  });

  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    const id = String(roomId).toUpperCase().trim();
    const room = joinRoom(id, socket.id);
    if (!room) {
      socket.emit('room:error', 'Oda bulunamadı veya dolu.');
      return;
    }
    socket.join(room.id);
    socket.emit('room:joined', { roomId: room.id, color: 'black', timeControl: room.timeControl });
    
    // Both joined, start timer
    room.lastMoveTimestamp = Date.now();

    socket.to(room.id).emit('opponent:joined');
    io.to(room.id).emit('game:state', room.gameState);
    io.to(room.id).emit('game:time_sync', {
      whiteTimeMs: room.whiteTimeMs,
      blackTimeMs: room.blackTimeMs,
      lastMoveTimestamp: room.lastMoveTimestamp,
    });
    console.log(`[room] ${socket.id} joined ${room.id} as black`);
  });

  socket.on('disconnect', () => {
    const room = removePlayer(socket.id);
    if (room) {
      socket.to(room.id).emit('opponent:left');
      cleanupEmptyRoom(room.id);
      console.log(`[room] ${socket.id} left ${room.id}`);
    }
  });
}
