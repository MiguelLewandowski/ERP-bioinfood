import { ActivitiesClient } from './_components/activities-client';

export default function ActivitiesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1B]">Atividades</h1>
        <p className="text-sm text-[#706F6F] mt-0.5">
          Atividades de todos os projetos, organizadas por dia
        </p>
      </div>
      <ActivitiesClient />
    </div>
  );
}
