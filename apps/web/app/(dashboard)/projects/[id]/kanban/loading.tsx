import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6">
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
