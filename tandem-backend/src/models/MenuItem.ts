import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  stockQty: number;
  reorderThreshold: number;
  isAvailable: boolean; // virtual
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String },
    stockQty: { type: Number, required: true, default: 0 },
    reorderThreshold: { type: Number, required: true, default: 5 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// isAvailable is ALWAYS derived — never stored directly.
// This ensures it can never drift out of sync with stockQty.
menuItemSchema.virtual('isAvailable').get(function (this: IMenuItem) {
  return this.stockQty > 0;
});

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
