import mongoose from 'mongoose';

export interface IEventRegistration {
  eventId: mongoose.Types.ObjectId;
  userId: string; // Firebase UID
  userEmail: string;
  userName: string;
  eventTitle: string;
  eventDate: Date;
  eventStartTime: string;
  eventEndTime: string;
  eventCategory: string;
  registeredAt: Date;
  attended: boolean;
  checkedIn: boolean; // Scanned QR code at event
  hoursCompleted: number;
  cancelled: boolean;
  cancellationReason: string;
  // Group registration fields
  additionalAttendees: number;
  attendeeNames: string[];
  totalAttendees: number;
  // Group check-in type (true = checking in for guests without accounts)
  isGroupCheckIn: boolean;
  reminderSentAt?: Date;
}

const EventRegistrationSchema = new mongoose.Schema<IEventRegistration>(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
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
    eventTitle: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    eventStartTime: {
      type: String,
      required: true,
    },
    eventEndTime: {
      type: String,
      required: true,
    },
    eventCategory: {
      type: String,
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    attended: {
      type: Boolean,
      default: false,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    hoursCompleted: {
      type: Number,
      default: 0,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    additionalAttendees: {
      type: Number,
      default: 0,
    },
    attendeeNames: {
      type: [String],
      default: [],
    },
    totalAttendees: {
      type: Number,
      default: 1,
    },
    isGroupCheckIn: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index to prevent duplicate registrations
EventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.models.EventRegistration ||
  mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema);
