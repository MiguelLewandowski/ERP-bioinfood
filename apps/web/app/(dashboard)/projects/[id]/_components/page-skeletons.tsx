import { Skeleton } from '@/components/ui/skeleton';

// Formas de carregamento das abas do projeto.
//
// As oito abas usavam o MESMO bloco `h-96`: um retângulo cinza que não antecipa
// nada e faz a página "pular" quando o conteúdo real chega. Concentrar as formas
// aqui resolve isso e, de quebra, é o que mantém a densidade consistente entre
// as telas — espaçamento igual sai de um lugar só, não de oito cópias.

function PageTitle({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1.5 h-3.5 w-56" />
      </div>
      {action && <Skeleton className="h-9 w-32 rounded-lg" />}
    </div>
  );
}

function StatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

function TableRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="h-10 rounded-none" />
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Backlog, Riscos, Partes Interessadas: título + números + tabela. */
export function ListPageSkeleton({ stats = 4, rows = 8 }: { stats?: number; rows?: number }) {
  return (
    <div className="p-6">
      <PageTitle />
      <StatRow count={stats} />
      <TableRows rows={rows} />
    </div>
  );
}

/** Kanban: colunas lado a lado. */
export function BoardSkeleton() {
  return (
    <div className="p-6">
      <PageTitle />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="rounded-xl border border-border bg-card p-3">
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, card) => (
                <Skeleton key={card} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * EAP: linhas de árvore com o bloco de rollup da Onda 1, que somou ~150px por
 * linha — reservar essa altura é o que impede o salto ao carregar.
 */
export function TreeSkeleton() {
  return (
    <div className="p-6">
      <PageTitle />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4" style={{ marginLeft: i % 3 === 0 ? 0 : 24 }}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Roadmap: marcos numa linha do tempo vertical. */
export function TimelineSkeleton() {
  return (
    <div className="p-6">
      <PageTitle />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Configurações: formulário num card. */
export function FormSkeleton() {
  return (
    <div className="p-6">
      <PageTitle action={false} />
      <div className="max-w-3xl rounded-xl border border-border bg-card p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <Skeleton className="mb-1.5 h-3 w-28" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Gantt: duas barras de controle + grade à esquerda e área do gráfico. */
export function GanttSkeleton() {
  return (
    // Mesma amarração de altura do Gantt real: sem ela o esqueleto tem tamanho
    // diferente do conteúdo e a página salta ao carregar.
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-7 w-64 rounded-lg" />
      </div>
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-56 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1 gap-px bg-border">
        <div className="w-[340px] shrink-0 bg-card p-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="mb-2.5 h-4" />
          ))}
        </div>
        <div className="flex-1 bg-card p-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-2.5 h-4 rounded-sm"
              style={{ width: `${25 + ((i * 13) % 45)}%`, marginLeft: `${(i * 7) % 35}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
