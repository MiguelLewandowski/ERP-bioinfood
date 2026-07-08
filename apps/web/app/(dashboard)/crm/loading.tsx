export default function Loading() {
  return (
    <div className="p-6">
      <div className="h-7 w-72 bg-gray-100 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
