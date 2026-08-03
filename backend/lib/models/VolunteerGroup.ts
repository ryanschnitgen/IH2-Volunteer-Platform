import mongoose from 'mongoose';

export interface IVolunteerGroup {
  name: string;
  description?: string;
  memberEmails: string[];
  createdBy: string;
  createdAt: Date;
}

const VolunteerGroupSchema = new mongoose.Schema<IVolunteerGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    memberEmails: { type: [String], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.VolunteerGroup ||
  mongoose.model<IVolunteerGroup>('VolunteerGroup', VolunteerGroupSchema);
