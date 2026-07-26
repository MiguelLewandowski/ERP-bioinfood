import { ActivitiesClient } from './_components/activities-client';

export default function ActivitiesPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Atividades</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Atividades de todos os projetos, organizadas por dia
        </p>
      </div>
      <ActivitiesClient />
    </div>
  );
}
