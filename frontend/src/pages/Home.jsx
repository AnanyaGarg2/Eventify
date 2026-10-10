import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import useSocket from '../hooks/useSocket.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [recs, setRecs] = useState([]);
  const [dash, setDash] = useState({ upcomingByMonth: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const { announcements } = useSocket(window.location.origin);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (user) fetchRecs();
    else setRecs([]);
  }, [user]);

  async function fetchEvents(query = q) {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/events', { params: query ? { q: query } : {} });
      setEvents(res.data.events || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load events. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecs() {
    try {
      const res = await axios.get('/api/stats/recommendations');
      setRecs(res.data.events || []);
    } catch (requestError) {
      console.error('Unable to load recommended events:', requestError);
    }
  }

  async function fetchDashboard() {
    try {
      const r = await axios.get('/api/stats/dashboard');
      setDash({
        upcomingByMonth: r.data?.upcomingByMonth || [],
      });
    } catch (requestError) {
      console.error('Unable to load event statistics:', requestError);
    }
  }

  const Badge = ({ status }) => (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${status==='approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status==='pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{status}</span>
  );

  const Card = ({ e }) => (
    <Link to={`/events/${e._id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="relative">
        <img
          src={e.posterUrl || '/placeholder.svg'}
          alt={`${e.title} event banner`}
          className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          onError={(ev)=>{ ev.currentTarget.onerror=null; ev.currentTarget.src='/placeholder.svg'; }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
        <div className="absolute left-4 top-4"><Badge status={e.status} /></div>
        {e.sponsorshipEnabled && <span className="absolute right-4 top-4 rounded-full border border-white/30 bg-slate-950/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">Sponsor welcome</span>}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Tech community</p>
          <h3 className="mt-1 text-xl font-bold leading-tight">{e.title}</h3>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{e.description}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>◷ {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="max-w-[55%] truncate">⌖ {e.location}</span>
          <span className="font-semibold text-amber-600">★ {e.averageRating?.toFixed?.(1) || '0.0'}</span>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Explore event <span className="transition group-hover:translate-x-1">→</span></span>
      </div>
    </Link>
  );

  const Skeleton = () => (
    <div className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="w-full h-44 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 w-3/4 rounded" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 w-full rounded" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 w-1/2 rounded" />
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-6">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.34),_transparent_45%),radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.24),_transparent_42%)]" />
        <div className="absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full border border-emerald-300/20" />
        <div className="absolute -right-8 -top-12 -z-10 h-56 w-56 rounded-full border border-cyan-300/20" />
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.17em] text-emerald-200">Ideas meet engineering</span>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">Build what’s next.<br /><span className="text-emerald-300">Meet the people</span> making it happen.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Find hands-on tech events, workshops, and meetups. Learn together, share ideas, and connect with your next collaborator.</p>
          <form className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-2 backdrop-blur sm:flex-row" onSubmit={(event) => { event.preventDefault(); fetchEvents(); }}>
            <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
              <span aria-hidden="true" className="text-xl text-emerald-200">⌕</span>
              <input className="w-full bg-transparent py-2 text-white outline-none placeholder:text-slate-300" placeholder="Search tech events, workshops, and meetups" value={q} onChange={(event) => setQ(event.target.value)} />
            </label>
            <button className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400" type="submit">Find an event <span aria-hidden="true">→</span></button>
          </form>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            <span>✓ Learn by doing</span><span>✓ Meet your community</span><span>✓ Turn ideas into projects</span>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>
      )}
      {announcements.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="mb-2 flex items-center gap-2 font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live announcements</div>
          <ul className="space-y-1 pl-5 text-sm text-emerald-800 dark:text-emerald-200">
            {announcements.slice(0,3).map((a, i) => (
              <li key={i}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* {recs.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Picked for you</p><h2 className="mt-1 text-2xl font-bold">Your next great idea starts here</h2></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recs.map((e) => <Card key={e._id} e={e} />)}
          </div>
        </section>
      )} */}

      {/* All events */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Curated for curious minds</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{q ? 'Search results' : 'Explore upcoming events'}</h2></div>
          <span className="text-sm text-slate-500 dark:text-slate-400">{loading ? 'Finding events…' : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_,i)=><Skeleton key={i} />)}</div>
        ) : events.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{events.map((e) => <Card key={e._id} e={e} />)}</div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="text-4xl">⌕</div><h3 className="mt-3 text-lg font-bold">No events found</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try another search or check back soon for new tech events.</p>
            {q && <button className="btn mt-4" onClick={() => { setQ(''); fetchEvents(''); }}>Show all events</button>}
          </div>
        )}
      </section>

      {/* {dash.upcomingByMonth.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700 dark:text-emerald-300">Plan ahead</p><h2 className="mt-1 text-2xl font-bold">A calendar full of possibilities</h2></div>
            <span className="text-sm text-slate-500">Upcoming events by month</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {dash.upcomingByMonth.map((m) => (
                  <div key={m._id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{new Date(`${m._id}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long' })}</div>
                    <div className="mt-1 text-2xl font-bold">{m.count}</div>
                    <div className="text-xs text-slate-500">{m.count === 1 ? 'event' : 'events'}</div>
                  </div>
                ))}
          </div>
        </section>
      )} */}
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => { (async () => { const r = await axios.get('/api/stats/leaderboard'); setRows(r.data.leaderboard || []); })(); }, []);
  return (
    <ul className="space-y-2">
      {rows.map((r, idx) => (
        <li key={r._id || idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-3"><span className="w-6 text-center font-semibold">{idx+1}</span><span>{r.name}</span></div>
          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{r.points} pts</span>
        </li>
      ))}
    </ul>
  );
}
