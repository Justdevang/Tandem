import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string; // denormalized for ticket display
  qty: number;
  notes?: string;
}

export interface IOrder extends Document {
  tableId?: number;
  orderType: 'dine-in' | 'takeaway';
  pickupCode?: string;
  customerId?: Types.ObjectId;
  sessionId?: string;
  items: IOrderItem[];
  status: 'new' | 'firing' | 'ready' | 'served' | 'billed';
  estimatedReadyAt?: Date;
  etaMinutes?: number;
  completedAt?: Date;
  fulfillmentMinutes?: number;
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
    tableId: { type: Number, required: false },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway'],
      default: 'dine-in',
    },
    pickupCode: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    items: { type: [orderItemSchema], required: true },
    status: {
      type: String,
      enum: ['new', 'firing', 'ready', 'served', 'billed'],
      default: 'new',
    },
    estimatedReadyAt: { type: Date },
    etaMinutes: { type: Number },
    completedAt: { type: Date },
    fulfillmentMinutes: { type: Number },
  },
  { timestamps: true }
);

orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
