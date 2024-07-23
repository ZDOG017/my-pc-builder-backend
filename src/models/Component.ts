import mongoose, { Schema, Document } from 'mongoose';

export interface IComponent extends Document {
  name: string;
  type: string;
  price: number;
  store: string;
  url: string;
  image: string;
  lastUpdated: Date;
}

const ComponentSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  store: { type: String, required: true },
  url: { type: String, required: true },
  image: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model<IComponent>('Component', ComponentSchema);
