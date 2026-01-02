import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplication extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  opportunityId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "completed";
  message?: string;
  availability?: string;
  experience?: string;
  hoursCommitted?: number;
  hoursCompleted?: number;
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn", "completed"],
      default: "pending",
    },
    message: {
      type: String,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    availability: {
      type: String,
      maxlength: [500, "Availability cannot exceed 500 characters"],
    },
    experience: {
      type: String,
      maxlength: [1000, "Experience cannot exceed 1000 characters"],
    },
    hoursCommitted: {
      type: Number,
      min: 0,
    },
    hoursCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNotes: {
      type: String,
      maxlength: [1000, "Review notes cannot exceed 1000 characters"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      maxlength: [1000, "Feedback cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate applications
ApplicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

// Indexes for better query performance
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ opportunityId: 1, status: 1 });
ApplicationSchema.index({ organizationId: 1, status: 1 });

const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);

export default Application;
