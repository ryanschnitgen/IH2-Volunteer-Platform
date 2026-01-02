import mongoose from 'mongoose';

export interface IHoursLog {
  userId: string; // Firebase UID
  userEmail: string; // For reference
  userName: string; // For display
  eventId?: string; // Reference to Event if hours are from an event
  eventTitle?: string; // Event name for display
  hours: number;
  date: Date;
  autoAssigned: boolean; // True if auto-assigned after event, false if manually logged
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HoursLogSchema = new mongoose.Schema<IHoursLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true, // For fast user lookups
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    eventId: {
      type: String,
      index: true,
    },
    eventTitle: {
      type: String,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    autoAssigned: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
HoursLogSchema.index({ userId: 1, date: -1 });

export default mongoose.models.HoursLog ||
  mongoose.model<IHoursLog>('HoursLog', HoursLogSchema);
