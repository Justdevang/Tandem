import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 15,
      randomizationFactor: 0.5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });
  }

  return socket;
}

export default getSocket;
