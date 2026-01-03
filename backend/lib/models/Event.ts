import mongoose from 'mongoose';

export interface IEvent {
  title: string;
  description: string;
  location: string;
  date: Date;
  startTime: string;
  endTime: string;
  spotsAvailable: number;
  spotsRemaining: number;
  createdBy: string; // Firebase UID
  createdByName: string;
  organization: string;
  eventType: string; // Name of the event type
  eventCategory: string; // Category of the event type
  status: 'active' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new mongoose.Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    spotsAvailable: {
      type: Number,
      required: true,
    },
    spotsRemaining: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      default: 'IH2',
    },
    eventType: {
      type: String,
      required: true,
    },
    eventCategory: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
