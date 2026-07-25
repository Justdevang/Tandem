import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string; // denormalized for ticket display
  qty: number;
  notes?: string;
}

export interface IOrder extends Document {
  tableId: number;
  customerId?: Types.ObjectId;
  items: IOrderItem[];
  status: 'new' | 'firing' | 'ready' | 'served' | 'billed';
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    notes: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    tableId: { type: Number, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    items: { type: [orderItemSchema], required: true },
    status: {
      type: String,
      enum: ['new', 'firing', 'ready', 'served', 'billed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);
