import mongoose from 'mongoose';

const sponsorshipPackageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  benefits: [{ type: String, trim: true }],
  maxSponsors: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
});

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, default: 'Tech' },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, default: 0 },
    participantLimit: { type: Number, min: 1, default: null },
    acceptedParticipantCount: { type: Number, min: 0 },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    posterUrl: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    tags: [{ type: String }],
    averageRating: { type: Number, default: 0 },
    sponsorshipEnabled: { type: Boolean, default: false },
    sponsorshipPackages: { type: [sponsorshipPackageSchema], default: [] },
  },
  { timestamps: true }
);

export const Event = mongoose.model('Event', eventSchema);
export default Event;
