// Normaliza erros da API (e outros) em mensagens amigáveis para o usuário final.
// Ponto único de tradução — nenhum componente deve reimplementar esse parsing.

export class ApiError extends Error {
  status?: number;
  messages: string[];

  constructor(messages: string[], status?: number) {
    super(messages[0] ?? 'Erro na requisição');
    this.name = 'ApiError';
    this.messages = messages;
    this.status = status;
  }
}

// Rótulos amigáveis para os campos mais comuns retornados pelo backend (class-validator).
const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  name: 'Nome',
  description: 'Descrição',
  status: 'Status',
  priority: 'Prioridade',
  startDate: 'Data de início',
  dueDate: 'Prazo',
  endDate: 'Data de término',
  date: 'Data',
  storyPoints: 'Story points',
  assigneeId: 'Responsável',
  parentId: 'Tarefa pai',
  wbsNodeId: 'Item da EAP',
  email: 'E-mail',
  password: 'Senha',
  clientId: 'Cliente',
  legalName: 'Razão social',
  tradeName: 'Nome fantasia',
  objective: 'Objetivo',
  probability: 'Probabilidade',
  impact: 'Impacto',
  response: 'Resposta',
  predecessorId: 'Predecessora',
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

// Padrões de mensagens técnicas do class-validator (formato "$campo <regra>")
// traduzidos para frases amigáveis em português.
const RULE_PATTERNS: Array<[RegExp, (field: string) => string]> = [
  [/^(\w+) must be a valid ISO 8601 date string$/, (f) => `${fieldLabel(f)} deve ser uma data válida`],
  [/^(\w+) should not be empty$/, (f) => `${fieldLabel(f)} é obrigatório`],
  [/^(\w+) must be a string$/, (f) => `${fieldLabel(f)} é inválido`],
  [/^(\w+) must be an email$/, (f) => `${fieldLabel(f)} deve ser um e-mail válido`],
  [/^(\w+) must be a number.*$/, (f) => `${fieldLabel(f)} deve ser um número`],
  [/^(\w+) must be an integer number$/, (f) => `${fieldLabel(f)} deve ser um número inteiro`],
  [/^(\w+) must be longer than or equal to \d+ characters$/, (f) => `${fieldLabel(f)} está muito curto`],
  [/^(\w+) must be shorter than or equal to \d+ characters$/, (f) => `${fieldLabel(f)} está muito longo`],
  [/^(\w+) must not be greater than .+$/, (f) => `${fieldLabel(f)} está acima do limite permitido`],
  [/^(\w+) must not be less than .+$/, (f) => `${fieldLabel(f)} está abaixo do mínimo permitido`],
  [/^(\w+) must be one of the following values.*$/, (f) => `${fieldLabel(f)} tem um valor inválido`],
];

// Traduz uma mensagem técnica; cai de volta pra mensagem original se não reconhecer o padrão.
function translateMessage(raw: string): string {
  for (const [pattern, build] of RULE_PATTERNS) {
    const match = raw.match(pattern);
    if (match) return build(match[1]);
  }
  return raw;
}

// Converte qualquer erro capturado num catch numa frase pronta pra exibir
// ao usuário (toast, banner inline etc.) — nunca expõe mensagens técnicas cruas.
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.messages.map(translateMessage).join(' ');
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
