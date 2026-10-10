export default function SponsorshipPackageEditor({ enabled, onEnabledChange, packages, onPackagesChange }) {
  function updatePackage(index, updates) {
    onPackagesChange(packages.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <label className="flex items-center gap-2 font-medium">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        Enable event sponsorship
      </label>
      {enabled && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">Packages are event-specific. Pending requests count toward each package's sponsor limit.</p>
          {packages.map((item, index) => (
            <fieldset key={item._id || index} className="grid gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold">{item.name || `Package ${index + 1}`}</legend>
              <label className="space-y-1 text-sm">
                <span>Name</span>
                <input className="input w-full" value={item.name} maxLength={80} required onChange={(event) => updatePackage(index, { name: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm">
                <span>Amount (₹)</span>
                <input className="input w-full" type="number" min="1" step="1" value={item.amount} required onChange={(event) => updatePackage(index, { amount: Number(event.target.value) })} />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span>Description</span>
                <input className="input w-full" value={item.description} maxLength={300} required onChange={(event) => updatePackage(index, { description: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm">
                <span>Maximum sponsors</span>
                <input className="input w-full" type="number" min="1" step="1" value={item.maxSponsors} required onChange={(event) => updatePackage(index, { maxSponsors: Number(event.target.value) })} />
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={item.isActive !== false} onChange={(event) => updatePackage(index, { isActive: event.target.checked })} />
                Available to sponsors
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span>Benefits (separate with commas)</span>
                <textarea
                  className="input w-full"
                  rows="2"
                  value={(item.benefits || []).join(', ')}
                  onChange={(event) => updatePackage(index, { benefits: event.target.value.split(',').map((benefit) => benefit.trim()).filter(Boolean) })}
                />
              </label>
              {packages.length > 1 && (
                <button type="button" className="btn-outline justify-self-start text-sm" onClick={() => onPackagesChange(packages.filter((_, itemIndex) => itemIndex !== index))}>
                  Remove package
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-outline"
            onClick={() => onPackagesChange([...packages, {
              name: '',
              description: '',
              amount: 10000,
              benefits: [],
              maxSponsors: 1,
              isActive: true,
            }])}
          >
            Add package
          </button>
        </div>
      )}
    </section>
  );
}
