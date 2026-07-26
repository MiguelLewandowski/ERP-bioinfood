import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistrationStatus } from '@prisma/client';
import { BrasilApiEnrichmentGateway } from './brasilapi-enrichment.gateway';

// Resposta real da BrasilAPI, reduzida aos campos que o gateway lê.
const BANCO_DO_BRASIL = {
  razao_social: 'BANCO DO BRASIL SA',
  nome_fantasia: 'DIRECAO GERAL',
  descricao_situacao_cadastral: 'ATIVA',
  cnae_fiscal: 6422100,
  cnae_fiscal_descricao: 'Bancos múltiplos, com carteira comercial',
  logradouro: 'SAUN QUADRA 5 BLOCO B',
  numero: 'SN',
  complemento: 'ANDAR T I',
  bairro: 'ASA NORTE',
  municipio: 'BRASILIA',
  uf: 'DF',
  cep: '70040912',
};

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('BrasilApiEnrichmentGateway', () => {
  let gateway: BrasilApiEnrichmentGateway;

  beforeEach(() => {
    gateway = new BrasilApiEnrichmentGateway();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should send a User-Agent header when calling BrasilAPI', async () => {
    // Regressão: sem User-Agent a borda da BrasilAPI responde 403 e toda
    // consulta de CNPJ falhava em silêncio. O fetch do Node não manda um sozinho.
    const fetchMock = mockFetch(200, BANCO_DO_BRASIL);

    await gateway.fetchByCnpj('00000000000191');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['User-Agent']).toBeTruthy();
  });

  it('should map the BrasilAPI payload to an enrichment result', async () => {
    mockFetch(200, BANCO_DO_BRASIL);

    const result = await gateway.fetchByCnpj('00000000000191');

    expect(result).toEqual({
      enriched: true,
      legalName: 'BANCO DO BRASIL SA',
      tradeName: 'DIRECAO GERAL',
      registrationStatus: RegistrationStatus.ACTIVE,
      cnae: '6422100',
      description: 'Bancos múltiplos, com carteira comercial',
      address: {
        street: 'SAUN QUADRA 5 BLOCO B',
        number: 'SN',
        complement: 'ANDAR T I',
        district: 'ASA NORTE',
        city: 'BRASILIA',
        state: 'DF',
        zipCode: '70040912',
      },
    });
  });

  it('should translate each known situacao cadastral to its enum', async () => {
    const casos: Array<[string, RegistrationStatus]> = [
      ['ATIVA', RegistrationStatus.ACTIVE],
      ['SUSPENSA', RegistrationStatus.SUSPENDED],
      ['INAPTA', RegistrationStatus.INACTIVE],
      ['BAIXADA', RegistrationStatus.CLOSED],
      ['NULA', RegistrationStatus.VOID],
    ];

    for (const [situacao, esperado] of casos) {
      mockFetch(200, { ...BANCO_DO_BRASIL, descricao_situacao_cadastral: situacao });

      const result = await gateway.fetchByCnpj('00000000000191');

      expect(result.registrationStatus).toBe(esperado);
    }
  });

  it('should fall back to UNKNOWN when the situacao is unrecognized', async () => {
    mockFetch(200, { ...BANCO_DO_BRASIL, descricao_situacao_cadastral: 'SITUACAO NOVA' });

    const result = await gateway.fetchByCnpj('00000000000191');

    expect(result.registrationStatus).toBe(RegistrationStatus.UNKNOWN);
  });

  it('should report not enriched when BrasilAPI rejects the request', async () => {
    mockFetch(403, {});

    const result = await gateway.fetchByCnpj('00000000000191');

    expect(result).toEqual({ enriched: false });
  });

  it('should report not enriched without calling the API when the CNPJ is not 14 digits', async () => {
    const fetchMock = mockFetch(200, BANCO_DO_BRASIL);

    const result = await gateway.fetchByCnpj('123');

    expect(result).toEqual({ enriched: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should report not enriched when the request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede fora')));

    const result = await gateway.fetchByCnpj('00000000000191');

    expect(result).toEqual({ enriched: false });
  });
});
