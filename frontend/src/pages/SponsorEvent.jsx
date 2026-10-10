import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const emptyForm = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  packageId: '',
  message: '',
};

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function SponsorEvent() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    axios.get(`/api/events/${id}/sponsorship`)
      .then((response) => {
        if (active) setEvent(response.data.event);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this sponsorship page. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const selectedPackage = useMemo(
    () => event?.sponsorshipPackages?.find((item) => item._id === form.packageId),
    [event, form.packageId]
  );

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  function handleLogoChange(file) {
    setFieldErrors((current) => ({ ...current, logo: '' }));
    if (!file) {
      setLogo(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLogo(null);
      setFieldErrors((current) => ({ ...current, logo: 'Choose a JPG, PNG, or WebP image.' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogo(null);
      setFieldErrors((current) => ({ ...current, logo: 'Logo must be 2 MB or smaller.' }));
      return;
    }
    setLogo(file);
  }

  async function submit(eventForm) {
    eventForm.preventDefault();
    setError('');
    const errors = {};
    if (!form.companyName.trim()) errors.companyName = 'Company name is required.';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (!/^\+?[\d\s().-]{7,30}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';
    if (form.website && !/^https?:\/\/.+/i.test(form.website.trim())) errors.website = 'Enter a valid URL beginning with http:// or https://.';
    if (!selectedPackage) errors.packageId = 'Choose an available package.';
    if (fieldErrors.logo) errors.logo = fieldErrors.logo;
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value.trim()));
    if (logo) data.append('logo', logo);
    setSubmitting(true);
    try {
      await axios.post(`/api/events/${id}/sponsorship`, data);
      setSuccess(true);
      setForm(emptyForm);
      setLogo(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4" aria-label="Loading sponsorship details">
      <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-10 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>;
  }
  if (error && !event) {
    return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
      <h1 className="text-xl font-bold">Sponsorship unavailable</h1>
      <p className="mt-2">{error}</p>
      <Link className="btn-outline mt-4" to={`/events/${id}`}>Back to event</Link>
    </div>;
  }

  return (
    <div className="space-y-8">
      <Link to={`/events/${id}`} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">← Back to event</Link>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <img src={event.posterUrl || '/placeholder.svg'} alt={`${event.title} banner`} className="h-56 w-full object-cover sm:h-80" onError={(image) => { image.currentTarget.src = '/placeholder.svg'; }} />
        <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Event sponsorship</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{event.description}</p>
          </div>
          <dl className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div><dt className="inline font-semibold text-slate-800 dark:text-slate-100">Date: </dt><dd className="inline">{new Date(event.date).toLocaleString()}</dd></div>
            <div><dt className="inline font-semibold text-slate-800 dark:text-slate-100">Location: </dt><dd className="inline">{event.location}</dd></div>
            <div><dt className="inline font-semibold text-slate-800 dark:text-slate-100">Organizer: </dt><dd className="inline">{event.organizer?.name || 'Event organizer'}</dd></div>
          </dl>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-xl font-bold">Partner with us</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Put your brand in front of an engaged audience. Choose the package that fits your goals and submit a request for the organizer to review. No payment is collected on this page.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-xl font-bold">Sponsorship packages</h2>
            {event.sponsorshipPackages.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {event.sponsorshipPackages.map((item) => (
                  <button
                    type="button"
                    key={item._id}
                    onClick={() => updateField('packageId', item._id)}
                    disabled={item.remainingSponsors === 0}
                    className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${form.packageId === item._id ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' : 'border-slate-200 hover:border-emerald-300 dark:border-slate-700'}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-lg font-bold">{item.name}</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">{currency.format(item.amount)}</span>
                    </span>
                    <span className="mt-2 block text-sm text-slate-600 dark:text-slate-300">{item.description}</span>
                    <span className="mt-3 block text-xs text-slate-500">{item.remainingSponsors} sponsor{item.remainingSponsors === 1 ? '' : 's'} available</span>
                    {!!item.benefits?.length && <ul className="mt-3 space-y-1 text-sm">{item.benefits.map((benefit, index) => <li key={`${item._id}-${index}`}>✓ {benefit}</li>)}</ul>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No sponsorship packages are available right now.</p>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">Get involved</p>
            <h2 className="mt-1 text-2xl font-bold">Sponsorship request</h2>
          </div>
          {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Your request has been submitted. The event organizer will review it and update its status.</div>}
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['companyName', 'Company name', 'text'],
              ['contactPerson', 'Contact person', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone', 'tel'],
              ['website', 'Website (optional)', 'url'],
            ].map(([name, label, type]) => (
              <label key={name} className="space-y-1 text-sm">
                <span>{label}{name !== 'website' && <span className="text-rose-600"> *</span>}</span>
                <input
                  className="input w-full"
                  type={type}
                  value={form[name]}
                  required={name !== 'website'}
                  maxLength={name === 'companyName' ? 160 : name === 'contactPerson' ? 120 : name === 'email' ? 254 : name === 'phone' ? 30 : 2048}
                  onChange={(event) => updateField(name, event.target.value)}
                  aria-invalid={!!fieldErrors[name]}
                  aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
                />
                {fieldErrors[name] && <span id={`${name}-error`} className="block text-xs text-rose-600">{fieldErrors[name]}</span>}
              </label>
            ))}
            <label className="space-y-1 text-sm">
              <span>Package <span className="text-rose-600">*</span></span>
              <select className="input w-full" value={form.packageId} required onChange={(event) => updateField('packageId', event.target.value)}>
                <option value="">Choose a package</option>
                {event.sponsorshipPackages.map((item) => <option key={item._id} value={item._id} disabled={item.remainingSponsors === 0}>{item.name} — {currency.format(item.amount)}{item.remainingSponsors === 0 ? ' (Full)' : ''}</option>)}
              </select>
              {fieldErrors.packageId && <span className="block text-xs text-rose-600">{fieldErrors.packageId}</span>}
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Message (optional)</span>
              <textarea className="input w-full" rows="4" maxLength="2000" value={form.message} onChange={(event) => updateField('message', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Company logo (optional, JPG/PNG/WebP up to 2 MB)</span>
              <input className="input w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleLogoChange(event.target.files?.[0])} />
              {fieldErrors.logo && <span className="block text-xs text-rose-600">{fieldErrors.logo}</span>}
            </label>
          </div>
          {selectedPackage && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">Requested package amount: <strong>{currency.format(selectedPackage.amount)}</strong>. Payment will be arranged after organizer review.</p>}
          <button className="btn w-full sm:w-auto" type="submit" disabled={submitting || !event.sponsorshipPackages.some((item) => item.remainingSponsors > 0)}>
            {submitting ? 'Submitting…' : 'Sponsor This Event'}
          </button>
        </form>
      </section>
    </div>
  );
}
