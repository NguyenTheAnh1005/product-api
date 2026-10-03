import mongoose from 'mongoose';
import { validPrice } from './validation.js';

export function createDatabase(uri) {
  const connection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 2000, connectTimeoutMS: 2000,
    socketTimeoutMS: 3000, heartbeatFrequencyMS: 1000
  });
  connection.on('error', () => console.error('MongoDB connection error'));
  const schema = new mongoose.Schema({
    pid: { type: Number, required: true, immutable: true, unique: true, min: 1, validate: Number.isSafeInteger },
    pname: { type: String, required: true, trim: true },
    price: { type: Number, required: true, validate: validPrice },
    quantity: { type: Number, required: true, min: 0, validate: Number.isSafeInteger }
  }, { versionKey: false, bufferCommands: false });
  const Product = connection.model('Product', schema);
  let initialized = false;
  return {
    connection, Product,
    async init() { await connection.asPromise(); await Product.init(); initialized = true; },
    async ping() {
      if (!initialized || connection.readyState !== 1) throw new Error('Database unavailable');
      await connection.db.command({ ping: 1 }, { timeoutMS: 2000 });
    },
    async close() { await connection.close(); },
    repository: {
      create: data => Product.create(data),
      list: () => Product.find().sort({ pid: 1 }).lean(),
      get: pid => Product.findOne({ pid }).lean(),
      update: (pid, data) => Product.findOneAndUpdate({ pid }, { $set: data }, { returnDocument: 'after', runValidators: true }).lean(),
      remove: pid => Product.findOneAndDelete({ pid }).lean()
    }
  };
}
