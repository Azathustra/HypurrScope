export default function CryptoTreasuriesLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-4 w-36 rounded-full bg-white/[0.06]" />
        <div className="mt-4 h-12 w-80 max-w-full rounded-full bg-white/[0.06]" />
        <div className="mt-4 h-5 w-[520px] max-w-full rounded-full bg-white/[0.04]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="premium-card rounded-[18px] p-5">
            <div className="h-4 w-24 rounded-full bg-white/[0.06]" />
            <div className="mt-6 h-8 w-32 rounded-full bg-white/[0.08]" />
            <div className="mt-3 h-4 w-40 rounded-full bg-white/[0.04]" />
          </div>
        ))}
      </div>

      <div className="premium-card overflow-hidden rounded-[20px]">
        <div className="border-b border-line p-5">
          <div className="h-6 w-52 rounded-full bg-white/[0.08]" />
          <div className="mt-3 h-4 w-72 rounded-full bg-white/[0.04]" />
          <div className="mt-6 flex gap-4">
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-8 w-24 rounded-full bg-white/[0.04]" />
          </div>
        </div>
        <div className="grid gap-6 border-b border-line p-5 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-64 rounded-[18px] border border-line bg-black/20" />
          ))}
        </div>
        <div className="p-5">
          <div className="h-8 w-48 rounded-full bg-white/[0.06]" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-12 rounded-xl bg-white/[0.035]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
