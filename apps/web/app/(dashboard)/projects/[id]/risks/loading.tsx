import { ListPageSkeleton } from '../_components/page-skeletons';

export default function Loading() {
  return <ListPageSkeleton stats={3} rows={10} />;
}
