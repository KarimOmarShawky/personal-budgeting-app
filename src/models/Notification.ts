import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type NotificationType =
  | 'BUDGET_NEAR_LIMIT'
  | 'BUDGET_EXCEEDED'
  | 'GOAL_COMPLETED'
  | 'SYSTEM';

/**
 * Notifications center (SRS user story #11).
 */
export interface Notification {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  isRead: boolean;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDoc = HydratedDocument<Notification>;
export type NotificationModelType = Model<Notification>;

const NotificationSchema = new Schema<Notification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['BUDGET_NEAR_LIMIT', 'BUDGET_EXCEEDED', 'GOAL_COMPLETED', 'SYSTEM'],
      index: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 255 },
    isRead: { type: Boolean, required: true, default: false, index: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, timestamp: -1 });

export const NotificationModel: NotificationModelType =
  (mongoose.models.Notification as NotificationModelType) ||
  mongoose.model<Notification>('Notification', NotificationSchema);

