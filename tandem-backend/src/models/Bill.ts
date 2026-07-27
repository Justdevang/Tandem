import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBill extends Document {
  orderIds: Types.ObjectId[];
  total: number;
  tax: number;
  status: 'unpaid' | 'paid';
  method?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>(
  {
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order', required: true }],
    total: { type: Number, required: true },
    tax: { type: Number, required: true },
    status: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    method: { type: String },
    sessionId: { type: String },
  },
  { timestamps: true }
);

export const Bill = mongoose.model<IBill>('Bill', billSchema);
