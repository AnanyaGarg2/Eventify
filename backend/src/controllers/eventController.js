import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import mongoose from 'mongoose';

function parseParticipantLimit(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    const error = new Error('Participant limit must be a positive whole number or empty for unlimited.');
    error.status = 400;
    throw error;
  }
  return limit;
}

function parseSponsorshipSettings(body) {
  if (body.sponsorshipEnabled === undefined && body.sponsorshipPackages === undefined) return {};

  if (body.sponsorshipEnabled !== undefined && ![true, false, 'true', 'false'].includes(body.sponsorshipEnabled)) {
    const error = new Error('Sponsorship enabled must be a boolean.');
    error.status = 400;
    throw error;
  }
  const enabled = body.sponsorshipEnabled === true || body.sponsorshipEnabled === 'true';
  let packages = body.sponsorshipPackages;
  if (typeof packages === 'string') {
    try {
      packages = JSON.parse(packages);
    } catch {
      const error = new Error('Sponsorship packages must be valid JSON.');
      error.status = 400;
      throw error;
    }
  }
  if (packages === undefined) packages = [];
  if (!Array.isArray(packages)) {
    const error = new Error('Sponsorship packages must be an array.');
    error.status = 400;
    throw error;
  }
  if (packages.length > 20) {
    const error = new Error('An event can have at most 20 sponsorship packages.');
    error.status = 400;
    throw error;
  }
  if (enabled && packages.length === 0) {
    const error = new Error('Add at least one sponsorship package when enabling sponsorship.');
    error.status = 400;
    throw error;
  }

  const packageIds = new Set();
  const cleanPackages = packages.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      const error = new Error('Each sponsorship package must be an object.');
      error.status = 400;
      throw error;
    }
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    const amount = Number(item.amount);
    const maxSponsors = Number(item.maxSponsors);
    if (item.benefits !== undefined && !Array.isArray(item.benefits)) {
      const error = new Error('Sponsorship package benefits must be an array of strings.');
      error.status = 400;
      throw error;
    }
    if (item.isActive !== undefined && typeof item.isActive !== 'boolean' && item.isActive !== 'true' && item.isActive !== 'false') {
      const error = new Error('Sponsorship package availability must be a boolean.');
      error.status = 400;
      throw error;
    }
    const benefits = Array.isArray(item.benefits)
      ? item.benefits.filter((benefit) => typeof benefit === 'string').map((benefit) => benefit.trim()).filter(Boolean)
      : [];
    if (item.benefits?.some((benefit) => typeof benefit !== 'string') || benefits.some((benefit) => benefit.length > 200) || benefits.length > 20) {
      const error = new Error('Each package benefit must be a string of at most 200 characters; packages may have up to 20 benefits.');
      error.status = 400;
      throw error;
    }
    if (!name || name.length > 80 || !description || description.length > 500 || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(maxSponsors) || maxSponsors < 1) {
      const error = new Error('Each sponsorship package needs a name, description, positive amount, and positive sponsor limit.');
      error.status = 400;
      throw error;
    }
    if (item._id && !mongoose.isValidObjectId(item._id)) {
      const error = new Error('Invalid sponsorship package ID.');
      error.status = 400;
      throw error;
    }
    if (item._id && packageIds.has(item._id.toString())) {
      const error = new Error('Sponsorship package IDs must be unique within an event.');
      error.status = 400;
      throw error;
    }
    if (item._id) packageIds.add(item._id.toString());
    return {
      ...(item._id ? { _id: item._id } : {}),
      name,
      description,
      amount,
      maxSponsors,
      benefits,
      isActive: item.isActive !== false && item.isActive !== 'false',
    };
  });

  if (enabled && !cleanPackages.some((item) => item.isActive)) {
    const error = new Error('Enable at least one sponsorship package when sponsorship is active.');
    error.status = 400;
    throw error;
  }

  return { sponsorshipEnabled: enabled, sponsorshipPackages: cleanPackages };
}

export const createEvent = async (req, res) => {
  try {
    const posterUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const { sponsorshipEnabled, sponsorshipPackages, ...eventData } = req.body;
    const sponsorshipSettings = parseSponsorshipSettings({ sponsorshipEnabled, sponsorshipPackages });
    const eventFields = ['title', 'description', 'date', 'location', 'capacity', 'tags'];
    const cleanEventData = Object.fromEntries(eventFields.filter((field) => eventData[field] !== undefined).map((field) => [field, eventData[field]]));
    const participantLimit = parseParticipantLimit(eventData.participantLimit);
    const event = await Event.create({ ...cleanEventData, participantLimit, category: 'Tech', status: 'approved', ...sponsorshipSettings, organizer: req.user.id, posterUrl });
    res.status(201).json({ event });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid event ID' });
    const posterUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const { sponsorshipEnabled, sponsorshipPackages, ...eventData } = req.body;
    const eventFields = ['title', 'description', 'date', 'location', 'capacity', 'tags'];
    const update = Object.fromEntries(eventFields.filter((field) => eventData[field] !== undefined).map((field) => [field, eventData[field]]));
    const participantLimit = parseParticipantLimit(eventData.participantLimit);
    if (participantLimit !== undefined) update.participantLimit = participantLimit;
    Object.assign(update, parseSponsorshipSettings({ sponsorshipEnabled, sponsorshipPackages }));
    if (posterUrl) update.posterUrl = posterUrl;
    const event = await Event.findOneAndUpdate({ _id: req.params.id, organizer: req.user.id }, update, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, organizer: req.user.id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listEvents = async (req, res) => {
  try {
    const { q, category, status, organizer } = req.query;
    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (req.user?.role === 'admin') {
      if (status) filter.status = status;
      if (organizer) {
        if (!mongoose.isValidObjectId(organizer)) return res.status(400).json({ message: 'Invalid organizer ID.' });
        filter.organizer = organizer;
      }
    } else if (req.user?.role === 'organizer' && organizer) {
      filter.organizer = req.user.id;
    }
    const events = await Event.find(filter).populate('organizer', 'name').sort({ date: 1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name');
    if (!event) return res.status(404).json({ message: 'Not found' });
    const count = await Registration.countDocuments({ event: event._id, status: { $in: ['accepted', 'attended', 'registered'] } });
    res.json({ event, registrations: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
