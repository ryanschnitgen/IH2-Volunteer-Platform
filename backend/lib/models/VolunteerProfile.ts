import mongoose from 'mongoose';

export interface IVolunteerProfile {
  firstName: string;
  lastName: string;
  email: string;
  username?: string; // Legacy system username
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  birthday?: Date;
  volunteerDateJoined?: Date;
  canLiftHeavy?: boolean;
  lifetimeHours: number;
  linkedUserId?: string; // Firebase UID when they sign up
  waiverAccepted?: boolean;
  waiverAcceptedDate?: Date;
  waiverAcceptedIP?: string;
  importedAt: Date;
  lastUpdated: Date;
}

const VolunteerProfileSchema = new mongoose.Schema<IVolunteerProfile>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // For fast lookups when users sign up
    },
    username: {
      type: String,
      lowercase: true,
      trim: true,
      index: true, // For fast lookups during import
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    country: {
      type: String,
    },
    birthday: {
      type: Date,
    },
    volunteerDateJoined: {
      type: Date,
    },
    canLiftHeavy: {
      type: Boolean,
      default: false,
    },
    lifetimeHours: {
      type: Number,
      default: 0,
    },
    linkedUserId: {
      type: String,
      index: true,
    },
    waiverAccepted: {
      type: Boolean,
      default: false,
    },
    waiverAcceptedDate: {
      type: Date,
    },
    waiverAcceptedIP: {
      type: String,
    },
    importedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VolunteerProfile ||
  mongoose.model<IVolunteerProfile>('VolunteerProfile', VolunteerProfileSchema);
