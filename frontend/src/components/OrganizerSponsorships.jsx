import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import SponsorshipPackageEditor from './SponsorshipPackageEditor.jsx';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const emptyTotals = { pending: 0, approved: 0, rejected: 0, totalRequestedAmount: 0, totalApprovedAmount: 0 };

export default function OrganizerSponsorships({ events, notify, onEventsChanged }) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sponsorships, setSponsorships] = useState([]);
  const [totals, setTotals] = useState(emptyTotals);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedSponsorship, setSelectedSponsorship] = useState(null);
  const selectedEvent = useMemo(() => events.find((event) => event._id === selectedEventId), [events, selectedEventId]);

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId('');
      return;
    }
    if (!events.some((event) => event._id === selectedEventId)) setSelectedEventId(events[0]._id);
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) return;
    setEnabled(!!selectedEvent.sponsorshipEnabled);
    setPackages((selectedEvent.sponsorshipPackages || []).map((item) => ({
      ...item,
      benefits: item.benefits || [],
      isActive: item.isActive !== false,
    })));
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEventId) {
      setSponsorships([]);
      setTotals(emptyTotals);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    axios.get(`/api/organizer/events/${selectedEventId}/sponsors`)
      .then((response) => {
        if (!active) return;
        setSponsorships(response.data.sponsorships || []);
        setTotals({ ...emptyTotals, ...response.data.totals });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load sponsorship requests.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedEventId]);

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.put(`/api/events/${selectedEventId}`, { sponsorshipEnabled: enabled, sponsorshipPackages: packages });
      notify('success', 'Sponsorship settings saved.');
      await onEventsChanged();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save sponsorship settings.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(sponsorshipId, status) {
    setError('');
    try {
      await axios.patch(`/api/sponsorship/${sponsorshipId}/status`, { status });
      notify('success', `Sponsorship request ${status}.`);
      const response = await axios.get(`/api/organizer/events/${selectedEventId}/sponsors`);
      setSponsorships(response.data.sponsorships || []);
      setTotals({ ...emptyTotals, ...response.data.totals });
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${status} this request.`);
    }
  }

  if (!events.length) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">Organizer tools</p>
          <h2 className="mt-1 text-2xl font-bold">Sponsorships</h2>
        </div>
        <label className="w-full space-y-1 text-sm sm:max-w-sm">
          <span>Select event</span>
          <select className="input w-full" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
            {events.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}
          </select>
        </label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      {selectedEvent && (
        <form onSubmit={saveSettings} className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <h3 className="font-semibold">Sponsorship setup · {selectedEvent.title}</h3>
          <SponsorshipPackageEditor
            enabled={enabled}
            onEnabledChange={setEnabled}
            packages={packages}
            onPackagesChange={setPackages}
          />
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save sponsorship settings'}</button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ['Total requests', sponsorships.length],
          ['Pending', totals.pending],
          ['Approved', totals.approved],
          ['Rejected', totals.rejected],
          ['Total requested', currency.format(totals.totalRequestedAmount)],
          ['Total approved', currency.format(totals.totalApprovedAmount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Sponsor requests</h3>
        {loading ? (
          <div className="animate-pulse space-y-2" aria-label="Loading sponsorship requests">
            <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : sponsorships.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            No sponsorship requests for this event yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>{['Sponsor', 'Package', 'Amount', 'Date', 'Status', 'Action'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {sponsorships.map((item) => (
                  <tr key={item._id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-3">{item.companyName}<span className="block text-xs text-slate-500">{item.sponsor?.name || item.contactPerson}</span></td>
                    <td className="px-3 py-3">{item.packageName}</td>
                    <td className="px-3 py-3">{currency.format(item.amount)}</td>
                    <td className="px-3 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : item.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>{item.status}</span></td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-3">
                      <button type="button" className="text-emerald-700 underline dark:text-emerald-300" onClick={() => setSelectedSponsorship(item)}>View</button>
                      {item.status === 'pending' && <>
                        <button type="button" className="text-emerald-700 underline dark:text-emerald-300" onClick={() => changeStatus(item._id, 'approved')}>Approve</button>
                        <button type="button" className="text-rose-700 underline dark:text-rose-300" onClick={() => changeStatus(item._id, 'rejected')}>Reject</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSponsorship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setSelectedSponsorship(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="sponsor-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 id="sponsor-details-title" className="text-xl font-bold">{selectedSponsorship.companyName}</h3>
              <button type="button" className="text-2xl leading-none text-slate-500" aria-label="Close sponsor details" onClick={() => setSelectedSponsorship(null)}>×</button>
            </div>
            {selectedSponsorship.logoUrl && <img src={selectedSponsorship.logoUrl} alt={`${selectedSponsorship.companyName} logo`} className="mt-4 max-h-32 max-w-full object-contain" />}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold">Contact</dt><dd>{selectedSponsorship.contactPerson}</dd></div>
              <div><dt className="font-semibold">Email</dt><dd>{selectedSponsorship.email}</dd></div>
              <div><dt className="font-semibold">Phone</dt><dd>{selectedSponsorship.phone}</dd></div>
              <div><dt className="font-semibold">Website</dt><dd>{selectedSponsorship.website || 'Not provided'}</dd></div>
              <div><dt className="font-semibold">Package</dt><dd>{selectedSponsorship.packageName} · {currency.format(selectedSponsorship.amount)}</dd></div>
              <div><dt className="font-semibold">Status</dt><dd className="capitalize">{selectedSponsorship.status}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold">Message</dt><dd className="whitespace-pre-wrap">{selectedSponsorship.message || 'No message provided.'}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}
