export default function Loading() {
  return (
    <div className="p-6">
      <div className="h-7 w-64 bg-gray-100 rounded animate-pulse mb-8" />
      <div className="space-y-4">
        {[0, 1].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
}
