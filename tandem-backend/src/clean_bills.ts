import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { Bill } from './models/Bill.js';
import { Order } from './models/Order.js';
import { MenuItem } from './models/MenuItem.js';

async function cleanBills() {
  await connectDB();

  console.log('🧹 Cleaning up billing history...');

  // Fetch all bills sorted by newest first
  const allBills = await Bill.find().sort({ createdAt: -1 });
  console.log(`Found ${allBills.length} existing bill documents.`);

  if (allBills.length > 2) {
    // Keep top 2 bills, delete the rest
    const billsToKeep = allBills.slice(0, 2);
    const billsToDelete = allBills.slice(2);

    const idsToDelete = billsToDelete.map((b) => b._id);
    await Bill.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`🗑️ Deleted ${idsToDelete.length} excess bill records. Retained ${billsToKeep.length} bills.`);

    // Find linked order IDs of kept bills
    const keptOrderIds = billsToKeep.flatMap((b) => b.orderIds || []);
    await Order.deleteMany({ _id: { $nin: keptOrderIds } });
    console.log('🗑️ Cleaned up orphan order records.');
  } else if (allBills.length === 0) {
    // If no bills exist, seed 2 sample clean bills for demonstration
    console.log('No bills found. Creating 2 sample bill records...');
    const items = await MenuItem.find();
    if (items.length >= 2) {
      // Bill 1: Dine-in Table 4 (Paid)
      const order1 = await Order.create({
        orderType: 'dine-in',
        tableId: 4,
        items: [
          { menuItemId: items[0]._id, name: items[0].name, qty: 2 },
          { menuItemId: items[1]._id, name: items[1].name, qty: 1 },
        ],
        status: 'billed',
      });
      const subtotal1 = items[0].price * 2 + items[1].price * 1;
      const tax1 = Math.round(subtotal1 * 0.05);
      await Bill.create({
        orderIds: [order1._id],
        total: subtotal1 + tax1 + Math.round(subtotal1 * 0.05),
        tax: tax1,
        status: 'paid',
        method: 'upi',
      });

      // Bill 2: Takeaway (Paid)
      const order2 = await Order.create({
        orderType: 'takeaway',
        pickupCode: '4920',
        items: [
          { menuItemId: items[1]._id, name: items[1].name, qty: 1 },
        ],
        status: 'billed',
      });
      const subtotal2 = items[1].price * 1;
      const tax2 = Math.round(subtotal2 * 0.05);
      await Bill.create({
        orderIds: [order2._id],
        total: subtotal2 + tax2 + Math.round(subtotal2 * 0.05),
        tax: tax2,
        status: 'paid',
        method: 'card',
      });
      console.log('✅ Created 2 sample paid bills.');
    }
  }

  const remainingBills = await Bill.find().populate('orderIds');
  console.log(`\n📋 Current Billing History count: ${remainingBills.length}`);

  await mongoose.disconnect();
  console.log('✅ Billing cleanup complete.');
}

cleanBills().catch((err) => {
  console.error('Clean bills error:', err);
  process.exit(1);
});
