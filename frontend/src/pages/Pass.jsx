import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Pass() {
  const [regs, setRegs] = useState([]);
  useEffect(() => { (async () => { const r = await axios.get('/api/users/me/events'); setRegs(r.data.registrations||[]); })(); }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">My Passes (offline-ready)</h1>
      <p className="text-sm text-slate-600">Open this page once online; passes will remain available offline.</p>
      <div className="grid md:grid-cols-2 gap-3">
        {regs.map(r => (
          <div key={r._id} className="card">
            <div className="font-semibold">{r.event?.title}</div>
            <div className="text-sm text-slate-500">{new Date(r.event?.date).toLocaleString()} • {r.event?.location}</div>
            {r.status === 'pending' && <div className="mt-2 text-sm font-medium text-amber-700">Pending — Waiting for approval</div>}
            {['accepted', 'registered', 'attended'].includes(r.status) && <>
              <div className="mt-2 text-sm font-medium text-emerald-700">Accepted — You are registered</div>
              {r.qrCodeDataUrl && <img src={r.qrCodeDataUrl} alt="QR" className="mt-2 h-40" />}
            </>}
            {['rejected', 'cancelled'].includes(r.status) && <div className="mt-2 text-sm font-medium text-rose-700">Rejected — Registration rejected</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

