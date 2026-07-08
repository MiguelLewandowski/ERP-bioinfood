export interface CharterEntity {
  id: string;
  projectId: string;
  // Section 1
  projectType: string | null;
  priority: string | null;
  projectOwnerId: string | null;
  // Section 2
  problem: string | null;
  justification: string | null;
  assumptions: string | null;
  // Section 3
  mainObjective: string | null;
  specificObjectives: string | null;
  kpis: string | null;
  // Section 4
  scope: string | null;
  outOfScope: string | null;
  // Section 5
  deliverables: string | null;
  // Section 6
  resources: string | null;
  // Section 7 — stakeholders reais: ver ProjectStakeholder
  governance: string | null;
  // Section 8
  dependencies: string | null;
  constraints: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type UpsertCharterData = Partial<Omit<CharterEntity,
  'id' | 'projectId' | 'approvedById' | 'approvedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
>>;

// Quem fez a última alteração de conteúdo, derivado do AuditLog (nenhuma
// coluna nova no Charter — reusa a infra de auditoria já existente).
export interface CharterLastEdit {
  actor: { id: string; name: string } | null;
  at: Date;
}

export interface CharterWithMeta extends CharterEntity {
  lastEditedBy: { id: string; name: string } | null;
  lastEditedAt: Date | null;
}
