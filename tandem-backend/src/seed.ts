import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { MenuItem } from './models/MenuItem.js';
import { Table } from './models/Table.js';

import { catalogMenuItems } from './data/catalog.js';

const menuItems = catalogMenuItems;

// ── Tables ─────────────────────────────────────────────────────────
const tables = [
  { number: 1, capacity: 2, status: 'free' as const },
  { number: 2, capacity: 4, status: 'free' as const },
  { number: 3, capacity: 4, status: 'free' as const },
  { number: 4, capacity: 6, status: 'free' as const },
  { number: 5, capacity: 2, status: 'free' as const },
  { number: 6, capacity: 4, status: 'free' as const },
  { number: 7, capacity: 4, status: 'free' as const },
  { number: 8, capacity: 8, status: 'free' as const },
  { number: 9, capacity: 6, status: 'free' as const },
  { number: 10, capacity: 2, status: 'free' as const },
  { number: 11, capacity: 4, status: 'free' as const },
  { number: 12, capacity: 2, status: 'free' as const },
];

async function seed() {
  await connectDB();

  // Clear existing data
  await MenuItem.deleteMany({});
  await Table.deleteMany({});
  console.log('🗑️  Cleared existing menu items and tables');

  // Insert menu items
  const insertedItems = await MenuItem.insertMany(menuItems);
  console.log(`🍽️  Seeded ${insertedItems.length} menu items`);

  // Insert tables
  const insertedTables = await Table.insertMany(tables);
  console.log(`🪑 Seeded ${insertedTables.length} tables`);

  // Print menu items with their MongoDB IDs for reference
  console.log('\n── Menu Item IDs ──');
  for (const item of insertedItems) {
    console.log(`  ${item.name}: ${item._id} (prep: ${item.avgPrepMinutes}m, stock: ${item.stockQty})`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Seed complete, disconnected.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
