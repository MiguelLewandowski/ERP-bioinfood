export default function Loading() {
  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white py-4 px-2 space-y-1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </aside>
      <div className="flex-1 px-8 py-6">
        <div className="h-6 w-64 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="space-y-4 max-w-3xl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
