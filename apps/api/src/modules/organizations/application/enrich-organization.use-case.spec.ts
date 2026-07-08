import { describe, it, expect, vi } from 'vitest';
import { EnrichOrganizationUseCase } from './enrich-organization.use-case';
import { ICnpjEnrichmentGateway } from '../domain/cnpj-enrichment.gateway';

function makeUseCase(gateway: Partial<ICnpjEnrichmentGateway>) {
  return new EnrichOrganizationUseCase(gateway as ICnpjEnrichmentGateway);
}

describe('EnrichOrganizationUseCase', () => {
  it('should return the gateway result for a valid 14-digit CNPJ', async () => {
    const fetchByCnpj = vi.fn().mockResolvedValue({ enriched: true, legalName: 'Acme SA' });
    const useCase = makeUseCase({ fetchByCnpj });

    const result = await useCase.execute('11.222.333/0001-44');

    expect(fetchByCnpj).toHaveBeenCalledWith('11222333000144');
    expect(result.enriched).toBe(true);
  });

  it('should return enriched:false without calling the gateway for an invalid CNPJ', async () => {
    const fetchByCnpj = vi.fn();
    const useCase = makeUseCase({ fetchByCnpj });

    const result = await useCase.execute('123');

    expect(fetchByCnpj).not.toHaveBeenCalled();
    expect(result).toEqual({ enriched: false });
  });

  it('should return enriched:false when the gateway falls back (offline/timeout/404)', async () => {
    const fetchByCnpj = vi.fn().mockResolvedValue({ enriched: false });
    const useCase = makeUseCase({ fetchByCnpj });

    const result = await useCase.execute('11222333000144');

    expect(result.enriched).toBe(false);
  });
});
