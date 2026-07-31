import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex h-full gap-4 p-6">
      <Skeleton className="h-[32rem] w-72 shrink-0 rounded-xl" />
      <Skeleton className="h-[32rem] flex-1 rounded-xl" />
    </div>
  );
}
