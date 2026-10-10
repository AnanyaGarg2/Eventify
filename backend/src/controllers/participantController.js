import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';

const acceptedStatuses = ['accepted', 'attended', 'registered'];

async function initializeAcceptedCount(event) {
  if (event.acceptedParticipantCount !== undefined && event.acceptedParticipantCount !== null) return event;
  const acceptedCount = await Registration.countDocuments({ event: event._id, status: { $in: acceptedStatuses } });
  await Event.updateOne(
    { _id: event._id, acceptedParticipantCount: { $exists: false } },
    { $set: { acceptedParticipantCount: acceptedCount } }
  );
  return Event.findById(event._id).select('organizer participantLimit acceptedParticipantCount');
}

async function getOwnedEvent(eventId, userId) {
  if (!mongoose.isValidObjectId(eventId)) return { error: { status: 400, message: 'Invalid event ID.' } };
  const event = await Event.findById(eventId).select('organizer participantLimit acceptedParticipantCount');
  if (!event) return { error: { status: 404, message: 'Event not found.' } };
  if (event.organizer.toString() !== userId) return { error: { status: 403, message: 'You do not own this event.' } };
  return { event };
}

export const getEventParticipants = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const ownership = await getOwnedEvent(eventId, req.user.id);
    if (ownership.error) return res.status(ownership.error.status).json({ message: ownership.error.message });
    const { event } = ownership;
    const [participants, accepted, pending, rejected] = await Promise.all([
      Registration.find({ event: event._id }).populate('user', 'name email').sort({ createdAt: -1 }),
      Registration.countDocuments({ event: event._id, status: { $in: acceptedStatuses } }),
      Registration.countDocuments({ event: event._id, status: 'pending' }),
      Registration.countDocuments({ event: event._id, status: 'rejected' }),
    ]);
    res.json({
      participants,
      totals: {
        participantLimit: event.participantLimit ?? null,
        accepted,
        pending,
        rejected,
        remaining: event.participantLimit == null ? null : Math.max(0, event.participantLimit - accepted),
      },
    });
  } catch (err) {
    console.error('Unable to load event participants:', err);
    res.status(500).json({ message: 'Unable to load event participants.' });
  }
};

export const updateParticipantLimit = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const limit = req.body?.participantLimit;
    if (!mongoose.isValidObjectId(eventId)) return res.status(400).json({ message: 'Invalid event ID.' });
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1)) {
      return res.status(400).json({ message: 'Participant limit must be a positive whole number or null for unlimited.' });
    }
    const ownership = await getOwnedEvent(eventId, req.user.id);
    if (ownership.error) return res.status(ownership.error.status).json({ message: ownership.error.message });
    let event = await initializeAcceptedCount(ownership.event);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const filter = { _id: event._id, organizer: req.user.id };
    if (limit !== null) {
      filter.$expr = { $lte: [{ $ifNull: ['$acceptedParticipantCount', 0] }, limit] };
    }
    event = await Event.findOneAndUpdate(
      filter,
      { $set: { participantLimit: limit } },
      { new: true, runValidators: true }
    );
    if (!event) return res.status(409).json({ message: 'Participant limit cannot be lower than the number of accepted participants.' });
    res.json({ event: { _id: event._id, participantLimit: event.participantLimit } });
  } catch (err) {
    console.error('Unable to update participant limit:', err);
    res.status(500).json({ message: 'Unable to update participant limit.' });
  }
};

export const updateRegistrationStatus = async (req, res) => {
  let reservedEventId = null;
  try {
    const { registrationId } = req.params;
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(registrationId)) return res.status(400).json({ message: 'Invalid registration ID.' });
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be accepted or rejected.' });

    const registration = await Registration.findById(registrationId);
    if (!registration) return res.status(404).json({ message: 'Registration not found.' });
    const ownership = await getOwnedEvent(registration.event, req.user.id);
    if (ownership.error) return res.status(ownership.error.status).json({ message: ownership.error.message });
    if (registration.user.toString() === req.user.id) return res.status(403).json({ message: 'Participants cannot review their own registrations.' });
    if (registration.status !== 'pending') return res.status(409).json({ message: 'Only pending registrations can be reviewed.' });

    if (status === 'accepted') {
      const event = await initializeAcceptedCount(ownership.event);
      const reservation = await Event.findOneAndUpdate(
        {
          _id: event._id,
          $expr: {
            $or: [
              { $eq: [{ $ifNull: ['$participantLimit', null] }, null] },
              { $lt: [{ $ifNull: ['$acceptedParticipantCount', 0] }, '$participantLimit'] },
            ],
          },
        },
        { $inc: { acceptedParticipantCount: 1 } },
        { new: true }
      );
      if (!reservation) return res.status(409).json({ message: 'This event has reached its participant limit.' });
      reservedEventId = event._id;
    }

    const updatedRegistration = await Registration.findOneAndUpdate(
      { _id: registration._id, status: 'pending' },
      { $set: { status, reviewedAt: new Date(), reviewedBy: req.user.id } },
      { new: true, runValidators: true }
    );
    if (!updatedRegistration) {
      if (reservedEventId) await Event.updateOne({ _id: reservedEventId }, { $inc: { acceptedParticipantCount: -1 } });
      reservedEventId = null;
      return res.status(409).json({ message: 'This registration has already been reviewed.' });
    }
    reservedEventId = null;
    res.json({ registration: updatedRegistration });
  } catch (err) {
    if (reservedEventId) {
      await Event.updateOne({ _id: reservedEventId }, { $inc: { acceptedParticipantCount: -1 } });
    }
    console.error('Unable to update registration status:', err);
    res.status(500).json({ message: 'Unable to update registration status.' });
  }
};
