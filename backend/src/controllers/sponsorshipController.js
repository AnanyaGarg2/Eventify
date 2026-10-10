import mongoose from 'mongoose';
import validator from 'validator';
import Event from '../models/Event.js';
import Sponsorship from '../models/Sponsorship.js';

const phonePattern = /^\+?[\d\s().-]{7,30}$/;

export const getEventSponsorship = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ message: 'Invalid event ID.' });
    }
    const event = await Event.findById(req.params.eventId).populate('organizer', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!event.sponsorshipEnabled) return res.status(400).json({ message: 'Sponsorship is not enabled for this event.' });
    const activeReservations = await Sponsorship.aggregate([
      { $match: { event: event._id, status: { $in: ['pending', 'approved'] } } },
      { $group: { _id: '$package', count: { $sum: 1 } } },
    ]);
    const reservedByPackage = new Map(activeReservations.map((item) => [item._id.toString(), item.count]));
    res.json({
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        posterUrl: event.posterUrl,
        organizer: event.organizer,
        sponsorshipEnabled: event.sponsorshipEnabled,
        sponsorshipPackages: event.sponsorshipPackages.filter((item) => item.isActive).map((item) => ({
          ...item.toObject(),
          remainingSponsors: Math.max(0, item.maxSponsors - (reservedByPackage.get(item._id.toString()) || 0)),
        })),
      },
    });
  } catch (err) {
    console.error('Unable to load event sponsorship details:', err);
    res.status(500).json({ message: 'Unable to load sponsorship details.' });
  }
};

export const createSponsorship = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { companyName, contactPerson, email, phone, website, packageId, message } = req.body || {};
    if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(packageId)) {
      return res.status(400).json({ message: 'Invalid event or package ID.' });
    }

    const company = typeof companyName === 'string' ? companyName.trim() : '';
    const contact = typeof contactPerson === 'string' ? contactPerson.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
    const normalizedWebsite = typeof website === 'string' ? website.trim() : '';
    const normalizedMessage = typeof message === 'string' ? message.trim() : '';
    if (!company || !contact || !normalizedEmail || !normalizedPhone) {
      return res.status(400).json({ message: 'Company name, contact person, email, and phone are required.' });
    }
    if (company.length > 160 || contact.length > 120 || normalizedEmail.length > 254 || normalizedPhone.length > 30 || normalizedMessage.length > 2000) {
      return res.status(400).json({ message: 'One or more fields exceed the allowed length.' });
    }
    if (!validator.isEmail(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!phonePattern.test(normalizedPhone)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    if (normalizedWebsite && (!validator.isURL(normalizedWebsite, { require_protocol: true, protocols: ['http', 'https'] }) || normalizedWebsite.length > 2048)) {
      return res.status(400).json({ message: 'Enter a valid website URL beginning with http:// or https://.' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!event.sponsorshipEnabled) return res.status(400).json({ message: 'Sponsorship is not enabled for this event.' });
    if (event.organizer.toString() === req.user.id) return res.status(403).json({ message: 'Event organizers cannot sponsor their own event.' });
    const selectedPackage = event.sponsorshipPackages.id(packageId);
    if (!selectedPackage || !selectedPackage.isActive) return res.status(400).json({ message: 'Selected package is not available for this event.' });

    const duplicate = await Sponsorship.exists({ event: event._id, sponsor: req.user.id });
    if (duplicate) return res.status(409).json({ message: 'You have already submitted a sponsorship request for this event.' });
    const reservedCount = await Sponsorship.countDocuments({
      event: event._id,
      package: selectedPackage._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (reservedCount >= selectedPackage.maxSponsors) {
      return res.status(409).json({ message: 'This sponsorship package has reached its sponsor limit.' });
    }

    const sponsorship = await Sponsorship.create({
      event: event._id,
      sponsor: req.user.id,
      companyName: company,
      contactPerson: contact,
      email: normalizedEmail,
      phone: normalizedPhone,
      website: normalizedWebsite,
      package: selectedPackage._id,
      packageName: selectedPackage.name,
      amount: selectedPackage.amount,
      message: normalizedMessage,
      logoUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });
    res.status(201).json({ sponsorship });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted a sponsorship request for this event.' });
    }
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    console.error('Unable to submit sponsorship request:', err);
    res.status(500).json({ message: 'Unable to submit sponsorship request.' });
  }
};

export const listEventSponsors = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(400).json({ message: 'Invalid event ID.' });
    const event = await Event.findById(req.params.eventId).select('organizer');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ message: 'You do not own this event.' });

    const sponsorships = await Sponsorship.find({ event: event._id })
      .populate('sponsor', 'name email')
      .sort({ createdAt: -1 });
    const totals = sponsorships.reduce((summary, item) => {
      summary[item.status] += 1;
      summary.totalRequestedAmount += item.amount;
      if (item.status === 'approved') summary.totalApprovedAmount += item.amount;
      return summary;
    }, { pending: 0, approved: 0, rejected: 0, totalRequestedAmount: 0, totalApprovedAmount: 0 });
    res.json({ sponsorships, totals });
  } catch (err) {
    console.error('Unable to load event sponsorship requests:', err);
    res.status(500).json({ message: 'Unable to load sponsorship requests.' });
  }
};

export const updateSponsorshipStatus = async (req, res) => {
  try {
    const { sponsorshipId } = req.params;
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(sponsorshipId)) return res.status(400).json({ message: 'Invalid sponsorship ID.' });
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected.' });

    const sponsorship = await Sponsorship.findById(sponsorshipId);
    if (!sponsorship) return res.status(404).json({ message: 'Sponsorship request not found.' });
    const event = await Event.findById(sponsorship.event).select('organizer');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ message: 'You do not own this event.' });
    if (sponsorship.sponsor.toString() === req.user.id) return res.status(403).json({ message: 'Sponsors cannot review their own requests.' });
    if (sponsorship.status !== 'pending') return res.status(409).json({ message: 'Only pending sponsorship requests can be reviewed.' });

    const reviewed = await Sponsorship.findOneAndUpdate(
      { _id: sponsorship._id, status: 'pending' },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!reviewed) return res.status(409).json({ message: 'Only pending sponsorship requests can be reviewed.' });
    res.json({ sponsorship: reviewed });
  } catch (err) {
    console.error('Unable to update sponsorship status:', err);
    res.status(500).json({ message: 'Unable to update sponsorship status.' });
  }
};
