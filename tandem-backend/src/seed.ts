import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { MenuItem } from './models/MenuItem.js';
import { Table } from './models/Table.js';

// ── Menu items from mock.ts with avgPrepMinutes per category ─────────
const menuItems = [
  { name: 'Paneer Tikka Masala', description: 'Charred cottage cheese, tomato-cashew gravy, kasuri methi', price: 320, category: 'Mains', stockQty: 2, reorderThreshold: 5, avgPrepMinutes: 15 },
  { name: 'Butter Chicken', description: 'Tandoor-roasted chicken, tomato butter sauce', price: 380, category: 'Mains', stockQty: 14, reorderThreshold: 6, avgPrepMinutes: 15 },
  { name: 'Dal Tadka', description: 'Yellow lentils, cumin-garlic tempering, fresh coriander', price: 220, category: 'Mains', stockQty: 0, reorderThreshold: 5, avgPrepMinutes: 12 },
  { name: 'Malabar Fish Curry', description: 'Kingfish, coconut, kokum, curry leaf', price: 420, category: 'Mains', stockQty: 9, reorderThreshold: 4, avgPrepMinutes: 18 },
  { name: 'Tandoori Roti', description: 'Whole wheat, charcoal tandoor', price: 45, category: 'Breads', stockQty: 40, reorderThreshold: 15, avgPrepMinutes: 5 },
  { name: 'Garlic Naan', description: 'Maida, roasted garlic, coriander butter', price: 65, category: 'Breads', stockQty: 3, reorderThreshold: 10, avgPrepMinutes: 6 },
  { name: 'Hara Bhara Kebab', description: 'Spinach, green peas, potato, mint chutney', price: 240, category: 'Starters', stockQty: 11, reorderThreshold: 5, avgPrepMinutes: 10 },
  { name: 'Amritsari Fish Fry', description: 'Basa, carom seed batter, ajwain', price: 310, category: 'Starters', stockQty: 6, reorderThreshold: 4, avgPrepMinutes: 12 },
  { name: 'Gulab Jamun', description: 'Khoya dumplings, cardamom syrup, rabri', price: 140, category: 'Desserts', stockQty: 18, reorderThreshold: 8, avgPrepMinutes: 5 },
  { name: 'Masala Chai', description: 'Assam CTC, ginger, clove, star anise', price: 60, category: 'Beverages', stockQty: 50, reorderThreshold: 20, avgPrepMinutes: 3 },
];

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
