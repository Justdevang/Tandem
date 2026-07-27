import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { MenuItem } from './models/MenuItem.js';
import { Table } from './models/Table.js';

// ── Full Menu Catalog requested by user ────────────────────────────
const menuItems = [
  // Starters
  { name: 'Samosa (2 pcs)', description: 'Crispy golden fried pastry stuffed with spiced potatoes & green peas', price: 60, category: 'Starters', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 8 },
  { name: 'Paneer Tikka', description: 'Charred cottage cheese cubes marinated in spiced yogurt & mint', price: 220, category: 'Starters', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 12 },
  { name: 'Chicken 65', description: 'Deep-fried chicken morsels tossed in red chili, curry leaves & lemon', price: 240, category: 'Starters', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 12 },
  { name: 'Aloo Tikki (2 pcs)', description: 'Pan-fried spiced potato croquettes served with mint & tamarind chutney', price: 80, category: 'Starters', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 8 },
  { name: 'Onion Bhaji / Pakora', description: 'Crispy onion fritters seasoned with carom seeds & coriander', price: 120, category: 'Starters', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 8 },
  { name: 'Seekh Kebab', description: 'Charcoal-grilled minced mutton kebabs infused with aromatic herbs', price: 260, category: 'Starters', stockQty: 18, reorderThreshold: 5, avgPrepMinutes: 15 },
  { name: 'Chicken Tikka', description: 'Tandoor roasted boneless chicken marinated in degi mirch & yogurt', price: 280, category: 'Starters', stockQty: 22, reorderThreshold: 5, avgPrepMinutes: 14 },
  { name: 'Hara Bhara Kebab', description: 'Spinach, green pea & cottage cheese patties served with mint dip', price: 180, category: 'Starters', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 10 },

  // Soups
  { name: 'Tomato Shorba', description: 'Flavorful Indian style tomato soup tempered with cumin & coriander stem', price: 110, category: 'Soups', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 7 },
  { name: 'Sweet Corn Soup', description: 'Comforting creamy soup packed with sweet corn kernels & garden veg', price: 120, category: 'Soups', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 7 },
  { name: 'Mulligatawny Soup', description: 'Traditional spiced lentil soup delicately flavored with coconut & curry powder', price: 130, category: 'Soups', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 8 },

  // Mains (Vegetarian & Non-Vegetarian)
  { name: 'Paneer Butter Masala', description: 'Rich cottage cheese in velvet smooth cashew & tomato gravy', price: 260, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 14 },
  { name: 'Dal Makhani', description: 'Overnight slow-cooked black lentils finished with cream & white butter', price: 220, category: 'Mains', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 12 },
  { name: 'Chana Masala', description: 'North Indian chickpeas simmered in spicy onion-tomato masala', price: 190, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 12 },
  { name: 'Palak Paneer', description: 'Fresh cottage cheese cubes simmered in creamy spinach puree', price: 240, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 12 },
  { name: 'Malai Kofta', description: 'Melt-in-mouth cottage cheese dumplings in rich saffron gravy', price: 250, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 15 },
  { name: 'Baingan Bharta', description: 'Smoky fire-roasted eggplant mashed with garlic, green chilies & tomatoes', price: 200, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 12 },
  { name: 'Mixed Vegetable Curry', description: 'Assorted seasonal vegetables tossed in aromatic homestyle gravy', price: 190, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 12 },
  { name: 'Kadai Paneer', description: 'Cottage cheese & crunchy bell peppers cooked in freshly ground kadai spices', price: 250, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 14 },
  { name: 'Aloo Gobi', description: 'Dry roasted potato & cauliflower florets with cumin, ginger & turmeric', price: 180, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 10 },
  { name: 'Butter Chicken', description: 'Tandoor roasted chicken in smooth butter & tomato reduction sauce', price: 320, category: 'Mains', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 15 },
  { name: 'Chicken Curry', description: 'Classic rustic Indian chicken curry cooked with ground spices', price: 280, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 14 },
  { name: 'Mutton Rogan Josh', description: 'Tender Kashmiri lamb braised in aromatic red chili & fennel gravy', price: 380, category: 'Mains', stockQty: 18, reorderThreshold: 4, avgPrepMinutes: 18 },
  { name: 'Fish Curry', description: 'Coastal style fish fillets cooked in coconut milk, kokum & mustard seeds', price: 340, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 15 },
  { name: 'Chicken Chettinad', description: 'Fiery South Indian chicken curry made with fresh roasted spices & coconut', price: 300, category: 'Mains', stockQty: 22, reorderThreshold: 5, avgPrepMinutes: 15 },
  { name: 'Egg Curry', description: 'Hard-boiled eggs simmered in thick onion-tomato gravy with curry leaves', price: 180, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 10 },
  { name: 'Prawn Masala', description: 'Fresh succulent prawns tossed in tangy spicy onion tomato gravy', price: 360, category: 'Mains', stockQty: 16, reorderThreshold: 4, avgPrepMinutes: 15 },
  { name: 'Chicken Korma', description: 'Mild chicken curry cooked in almond & cashew cream sauce', price: 300, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 15 },

  // Rice & Biryani
  { name: 'Vegetable Biryani', description: 'Aromatic basmati rice cooked with garden veg, saffron & whole spices', price: 220, category: 'Rice & Biryani', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 15 },
  { name: 'Chicken Biryani', description: 'Hyderabadi dum biryani layered with marinated chicken & fried onions', price: 280, category: 'Rice & Biryani', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 16 },
  { name: 'Mutton Biryani', description: 'Slow cooked tender lamb layered with fragrant long grain basmati rice', price: 350, category: 'Rice & Biryani', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 18 },
  { name: 'Jeera Rice', description: 'Fluffy basmati rice tempered with cumin seeds & pure ghee', price: 150, category: 'Rice & Biryani', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 8 },
  { name: 'Steamed Rice', description: 'Steamed long grain basmati rice', price: 120, category: 'Rice & Biryani', stockQty: 50, reorderThreshold: 12, avgPrepMinutes: 6 },
  { name: 'Curd Rice', description: 'Cooling South Indian rice mixed with tempered yogurt, mustard & pomegranate', price: 150, category: 'Rice & Biryani', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 6 },

  // Breads
  { name: 'Naan (Plain)', description: 'Traditional soft tandoori flatbread', price: 50, category: 'Breads', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 5 },
  { name: 'Butter/Garlic Naan', description: 'Clay tandoor baked naan brushed with garlic butter & fresh cilantro', price: 65, category: 'Breads', stockQty: 45, reorderThreshold: 15, avgPrepMinutes: 5 },
  { name: 'Tandoori Roti', description: 'Whole wheat flatbread baked in charcoal clay oven', price: 40, category: 'Breads', stockQty: 60, reorderThreshold: 20, avgPrepMinutes: 4 },
  { name: 'Paratha (Plain/Aloo)', description: 'Flaky whole wheat bread stuffed with seasoned potato filling', price: 60, category: 'Breads', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 6 },
  { name: 'Kulcha', description: 'Soft leavened bread baked in tandoor with onion seed topping', price: 55, category: 'Breads', stockQty: 35, reorderThreshold: 10, avgPrepMinutes: 6 },
  { name: 'Puri (2 pcs)', description: 'Puffed golden whole wheat deep-fried bread', price: 50, category: 'Breads', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 5 },

  // South Indian
  { name: 'Masala Dosa', description: 'Crispy rice & lentil crepe stuffed with spiced potato masala', price: 150, category: 'South Indian', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 10 },
  { name: 'Idli Sambar (2 pcs)', description: 'Steamed rice cakes served with hot lentil sambar & coconut chutney', price: 110, category: 'South Indian', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 6 },
  { name: 'Vada (2 pcs)', description: 'Crispy savory black gram donuts served with sambar & coconut chutney', price: 100, category: 'South Indian', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 6 },
  { name: 'Uttapam', description: 'Thick savory rice pancake topped with onions, tomatoes & green chilies', price: 150, category: 'South Indian', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 10 },
  { name: 'Rava Dosa', description: 'Lacy crispy semolina crepe seasoned with black pepper & curry leaves', price: 160, category: 'South Indian', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 10 },

  // Accompaniments
  { name: 'Raita', description: 'Cooling whipped yogurt with cucumber, roasted cumin & chili powder', price: 80, category: 'Accompaniments', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 3 },
  { name: 'Papad', description: 'Crispy roasted lentil wafers served with green chutney', price: 40, category: 'Accompaniments', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 2 },
  { name: 'Pickle', description: 'Tangy Indian green chili & raw mango pickle', price: 30, category: 'Accompaniments', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 1 },
  { name: 'Green Chutney', description: 'Fresh mint, coriander, lime juice & green chili dip', price: 30, category: 'Accompaniments', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 1 },

  // Desserts
  { name: 'Gulab Jamun (2 pcs)', description: 'Warm milk solid dumplings in cardamom flavored sugar syrup', price: 90, category: 'Desserts', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 4 },
  { name: 'Rasmalai (2 pcs)', description: 'Soft cottage cheese discs soaked in saffron & pistachio milk', price: 120, category: 'Desserts', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 4 },
  { name: 'Kheer', description: 'Rich rice pudding simmered with milk, cardamom & silvered almonds', price: 100, category: 'Desserts', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 4 },
  { name: 'Jalebi', description: 'Crispy fried funnel spirals soaked in hot saffron sugar syrup', price: 90, category: 'Desserts', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 5 },
  { name: 'Kulfi', description: 'Traditional dense Indian pistachio & malai ice cream on a stick', price: 100, category: 'Desserts', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 3 },

  // Beverages
  { name: 'Masala Chai', description: 'Spiced Indian tea brewed with Assam leaves, ginger & cardamom', price: 40, category: 'Beverages', stockQty: 60, reorderThreshold: 20, avgPrepMinutes: 3 },
  { name: 'Lassi (Sweet/Salted/Mango)', description: 'Traditional churned yogurt smoothie served chilled', price: 90, category: 'Beverages', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 4 },
  { name: 'Buttermilk (Chaas)', description: 'Light spiced yogurt drink with roasted cumin & fresh coriander', price: 50, category: 'Beverages', stockQty: 45, reorderThreshold: 10, avgPrepMinutes: 3 },
  { name: 'Fresh Lime Soda', description: 'Refreshing sparkling lime juice with sweet or salted syrup', price: 60, category: 'Beverages', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 3 },
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
