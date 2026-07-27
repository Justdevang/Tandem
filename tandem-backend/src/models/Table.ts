import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  number: number;
  capacity: number;
  status: 'free' | 'occupied' | 'billing';
  currentSessionId?: string;
}

const tableSchema = new Schema<ITable>(
  {
    number: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['free', 'occupied', 'billing'],
      default: 'free',
    },
    currentSessionId: { type: String },
  },
  { timestamps: true }
);

export const Table = mongoose.model<ITable>('Table', tableSchema);
