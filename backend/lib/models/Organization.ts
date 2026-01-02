import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrganization extends Document {
  _id: string;
  name: string;
  description: string;
  category: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  adminUserId: mongoose.Types.ObjectId;
  mission?: string;
  established?: Date;
  verified: boolean;
  volunteerCount?: number;
  opportunityCount?: number;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Food & Hunger",
        "Education & Youth",
        "Animals",
        "Environment",
        "Healthcare",
        "Community Development",
        "Arts & Culture",
        "Senior Services",
        "Other",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "USA" },
    },
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mission: {
      type: String,
      maxlength: [500, "Mission statement cannot exceed 500 characters"],
    },
    established: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    volunteerCount: {
      type: Number,
      default: 0,
    },
    opportunityCount: {
      type: Number,
      default: 0,
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
    },
  },
  {
    timestamps: true,
  }
);

const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
