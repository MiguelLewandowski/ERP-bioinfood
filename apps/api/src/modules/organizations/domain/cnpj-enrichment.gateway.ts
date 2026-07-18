import { RegistrationStatus } from '@prisma/client';

export const CNPJ_ENRICHMENT_GATEWAY = 'CNPJ_ENRICHMENT_GATEWAY';

// Suggestion returned to the form. Never persisted directly (§2.B3 of the plan):
// the user reviews and edits before saving.
export interface EnrichmentResult {
  enriched: boolean;
  legalName?: string;
  tradeName?: string;
  registrationStatus?: RegistrationStatus;
  cnae?: string;
  // Descrição da atividade principal (CNAE) — sugestão para o campo "descrição"
  // da empresa (decisão 6 do crm-redesign-2026-07). Só os campos diretos da
  // BrasilAPI são puxados; setor/origem/categoria continuam manuais.
  description?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export interface ICnpjEnrichmentGateway {
  // Best-effort: any failure resolves to { enriched: false }, never throws.
  fetchByCnpj(cnpjDigits: string): Promise<EnrichmentResult>;
}
