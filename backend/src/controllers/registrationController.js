import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import { generateQRCodeDataUrl } from '../utils/qrcode.js';
import { sendEmail } from '../utils/email.js';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    if (!mongoose.isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid event ID.' });
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() === req.user.id) return res.status(403).json({ message: 'Organizers cannot register for their own event.' });
    const payload = JSON.stringify({ userId: req.user.id, eventId: event._id, at: Date.now() });
    const qrCodeDataUrl = await generateQRCodeDataUrl(payload);
    const reg = await Registration.create({ user: req.user.id, event: event._id, qrCodeDataUrl, status: 'pending' });
    try {
      const user = await User.findById(req.user.id).select('email');
      if (user?.email) await sendEmail({ to: user.email, subject: `Registration request: ${event.title}`, html: `<p>Your registration request for ${event.title} is pending organizer approval.</p>` });
    } catch (emailError) {
      console.error('Unable to send registration email:', emailError);
    }
    res.status(201).json({ registration: reg });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You are already registered for this event.' });
    res.status(500).json({ message: err.message });
  }
};

export const myRegistrations = async (req, res) => {
  try {
    const regs = await Registration.find({ user: req.user.id }).populate('event');
    res.json({ registrations: regs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const myEventRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user.id })
      .populate('event')
      .sort({ createdAt: -1 });
    res.json({ registrations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const participantsForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    if (!mongoose.isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid event ID.' });
    const event = await Event.findById(eventId).select('organizer');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ message: 'You do not own this event.' });
    const regs = await Registration.find({ event: eventId }).populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ participants: regs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const checkInParticipant = async (req, res) => {
  try {
    const eventId = req.params.id;
    const participantId = req.body?.userId;
    if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(participantId)) return res.status(400).json({ message: 'Invalid event or participant ID.' });
    const event = await Event.findById(eventId).select('organizer');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ message: 'You do not own this event.' });
    const reg = await Registration.findOneAndUpdate(
      { user: participantId, event: eventId, status: { $in: ['accepted', 'attended', 'registered'] } },
      { status: 'attended', checkedInAt: new Date() },
      { new: true }
    );
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    res.json({ registration: reg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const exportParticipantsCsv = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid event ID.' });
    const event = await Event.findById(req.params.id).select('organizer');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ message: 'You do not own this event.' });
    const regs = await Registration.find({ event: req.params.id }).populate('user', 'name email');
    const rows = regs.map(r => ({ name: r.user?.name || '', email: r.user?.email || '', status: r.status, registeredAt: r.createdAt }));
    const filePath = path.join(process.cwd(), `participants-${req.params.id}.csv`);
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'status', title: 'Status' },
        { id: 'registeredAt', title: 'Registered At' },
      ],
    });
    await csvWriter.writeRecords(rows);
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
