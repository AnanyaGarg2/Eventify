import User from '../models/User.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';

export const leaderboard = async (req, res) => {
  try {
    const top = await User.find({ role: { $in: ['customer', 'organizer'] }, isBlocked: false })
      .sort({ points: -1 })
      .limit(10)
      .select('name points');
    res.json({ leaderboard: top });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const recommendations = async (req, res) => {
  try {
    const events = await Event.find({ date: { $gte: new Date() }, status: 'approved' }).sort({ date: 1 }).limit(6);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Quick counts for cards on the home page
export const summary = async (_req, res) => {
  try {
    const [totalEvents, approvedEvents, upcomingEvents, totalRegistrations, totalCustomers, totalOrganizers] = await Promise.all([
      Event.countDocuments({}),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'approved', date: { $gte: new Date() } }),
      Registration.countDocuments({}),
      User.countDocuments({ role: 'customer', isBlocked: false }),
      User.countDocuments({ role: 'organizer', isBlocked: false }),
    ]);

    res.json({
      totals: {
        events: totalEvents,
        approvedEvents,
        upcomingEvents,
        registrations: totalRegistrations,
        customers: totalCustomers,
        organizers: totalOrganizers,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Popular/trending events
export const trending = async (_req, res) => {
  try {
    // Popular by registrations
    const popularAgg = await Registration.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
    const popularIds = popularAgg.map(p => p._id).filter(Boolean);
    const popular = await Event.find({ _id: { $in: popularIds } }).lean();
    // Preserve order of popularity
    const popularityMap = new Map(popularAgg.map(p => [String(p._id), p.count]));
    const popularOrdered = popular
      .map(e => ({ ...e, registrations: popularityMap.get(String(e._id)) || 0 }))
      .sort((a,b) => (b.registrations - a.registrations));

    // Top rated events
    const topRated = await Event.find({ status: 'approved' })
      .sort({ averageRating: -1 })
      .limit(6)
      .lean();

    // Recently added approved events
    const recent = await Event.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({ popular: popularOrdered, topRated, recent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upcoming event counts grouped by month
export const dashboardStats = async (_req, res) => {
  try {
    const upcomingByMonth = await Event.aggregate([
      { $match: { status: 'approved', date: { $gte: new Date() } } },
      { $project: { ym: { $dateToString: { format: '%Y-%m', date: '$date' } } } },
      { $group: { _id: '$ym', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);

    res.json({ upcomingByMonth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

