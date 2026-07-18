import { ActivitiesClient } from './_components/activities-client';

export default function ActivitiesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Atividades de todos os projetos, organizadas por dia
        </p>
      </div>
      <ActivitiesClient />
    </div>
  );
}
