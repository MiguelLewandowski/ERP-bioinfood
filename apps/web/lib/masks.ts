// Máscaras de formatação para formulários (BR). Cada `mask*` recebe o valor
// bruto do input a cada tecla e devolve a string formatada — puro, sem
// depender de estado ou lib externa. `parseCurrencyBRL` é o único que precisa
// de conversão de volta (as demais são strings livres que o backend já
// normaliza ou aceita como estão).

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Digitação estilo caixa eletrônico: dígitos entram pela direita, viram centavos. */
export function maskCurrencyBRL(value: string): string {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, '').slice(0, 15);
  if (!digits) return '';
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centPart = cents.slice(-2);
  return `${intPart},${centPart}`;
}

/** Converte "1.234,56" (ou vazio) de volta para número — para enviar à API. */
export function parseCurrencyBRL(masked: string): number | undefined {
  const digits = onlyDigits(masked);
  if (!digits) return undefined;
  return Number(digits) / 100;
}

/** Número/string vindo do backend (ex.: "100000.00") → "100.000,00" para o defaultValue do form. */
export function formatCurrencyForInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Até 11 dígitos formata como CPF; a partir do 12º, vira CNPJ. */
export function maskDocument(value: string): string {
  return onlyDigits(value).length > 11 ? maskCNPJ(value) : maskCPF(value);
}

/** Fixo (10 dígitos) ou celular (11) — decide pelo que já foi digitado. */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/** Formato usual do código CNAE: 0000-0/00. */
export function maskCNAE(value: string): string {
  const d = onlyDigits(value).slice(0, 7);
  return d
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(\d{4}-\d)(\d{1,2})$/, '$1/$2');
}
