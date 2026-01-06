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
  // New fields for volunteer tracking
  volunteerId?: mongoose.Types.ObjectId; // Reference to VolunteerProfile
  email?: string; // Email for volunteer (normalized)
  isUniqueVolunteer?: boolean; // True if this is a unique volunteer (not a guest)
  hasGuests?: boolean; // True if volunteer brought guests
  guestCount?: number; // Number of guests
  totalAttendees?: number; // Total people (volunteer + guests)
  category?: string; // Type of activity
  description?: string; // Activity description
  source?: string; // Where this log came from (e.g., "Volunteer Sign-In Form")
  createdAt: Date;
  updatedAt: Date;
}

const HoursLogSchema = new mongoose.Schema<IHoursLog>(
  {
    userId: {
      type: String,
      required: false, // Made optional for check-ins without Firebase auth
      index: true,
    },
    userEmail: {
      type: String,
      required: false,
    },
    userName: {
      type: String,
      required: false,
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
      default: 0,
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
    // New fields for volunteer tracking
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VolunteerProfile',
      index: true,
    },
    email: {
      type: String,
      index: true,
    },
    isUniqueVolunteer: {
      type: Boolean,
      default: true,
    },
    hasGuests: {
      type: Boolean,
      default: false,
    },
    guestCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAttendees: {
      type: Number,
      default: 1,
      min: 1,
    },
    category: {
      type: String,
    },
    description: {
      type: String,
    },
    source: {
      type: String,
      default: 'Manual',
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
