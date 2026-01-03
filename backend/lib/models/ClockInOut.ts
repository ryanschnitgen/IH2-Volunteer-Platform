import mongoose from 'mongoose';

export interface IClockInOut {
  userId: string;
  userEmail: string;
  userName: string;
  clockInTime: Date;
  clockOutTime?: Date;
  hours?: number;
  activity: string;
  notes?: string;
  location?: string;
}

const ClockInOutSchema = new mongoose.Schema<IClockInOut>(
  {
    userId: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    clockInTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    clockOutTime: {
      type: Date,
    },
    hours: {
      type: Number,
    },
    activity: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '20 Leonberg Road, Building E Cranberry Township, PA 16066',
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active clock-ins
ClockInOutSchema.index({ userId: 1, clockOutTime: 1 });

export default mongoose.models.ClockInOut ||
  mongoose.model<IClockInOut>('ClockInOut', ClockInOutSchema);
