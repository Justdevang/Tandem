import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInventoryLog extends Document {
  menuItemId: Types.ObjectId;
  changeQty: number;
  reason: 'order' | 'restock' | 'adjustment';
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    changeQty: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['order', 'restock', 'adjustment'],
      required: true,
    },
  },
  { timestamps: true }
);

export const InventoryLog = mongoose.model<IInventoryLog>('InventoryLog', inventoryLogSchema);
