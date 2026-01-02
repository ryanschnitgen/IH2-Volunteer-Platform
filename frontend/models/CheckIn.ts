import mongoose from 'mongoose';

export interface ICheckIn {
  eventId: mongoose.Types.ObjectId;
  name: string; // Name from Google Form
  email: string; // Email from Google Form
  checkedInAt: Date;
  matched: boolean; // Whether this has been matched to a user
  matchedUserId?: string; // Firebase UID if matched
  matchedRegistrationId?: mongoose.Types.ObjectId; // Registration ID if matched
  matchConfidence?: number; // 0-100 confidence score
  notes?: string; // Admin notes or match details
}

const CheckInSchema = new mongoose.Schema<ICheckIn>(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    matched: {
      type: Boolean,
      default: false,
    },
    matchedUserId: {
      type: String,
      required: false,
    },
    matchedRegistrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventRegistration',
      required: false,
    },
    matchConfidence: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
CheckInSchema.index({ eventId: 1, email: 1 });
CheckInSchema.index({ eventId: 1, matched: 1 });

export default mongoose.models.CheckIn ||
  mongoose.model<ICheckIn>('CheckIn', CheckInSchema);
