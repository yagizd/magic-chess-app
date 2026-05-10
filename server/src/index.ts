import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { registerRoomHandler } from './handlers/roomHandler.js';
import { registerGameHandler, startTimeoutChecker } from './handlers/gameHandler.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

startTimeoutChecker(io);

io.on('connection', (socket) => {
  console.log(`[socket] connect    ${socket.id}`);
  registerRoomHandler(io, socket);
  registerGameHandler(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Magic Chess server → http://localhost:${PORT}`);
});
