import mongoose from 'mongoose';

const sponsorshipSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true, trim: true, maxlength: 160 },
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    website: { type: String, trim: true, maxlength: 2048 },
    package: { type: mongoose.Schema.Types.ObjectId, required: true },
    packageName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, trim: true, maxlength: 2000 },
    logoUrl: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

sponsorshipSchema.index({ event: 1, sponsor: 1 }, { unique: true });
sponsorshipSchema.index({ event: 1, status: 1 });

export const Sponsorship = mongoose.model('Sponsorship', sponsorshipSchema);
export default Sponsorship;
