import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type BudgetStatus = 'On Track' | 'Near Limit' | 'Exceeded';

/**
 * Budget = monthly spending limit for a category (SRS R5/R6).
 * Category is stored as a plain string for consistency with transactions.
 * month = YYYY-MM string.
 */
export interface Budget {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: string;         // e.g. "Food", "Transport" – matches Transaction.category
  month: string;            // "YYYY-MM"
  limitAmount: number;
  alertThreshold: number;   // percentage, e.g. 80
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetDoc = HydratedDocument<Budget>;
export type BudgetModelType = Model<Budget>;

const BudgetSchema = new Schema<Budget>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category:       { type: String, required: true, trim: true, maxlength: 50 },
    month:          { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    limitAmount:    { type: Number, required: true, min: 0.01 },
    alertThreshold: { type: Number, required: true, min: 1, max: 100, default: 80 },
  },
  { timestamps: true }
);

// One budget per user-category-month combination
BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

export const BudgetModel: BudgetModelType =
  (mongoose.models.Budget as BudgetModelType) ||
  mongoose.model<Budget>('Budget', BudgetSchema);
