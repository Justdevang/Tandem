import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import tableRoutes from './routes/tables.js';
import inventoryRoutes from './routes/inventory.js';
import billRoutes from './routes/bills.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import kitchenRoutes from './routes/kitchen.js';
import { initKitchenLoadService } from './services/kitchenLoad.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Express setup ──────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── HTTP + Socket.IO ───────────────────────────────────────────────
const server = http.createServer(app);
export const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});

initKitchenLoadService(io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ── Health check ───────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'Tandem Backend API',
    status: 'online',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/kitchen', kitchenRoutes);

// ── Start ──────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Tandem backend running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

start();

export { app };
