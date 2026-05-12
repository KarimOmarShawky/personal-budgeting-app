import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Link to the user who owns this
  type: TransactionType;
  amount: number;
  category: string; // Changed from categoryId to category string
  dateTime: Date;
  description?: string;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionDoc = HydratedDocument<Transaction>;
export type TransactionModelType = Model<Transaction>;

const TransactionSchema = new Schema<Transaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: ['income', 'expense'], index: true },
    amount: { type: Number, required: true, min: 0.01, max: 9999999.99 },
    category: { type: String, required: true, trim: true, maxlength: 50 }, // Matches the interface
    dateTime: { type: Date, required: true, default: () => new Date() },
    description: { type: String, required: false, trim: true, maxlength: 200 },
    paymentMethod: { type: String, required: false, trim: true, maxlength: 50 },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, dateTime: -1 });

export const TransactionModel: TransactionModelType =
  (mongoose.models.Transaction as TransactionModelType) ||
  mongoose.model<Transaction>('Transaction', TransactionSchema);