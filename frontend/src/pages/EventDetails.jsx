import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

export default function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [toast, setToast] = useState({ open: false, type: 'info', message: '' });

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
    setTimeout(() => setToast({ open: false, type: 'info', message: '' }), 5000);
  };

  useEffect(() => {
    load();
  }, [id, user]);

  async function load() {
    try {
      const [eventResponse, reviewResponse, registrationsResponse] = await Promise.all([
        axios.get(`/api/events/${id}`),
        axios.get(`/api/reviews/${id}`),
        user ? axios.get('/api/users/me/events') : Promise.resolve({ data: { registrations: [] } }),
      ]);
      setEvent(eventResponse.data.event);
      setReviews(reviewResponse.data.reviews || []);
      const myRegistrations = registrationsResponse.data.registrations || [];
      setMyRegistration(myRegistrations.find((registration) => registration.event?._id === id) || null);
      const userReview = reviewResponse.data.reviews?.find((review) => review.user?._id === user?.id);
      setHasReviewed(!!userReview);
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to load event details.');
    }
  }

  async function register() {
    try {
      const response = await axios.post(`/api/events/${id}/register`);
      setMyRegistration(response.data.registration);
      showToast('success', 'Registration request submitted. Waiting for organizer approval.');
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to submit your registration.');
    }
  }

  function shareEvent() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(url); alert('Event link copied!');
    }
  }

  function downloadIcs() {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CampusEvents//EN\nBEGIN:VEVENT\nUID:${event._id}@campus\nDTSTAMP:${start.toISOString().replace(/[-:]/g,'').split('.')[0]}Z\nDTSTART:${start.toISOString().replace(/[-:]/g,'').split('.')[0]}Z\nDTEND:${end.toISOString().replace(/[-:]/g,'').split('.')[0]}Z\nSUMMARY:${event.title}\nDESCRIPTION:${event.description}\nLOCATION:${event.location}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${event.title}.ics`; a.click(); URL.revokeObjectURL(url);
  }

  async function submitReview() {
    try {
      console.log('Submitting review:', { rating, comment, eventId: id, user: user?.id });
      console.log('Auth token:', axios.defaults.headers.common.Authorization);
      
      const response = await axios.post(`/api/reviews/${id}`, { rating, comment });
      console.log('Review submitted successfully:', response.data);
      showToast('success', 'Review posted successfully!');
      setComment('');
      await load();
    } catch (error) {
      console.error('Review submission error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        showToast('warning', 'Please log in to post a review.');
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('reviewed')) {
        showToast('info', 'You have already reviewed this event.');
      } else {
        showToast('error', `Failed to post review: ${error.response?.data?.message || 'Please try again.'}`);
      }
    }
  }

  if (!event) return <div className="animate-pulse space-y-4" aria-label="Loading event details"><div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="h-12 w-2/3 rounded bg-slate-200 dark:bg-slate-800" /><div className="h-24 rounded bg-slate-100 dark:bg-slate-900" /></div>;

  const registrationStatus = ['registered', 'attended'].includes(myRegistration?.status)
    ? 'accepted'
    : myRegistration?.status === 'cancelled' ? 'rejected' : myRegistration?.status;
  const registrationMessage = registrationStatus === 'pending'
    ? 'Pending — Waiting for approval'
    : registrationStatus === 'accepted'
      ? 'Accepted — You are registered'
      : registrationStatus === 'rejected' ? 'Rejected — Registration rejected' : '';

  return (
    <div className="space-y-8 pb-6">
      {/* Toast */}
      {toast.open && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type==='success'?'bg-green-600':toast.type==='warning'?'bg-yellow-600':toast.type==='error'?'bg-red-600':'bg-blue-600'}`}>
          <div className="flex items-start gap-3">
            <span className="font-semibold capitalize">{toast.type}</span>
            <span className="opacity-90">{toast.message}</span>
            <button className="ml-4 opacity-80 hover:opacity-100" onClick={()=>setToast({ ...toast, open:false })}>×</button>
          </div>
        </div>
      )}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
        <img src={event.posterUrl || '/placeholder.svg'} alt={`${event.title} event banner`} className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50" onError={(image) => { image.currentTarget.src = '/placeholder.svg'; }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
        <div className="max-w-3xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.17em] text-emerald-200">Tech community event</span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{event.title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-200">{event.description}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-200">
            <span>◷ {new Date(event.date).toLocaleString()}</span><span>⌖ {event.location}</span><span>Hosted by {event.organizer?.name || 'Event organizer'}</span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {myRegistration ? (
              <span role="status" className={`rounded-xl px-5 py-3 font-semibold ${registrationStatus === 'accepted' ? 'bg-emerald-400 text-slate-950' : registrationStatus === 'rejected' ? 'bg-rose-400 text-slate-950' : 'bg-amber-300 text-slate-950'}`}>{registrationMessage}</span>
            ) : (
              <button className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50" onClick={register} disabled={!user}>Register for free <span aria-hidden="true">→</span></button>
            )}
            {event.sponsorshipEnabled && <Link className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20" to={`/events/${event._id}/sponsor`}>Sponsor Event</Link>}
            <button className="rounded-xl border border-white/30 px-4 py-3 font-semibold text-white transition hover:bg-white/10" onClick={shareEvent}>Share</button>
            <button className="rounded-xl border border-white/30 px-4 py-3 font-semibold text-white transition hover:bg-white/10" onClick={downloadIcs}>Add to calendar</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Community voices</p><h2 className="mt-1 text-2xl font-bold">Event reviews</h2></div>
          <span className="text-sm text-amber-600">★ {event.averageRating?.toFixed?.(1) || '0.0'} average</span>
        </div>
        {user && !hasReviewed && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <select aria-label="Review rating" className="input sm:w-32" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input className="input min-w-0 flex-1" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience with this event" />
            <button className="btn" onClick={submitReview} disabled={!comment.trim()}>Post review</button>
          </div>
        )}

        {user && hasReviewed && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/30">
            <p className="text-sm text-green-800 dark:text-green-200">You have already reviewed this event. Thanks for sharing your experience.</p>
          </div>
        )}
        {reviews.length ? <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-3"><div className="font-semibold">{r.user?.name || 'Event attendee'}</div><div className="text-amber-600">★ {r.rating}</div></div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{r.comment}</p>
            </li>
          ))}
        </ul> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No reviews yet. Be the first to share what you think.</div>}
      </section>
    </div>
  );
}
