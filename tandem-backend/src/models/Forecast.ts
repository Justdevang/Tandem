import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IForecast extends Document {
  menuItemId: Types.ObjectId;
  predictedDemand: number;
  suggestedReorderQty: number;
  generatedAt: Date;
  model: string;
}

const forecastSchema = new Schema<IForecast>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    predictedDemand: { type: Number, required: true },
    suggestedReorderQty: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now },
    model: { type: String, default: 'gemini' },
  },
  { timestamps: true }
);

export const Forecast = mongoose.model<IForecast>('Forecast', forecastSchema);
