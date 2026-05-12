import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type GoalStatus = 'In Progress' | 'Completed';

/**
 * Financial goals (SRS R8).
 */
export interface FinancialGoal {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type FinancialGoalDoc = HydratedDocument<FinancialGoal>;
export type FinancialGoalModelType = Model<FinancialGoal>;

const FinancialGoalSchema = new Schema<FinancialGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goalName: { type: String, required: true, trim: true, maxlength: 100 },
    targetAmount: { type: Number, required: true, min: 0.01 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    deadline: { type: Date, required: true },
  },
  { timestamps: true }
);

FinancialGoalSchema.index({ userId: 1, goalName: 1 }, { unique: false });

export const FinancialGoalModel: FinancialGoalModelType =
  (mongoose.models.FinancialGoal as FinancialGoalModelType) ||
  mongoose.model<FinancialGoal>('FinancialGoal', FinancialGoalSchema);

