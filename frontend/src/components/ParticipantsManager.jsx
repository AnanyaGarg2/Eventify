import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const filters = ['all', 'pending', 'accepted', 'rejected'];
const emptyTotals = { participantLimit: null, accepted: 0, pending: 0, rejected: 0, remaining: null };

function displayStatus(status) {
  if (status === 'registered' || status === 'attended') return 'accepted';
  if (status === 'cancelled') return 'rejected';
  return status;
}

export default function ParticipantsManager({ events, notify }) {
  const [eventId, setEventId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [totals, setTotals] = useState(emptyTotals);
  const [limitInput, setLimitInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const selectedEvent = useMemo(() => events.find((event) => event._id === eventId), [events, eventId]);

  useEffect(() => {
    if (!events.length) {
      setEventId('');
      return;
    }
    if (!events.some((event) => event._id === eventId)) setEventId(events[0]._id);
  }, [events, eventId]);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    setLoading(true);
    setError('');
    axios.get(`/api/events/${eventId}/participants`)
      .then((response) => {
        if (!active) return;
        setParticipants(response.data.participants || []);
        const nextTotals = { ...emptyTotals, ...response.data.totals };
        setTotals(nextTotals);
        setLimitInput(nextTotals.participantLimit ?? '');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load participants.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [eventId]);

  const visibleParticipants = useMemo(
    () => filter === 'all' ? participants : participants.filter((item) => displayStatus(item.status) === filter),
    [filter, participants]
  );

  async function refresh() {
    const response = await axios.get(`/api/events/${eventId}/participants`);
    setParticipants(response.data.participants || []);
    setTotals({ ...emptyTotals, ...response.data.totals });
    setLimitInput(response.data.totals?.participantLimit ?? '');
  }

  async function saveLimit(event) {
    event.preventDefault();
    setError('');
    const participantLimit = limitInput === '' ? null : Number(limitInput);
    if (participantLimit !== null && (!Number.isSafeInteger(participantLimit) || participantLimit < 1)) {
      setError('Enter a positive whole number, or leave the limit blank for unlimited participants.');
      return;
    }
    setSavingLimit(true);
    try {
      await axios.patch(`/api/events/${eventId}/participant-limit`, { participantLimit });
      await refresh();
      notify('success', participantLimit === null ? 'Participant limit removed.' : 'Participant limit updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update participant limit.');
    } finally {
      setSavingLimit(false);
    }
  }

  async function reviewRegistration(registrationId, status) {
    setError('');
    setUpdatingId(registrationId);
    try {
      await axios.patch(`/api/registrations/${registrationId}/status`, { status });
      await refresh();
      notify('success', `Participant ${status}.`);
      setSelectedParticipant(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${status} this registration.`);
    } finally {
      setUpdatingId('');
    }
  }

  if (!events.length) return null;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Registration desk</p>
          <h2 className="mt-1 text-2xl font-bold">Participants</h2>
        </div>
        <label className="w-full space-y-1 text-sm sm:max-w-sm">
          <span>Event</span>
          <select className="input w-full" value={eventId} onChange={(event) => setEventId(event.target.value)}>
            {events.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
          </select>
        </label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      {selectedEvent && (
        <form onSubmit={saveLimit} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm">
            <span>Participant limit <span className="text-slate-500">(leave blank for unlimited)</span></span>
            <input className="input w-full sm:max-w-xs" type="number" min="1" step="1" value={limitInput} onChange={(event) => setLimitInput(event.target.value)} placeholder="Unlimited" />
          </label>
          <button className="btn" type="submit" disabled={savingLimit}>{savingLimit ? 'Saving…' : 'Update limit'}</button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Limit', totals.participantLimit == null ? 'Unlimited' : totals.participantLimit],
          ['Accepted', totals.accepted],
          ['Pending', totals.pending],
          ['Remaining', totals.remaining == null ? 'Unlimited' : totals.remaining],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
            <div className="mt-1 text-2xl font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Registration requests</h3>
          <div className="flex flex-wrap gap-2" aria-label="Filter registrations">
            {filters.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === item ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2" aria-label="Loading participants">
            <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : visibleParticipants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
            {filter === 'all' ? 'No registration requests for this event yet.' : `No ${filter} registrations.`}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>{['Name', 'Email', 'Registration date', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {visibleParticipants.map((item) => {
                  const status = displayStatus(item.status);
                  return (
                    <tr key={item._id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-3 font-medium">{item.user?.name || 'Deleted user'}</td>
                      <td className="px-3 py-3">{item.user?.email || '—'}</td>
                      <td className="px-3 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>{status}</span></td>
                      <td className="space-x-3 whitespace-nowrap px-3 py-3">
                        <button type="button" className="font-semibold text-emerald-700 underline dark:text-emerald-300" onClick={() => setSelectedParticipant(item)}>View</button>
                        {status === 'pending' && <>
                          <button type="button" className="font-semibold text-emerald-700 underline disabled:opacity-50 dark:text-emerald-300" disabled={updatingId === item._id} onClick={() => reviewRegistration(item._id, 'accepted')}>Accept</button>
                          <button type="button" className="font-semibold text-rose-700 underline disabled:opacity-50 dark:text-rose-300" disabled={updatingId === item._id} onClick={() => reviewRegistration(item._id, 'rejected')}>Reject</button>
                        </>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setSelectedParticipant(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="participant-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">Registration details</p><h3 id="participant-title" className="mt-1 text-xl font-bold">{selectedParticipant.user?.name || 'Deleted user'}</h3></div>
              <button type="button" className="text-2xl leading-none text-slate-500" aria-label="Close participant details" onClick={() => setSelectedParticipant(null)}>×</button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div><dt className="font-semibold">Email</dt><dd>{selectedParticipant.user?.email || 'Not available'}</dd></div>
              <div><dt className="font-semibold">Registered</dt><dd>{new Date(selectedParticipant.createdAt).toLocaleString()}</dd></div>
              <div><dt className="font-semibold">Status</dt><dd className="capitalize">{displayStatus(selectedParticipant.status)}</dd></div>
              {selectedParticipant.reviewedAt && <div><dt className="font-semibold">Reviewed</dt><dd>{new Date(selectedParticipant.reviewedAt).toLocaleString()}{selectedParticipant.reviewedBy?.name ? ` by ${selectedParticipant.reviewedBy.name}` : ''}</dd></div>}
            </dl>
            {displayStatus(selectedParticipant.status) === 'pending' && (
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button type="button" className="btn-outline" disabled={updatingId === selectedParticipant._id} onClick={() => reviewRegistration(selectedParticipant._id, 'rejected')}>Reject</button>
                <button type="button" className="btn" disabled={updatingId === selectedParticipant._id} onClick={() => reviewRegistration(selectedParticipant._id, 'accepted')}>Accept</button>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
