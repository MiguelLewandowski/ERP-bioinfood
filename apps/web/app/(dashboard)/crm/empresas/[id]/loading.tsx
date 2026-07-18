export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="h-7 w-64 bg-gray-100 rounded animate-pulse mb-8" />
      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
