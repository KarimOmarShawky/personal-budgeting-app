import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

/**
 * Expense/Income category.
 *
 * SRS notes:
 * - The system provides predefined categories.
 * - Users can create custom categories (and delete only custom ones).
 *
 * For simplicity, we store categories in one collection:
 * - `isDefault=true` for system-provided categories (admin-managed / seeded).
 * - `userId` present only for user-created categories.
 */
export interface Category {
  _id: mongoose.Types.ObjectId;
  name: string;
  isDefault: boolean;
  userId?: mongoose.Types.ObjectId; // present only for custom categories
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDoc = HydratedDocument<Category>;
export type CategoryModelType = Model<Category>;

const CategorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    isDefault: { type: Boolean, required: true, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  },
  { timestamps: true }
);

// Ensure: (userId, name) unique for custom categories, and (isDefault, name) unique for default.
// We can’t use partial indexes easily in all environments, so we keep it simple with a compound index.
CategorySchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });
CategorySchema.index({ isDefault: 1, name: 1 }, { unique: true });

export const CategoryModel: CategoryModelType =
  (mongoose.models.Category as CategoryModelType) ||
  mongoose.model<Category>('Category', CategorySchema);

