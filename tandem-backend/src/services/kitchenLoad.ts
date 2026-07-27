import { Order } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { Server as SocketIOServer } from 'socket.io';

export type KitchenLoadLevel = 'Low' | 'Medium' | 'High';

export interface KitchenLoadState {
  loadScore: number;
  loadLevel: KitchenLoadLevel;
  activeTicketCount: number;
  isManualBusy: boolean;
  prepThresholdMinutes: number;
}

let ioInstance: SocketIOServer | null = null;
let isManualBusy = false;
let demoSpikeActive = false;

export function initKitchenLoadService(io: SocketIOServer) {
  ioInstance = io;
}

export async function setManualBusyOverride(busy: boolean): Promise<KitchenLoadState> {
  isManualBusy = busy;
  return await computeKitchenLoad();
}

export async function setDemoSpike(active: boolean): Promise<KitchenLoadState> {
  demoSpikeActive = active;
  return await computeKitchenLoad();
}

export async function computeKitchenLoad(): Promise<KitchenLoadState> {
  // Query active tickets in 'new' and 'firing' states ONLY
  // Served, ready, and billed orders have finished prep and must NOT count towards kitchen load
  const activeOrders = await Order.find({ status: { $in: ['new', 'firing'] } });
  const activeTicketCount = activeOrders.length;

  if (demoSpikeActive) {
    const state: KitchenLoadState = {
      loadScore: 85,
      loadLevel: 'High',
      activeTicketCount: Math.max(activeTicketCount, 8),
      isManualBusy: true,
      prepThresholdMinutes: 12,
    };
    if (ioInstance) ioInstance.emit('kitchen:load-updated', state);
    return state;
  }

  if (isManualBusy) {
    const state: KitchenLoadState = {
      loadScore: 90,
      loadLevel: 'High',
      activeTicketCount,
      isManualBusy: true,
      prepThresholdMinutes: 12,
    };
    if (ioInstance) ioInstance.emit('kitchen:load-updated', state);
    return state;
  }

  if (activeTicketCount === 0) {
    const state: KitchenLoadState = {
      loadScore: 0,
      loadLevel: 'Low',
      activeTicketCount: 0,
      isManualBusy: false,
      prepThresholdMinutes: 12,
    };
    if (ioInstance) ioInstance.emit('kitchen:load-updated', state);
    return state;
  }

  // Fetch all menu items for prep time lookup
  const menuItems = await MenuItem.find();
  const prepMap = new Map(menuItems.map((m) => [m._id.toString(), m.avgPrepMinutes || 10]));

  let totalPrepMinutes = 0;
  for (const order of activeOrders) {
    for (const item of order.items || []) {
      const itemPrep = prepMap.get(item.menuItemId?.toString()) || 10;
      totalPrepMinutes += itemPrep * (item.qty || 1);
    }
  }

  // Baseline load normalization: 0 to 100 scale
  const loadScore = Math.min(100, Math.round((totalPrepMinutes / 60) * 100));

  let loadLevel: KitchenLoadLevel = 'Low';
  if (loadScore >= 60 || totalPrepMinutes >= 45 || activeTicketCount >= 4) {
    loadLevel = 'High';
  } else if (loadScore >= 30 || totalPrepMinutes >= 20 || activeTicketCount >= 2) {
    loadLevel = 'Medium';
  }

  const state: KitchenLoadState = {
    loadScore,
    loadLevel,
    activeTicketCount,
    isManualBusy: false,
    prepThresholdMinutes: 12,
  };

  if (ioInstance) {
    ioInstance.emit('kitchen:load-updated', state);
  }

  return state;
}

export async function recalculateKitchenLoad(): Promise<KitchenLoadState> {
  return await computeKitchenLoad();
}
