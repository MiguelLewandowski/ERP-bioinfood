import { Injectable, Logger } from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { EnrichmentResult, ICnpjEnrichmentGateway } from '../domain/cnpj-enrichment.gateway';

const BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const TIMEOUT_MS = 5000;

// A BrasilAPI está atrás de uma borda que responde 403 a requisição sem
// User-Agent — e o fetch do Node não manda nenhum por padrão. Sem este header a
// consulta falha sempre, silenciosamente, e o formulário cai no preenchimento
// manual sem dizer por quê (o mesmo curl na mão responde 200, o que torna o
// diagnóstico enganoso).
const HEADERS = {
  'User-Agent': 'bioinfood-erp',
  Accept: 'application/json',
};

// Maps BrasilAPI's "situacao cadastral" text to our enum. Unknown -> UNKNOWN.
const STATUS_MAP: Record<string, RegistrationStatus> = {
  ATIVA: RegistrationStatus.ACTIVE,
  SUSPENSA: RegistrationStatus.SUSPENDED,
  INAPTA: RegistrationStatus.INACTIVE,
  BAIXADA: RegistrationStatus.CLOSED,
  NULA: RegistrationStatus.VOID,
};

interface BrasilApiCnpj {
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

@Injectable()
export class BrasilApiEnrichmentGateway implements ICnpjEnrichmentGateway {
  private readonly logger = new Logger(BrasilApiEnrichmentGateway.name);

  async fetchByCnpj(cnpjDigits: string): Promise<EnrichmentResult> {
    if (cnpjDigits.length !== 14) return { enriched: false };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}/${cnpjDigits}`, {
        headers: HEADERS,
        signal: controller.signal,
      });
      if (!res.ok) {
        // Sem este log, uma mudança na borda da BrasilAPI (403, rate limit) vira
        // "não foi possível consultar" na tela e nada no servidor.
        this.logger.warn(`CNPJ enrichment: BrasilAPI respondeu ${res.status} para ${cnpjDigits}`);
        return { enriched: false };
      }
      return this.toResult((await res.json()) as BrasilApiCnpj);
    } catch (err) {
      // Best-effort: log and fall back to manual entry, never block the caller.
      this.logger.warn(`CNPJ enrichment failed for ${cnpjDigits}: ${(err as Error).message}`);
      return { enriched: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  private toResult(data: BrasilApiCnpj): EnrichmentResult {
    const situacao = data.descricao_situacao_cadastral?.toUpperCase() ?? '';
    return {
      enriched: true,
      legalName: data.razao_social || undefined,
      tradeName: data.nome_fantasia || undefined,
      registrationStatus: STATUS_MAP[situacao] ?? RegistrationStatus.UNKNOWN,
      cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
      description: data.cnae_fiscal_descricao || undefined,
      address: {
        street: data.logradouro || undefined,
        number: data.numero || undefined,
        complement: data.complemento || undefined,
        district: data.bairro || undefined,
        city: data.municipio || undefined,
        state: data.uf || undefined,
        zipCode: data.cep || undefined,
      },
    };
  }
}
