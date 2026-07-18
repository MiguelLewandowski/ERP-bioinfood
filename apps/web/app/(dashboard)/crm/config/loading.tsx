import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6">
      <Skeleton className="mb-8 h-7 w-64" />
      <div className="space-y-4">
        {[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  );
}
