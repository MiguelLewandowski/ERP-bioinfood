import { Injectable, Inject } from '@nestjs/common';
import {
  CNPJ_ENRICHMENT_GATEWAY, EnrichmentResult, ICnpjEnrichmentGateway,
} from '../domain/cnpj-enrichment.gateway';
import { normalizeDocument } from '../domain/organization.entity';

@Injectable()
export class EnrichOrganizationUseCase {
  constructor(@Inject(CNPJ_ENRICHMENT_GATEWAY) private gateway: ICnpjEnrichmentGateway) {}

  // Never throws: an invalid CNPJ or an API failure returns { enriched: false }
  // so the form falls back to manual entry (decision 6).
  async execute(rawCnpj: string): Promise<EnrichmentResult> {
    const digits = normalizeDocument(rawCnpj);
    if (!digits || digits.length !== 14) return { enriched: false };
    return this.gateway.fetchByCnpj(digits);
  }
}
