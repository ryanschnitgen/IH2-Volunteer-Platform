import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOpportunity extends Document {
  _id: string;
  title: string;
  description: string;
  organizationId: mongoose.Types.ObjectId;
  category: string;
  location: {
    address?: string;
    city: string;
    state?: string;
    zipCode?: string;
    isRemote: boolean;
  };
  schedule: {
    type: "one-time" | "recurring" | "flexible";
    startDate?: Date;
    endDate?: Date;
    daysOfWeek?: string[];
    timeSlots?: {
      startTime: string;
      endTime: string;
    }[];
  };
  requirements?: {
    minAge?: number;
    skills?: string[];
    backgroundCheck?: boolean;
    orientation?: boolean;
  };
  numberOfVolunteers?: {
    needed: number;
    current: number;
  };
  contactPerson?: {
    name: string;
    email: string;
    phone?: string;
  };
  status: "active" | "inactive" | "completed" | "cancelled";
  image?: string;
  applicationCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
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
    location: {
      address: String,
      city: {
        type: String,
        required: true,
      },
      state: String,
      zipCode: String,
      isRemote: {
        type: Boolean,
        default: false,
      },
    },
    schedule: {
      type: {
        type: String,
        enum: ["one-time", "recurring", "flexible"],
        required: true,
      },
      startDate: Date,
      endDate: Date,
      daysOfWeek: [
        {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
      ],
      timeSlots: [
        {
          startTime: String,
          endTime: String,
        },
      ],
    },
    requirements: {
      minAge: {
        type: Number,
        min: 0,
      },
      skills: [String],
      backgroundCheck: {
        type: Boolean,
        default: false,
      },
      orientation: {
        type: Boolean,
        default: false,
      },
    },
    numberOfVolunteers: {
      needed: {
        type: Number,
        required: true,
        min: 1,
      },
      current: {
        type: Number,
        default: 0,
      },
    },
    contactPerson: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      },
      phone: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "cancelled"],
      default: "active",
    },
    image: String,
    applicationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
OpportunitySchema.index({ organizationId: 1, status: 1 });
OpportunitySchema.index({ category: 1, status: 1 });
OpportunitySchema.index({ "location.city": 1 });

const Opportunity: Model<IOpportunity> =
  mongoose.models.Opportunity ||
  mongoose.model<IOpportunity>("Opportunity", OpportunitySchema);

export default Opportunity;
