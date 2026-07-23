// Projeto de demonstração — completo e "pronto para olhar".
//
// Existe para que dá para avaliar Gantt, EAP, roadmap, riscos, TAP e dashboard
// sem cadastrar nada à mão. É um P&D de 2 anos com o "hoje" caindo no meio da
// execução: 60% das tarefas concluídas, o piloto em andamento e o cronograma já
// com algum desvio — o estado em que um projeto real costuma estar.
//
// Idempotente: o projeto tem id fixo e é apagado (cascata) antes de ser recriado.
// Usuários, contatos, organização e POPs são upsert — sobrevivem entre execuções.

import {
  PrismaClient,
  SystemRole,
  ProjectStatus,
  PartyType,
  DocumentType,
  OrganizationStatus,
  PartyRoleType,
  CustomerStage,
  StakeholderType,
  TaskStatus,
  TaskPriority,
  TaskDependencyType,
  RiskProbability,
  RiskImpact,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const PROJECT_ID = 'proj-demo-ingredientes';

/**
 * Início do projeto. Todas as datas do seed são deslocamentos em dias a partir
 * daqui, então o cronograma inteiro é coerente ao mudar esta única data.
 */
const PROJECT_START = new Date('2025-07-01T00:00:00.000Z');

/** Dia 0 = início. O "hoje" da demo (2026-07-20) cai no dia 384 de 729. */
function day(offset: number): Date {
  return new Date(PROJECT_START.getTime() + offset * 24 * 60 * 60 * 1000);
}

const LAST_DAY = 729; // 2027-06-30

// ── Equipe interna (vira User: pode ser responsável por tarefa) ───────────────

const TEAM = [
  { key: 'marina',  name: 'Marina Alencar',      email: 'marina@bioinfood.com',  role: SystemRole.APROVA },
  { key: 'rafael',  name: 'Rafael Bittencourt',  email: 'rafael@bioinfood.com',  role: SystemRole.INSERE },
  { key: 'juliana', name: 'Juliana Prado',       email: 'juliana@bioinfood.com', role: SystemRole.INSERE },
  { key: 'thiago',  name: 'Thiago Nakamura',     email: 'thiago@bioinfood.com',  role: SystemRole.INSERE },
  { key: 'camila',  name: 'Camila Rezende',      email: 'camila@bioinfood.com',  role: SystemRole.INSERE },
] as const;

type TeamKey = (typeof TEAM)[number]['key'];

// ── EAP / WBS ────────────────────────────────────────────────────────────────

const WBS: Array<{ code: string; title: string; owner: string; readyCriteria?: string; outputs?: string }> = [
  { code: '1',   title: 'Gestão do Projeto',                owner: 'Marina Alencar' },
  { code: '1.1', title: 'Planejamento e Governança',        owner: 'Marina Alencar',     readyCriteria: 'TAP aprovado pelo patrocinador e linha de base congelada.', outputs: 'TAP aprovado, plano de comunicação, linha de base' },
  { code: '1.2', title: 'Monitoramento e Controle',         owner: 'Marina Alencar',     readyCriteria: 'Relatórios entregues no prazo e desvios com plano de ação registrado.', outputs: 'Relatórios de progresso, atas de revisão' },
  { code: '2',   title: 'Matéria-Prima',                    owner: 'Rafael Bittencourt' },
  { code: '2.1', title: 'Prospecção de Coprodutos',         owner: 'Rafael Bittencourt', readyCriteria: 'Ao menos 3 fornecedores qualificados com lote amostrado e rastreável.', outputs: 'Mapa de fornecedores, lotes amostrados' },
  { code: '2.2', title: 'Caracterização Físico-Química',    owner: 'Juliana Prado',      readyCriteria: 'Composição centesimal e perfil de fibras em triplicata, com desvio abaixo de 5%.', outputs: 'Laudos analíticos, relatório de caracterização' },
  { code: '3',   title: 'Desenvolvimento em Bancada',       owner: 'Rafael Bittencourt' },
  { code: '3.1', title: 'Rota Tecnológica',                 owner: 'Rafael Bittencourt', readyCriteria: 'Rota reproduzida 3 vezes por operadores diferentes com o mesmo rendimento.', outputs: 'Rota enzimática definida e reprodutível' },
  { code: '3.2', title: 'Otimização de Processo',           owner: 'Juliana Prado',      readyCriteria: 'Rendimento acima de 70% e extrato estável por 90 dias em prateleira.', outputs: 'Condições ótimas, modelo de rendimento, extrato estável' },
  { code: '4',   title: 'Escalonamento Piloto',             owner: 'Thiago Nakamura' },
  { code: '4.1', title: 'Infraestrutura Piloto',            owner: 'Thiago Nakamura',    readyCriteria: 'Planta comissionada, qualificação de instalação e operação assinadas.', outputs: 'Planta piloto comissionada e qualificada' },
  { code: '4.2', title: 'Lotes de Validação',               owner: 'Juliana Prado',      readyCriteria: '3 lotes consecutivos dentro da especificação e balanço de massa fechando em 95%.', outputs: '3 lotes reprodutíveis, balanço de massa, custo' },
  { code: '5',   title: 'Validação e Transferência',        owner: 'Camila Rezende' },
  { code: '5.1', title: 'Ensaios de Aplicação',             owner: 'Rafael Bittencourt', readyCriteria: 'Aprovação sensorial em painel treinado nas duas matrizes testadas.', outputs: 'Provas de conceito em panificação e bebida' },
  { code: '5.2', title: 'Regulatório e Propriedade Intelectual', owner: 'Camila Rezende', readyCriteria: 'Protocolo aceito pela ANVISA e pedido de patente com número de depósito.', outputs: 'Dossiê de segurança, protocolo ANVISA, pedido de patente' },
  { code: '5.3', title: 'Transferência Tecnológica',        owner: 'Thiago Nakamura',    readyCriteria: 'Equipe do cliente operando sozinha por um lote completo, com aceite assinado.', outputs: 'Manual de processo, equipe treinada, aceite formal' },
];

// ── Tarefas ──────────────────────────────────────────────────────────────────

interface TaskSpec {
  key: string;
  wbs: string;
  title: string;
  assignee: TeamKey;
  /** Dia de início REAL (o que aparece no Gantt hoje). */
  start: number;
  duration: number;
  status: TaskStatus;
  priority?: TaskPriority;
  points?: number;
  /** Dias que a tarefa escorregou em relação à linha de base. */
  slip?: number;
  deps?: string[];
  checklist?: Array<[string, boolean]>;
}

const TASKS: TaskSpec[] = [
  // ── 1.1 Planejamento e Governança ──
  { key: 'g-tap',   wbs: '1.1', title: 'Elaboração e aprovação do TAP', assignee: 'marina', start: 0, duration: 15, status: TaskStatus.DONE, priority: TaskPriority.CRITICAL, points: 5 },
  { key: 'g-gov',   wbs: '1.1', title: 'Plano de governança e comunicação', assignee: 'marina', start: 10, duration: 12, status: TaskStatus.DONE, points: 3, deps: ['g-tap'] },
  { key: 'g-risk',  wbs: '1.1', title: 'Matriz de riscos inicial', assignee: 'thiago', start: 15, duration: 12, status: TaskStatus.DONE, points: 3, deps: ['g-tap'] },
  { key: 'g-base',  wbs: '1.1', title: 'Congelamento da linha de base do cronograma', assignee: 'marina', start: 25, duration: 8, status: TaskStatus.DONE, priority: TaskPriority.HIGH, points: 2, deps: ['g-gov', 'g-risk'] },

  // ── 1.2 Monitoramento e Controle ──
  { key: 'g-rel1',  wbs: '1.2', title: 'Relatório de progresso — 1º semestre', assignee: 'marina', start: 150, duration: 12, status: TaskStatus.DONE, points: 3 },
  { key: 'g-rel2',  wbs: '1.2', title: 'Relatório de progresso — 2º semestre', assignee: 'marina', start: 330, duration: 12, status: TaskStatus.DONE, points: 3 },
  { key: 'g-mid',   wbs: '1.2', title: 'Revisão de meio de projeto com o cliente', assignee: 'marina', start: 355, duration: 25, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, points: 5, slip: 5,
    checklist: [['Consolidar indicadores de bancada', true], ['Fechar números do piloto', true], ['Revisar riscos com o sponsor', false], ['Repactuar cronograma da fase 4', false]] },
  { key: 'g-fim',   wbs: '1.2', title: 'Relatório final e lições aprendidas', assignee: 'marina', start: 700, duration: 40, status: TaskStatus.TODO, points: 8 },

  // ── 2.1 Prospecção de Coprodutos ──
  { key: 'p-map',   wbs: '2.1', title: 'Mapeamento de coprodutos agroindustriais da região', assignee: 'rafael', start: 5, duration: 30, status: TaskStatus.DONE, points: 8 },
  { key: 'p-forn',  wbs: '2.1', title: 'Qualificação de fornecedores de matéria-prima', assignee: 'rafael', start: 30, duration: 25, status: TaskStatus.DONE, points: 5, deps: ['p-map'] },
  { key: 'p-col',   wbs: '2.1', title: 'Coleta e amostragem de lotes representativos', assignee: 'juliana', start: 50, duration: 25, status: TaskStatus.DONE, points: 5, deps: ['p-forn'] },

  // ── 2.2 Caracterização Físico-Química ──
  { key: 'p-cent',  wbs: '2.2', title: 'Caracterização centesimal dos coprodutos', assignee: 'juliana', start: 70, duration: 25, status: TaskStatus.DONE, points: 8, deps: ['p-col'] },
  { key: 'p-carb',  wbs: '2.2', title: 'Perfil de carboidratos e fibras solúveis', assignee: 'juliana', start: 80, duration: 30, status: TaskStatus.DONE, points: 8, deps: ['p-col'] },
  { key: 'p-cont',  wbs: '2.2', title: 'Análise de contaminantes e micotoxinas', assignee: 'juliana', start: 90, duration: 25, status: TaskStatus.DONE, priority: TaskPriority.HIGH, points: 5, deps: ['p-col'] },
  { key: 'p-rel',   wbs: '2.2', title: 'Relatório consolidado de caracterização', assignee: 'rafael', start: 115, duration: 18, status: TaskStatus.DONE, points: 5, deps: ['p-cent', 'p-carb', 'p-cont'] },

  // ── 3.1 Rota Tecnológica ──
  { key: 'b-bib',   wbs: '3.1', title: 'Revisão bibliográfica de rotas enzimáticas', assignee: 'rafael', start: 90, duration: 25, status: TaskStatus.DONE, points: 5 },
  { key: 'b-tri',   wbs: '3.1', title: 'Triagem de enzimas comerciais', assignee: 'rafael', start: 120, duration: 40, status: TaskStatus.DONE, points: 13, deps: ['b-bib', 'p-rel'] },
  { key: 'b-hid',   wbs: '3.1', title: 'Ensaios de hidrólise em bancada', assignee: 'juliana', start: 155, duration: 45, status: TaskStatus.DONE, priority: TaskPriority.HIGH, points: 13, deps: ['b-tri'] },
  { key: 'b-rota',  wbs: '3.1', title: 'Definição da rota-base do processo', assignee: 'rafael', start: 200, duration: 15, status: TaskStatus.DONE, priority: TaskPriority.CRITICAL, points: 5, deps: ['b-hid'] },

  // ── 3.2 Otimização de Processo ──
  { key: 'b-doe1',  wbs: '3.2', title: 'DoE — temperatura e pH', assignee: 'juliana', start: 215, duration: 35, status: TaskStatus.DONE, points: 8, deps: ['b-rota'] },
  { key: 'b-doe2',  wbs: '3.2', title: 'DoE — carga enzimática e tempo de reação', assignee: 'juliana', start: 240, duration: 35, status: TaskStatus.DONE, points: 8, deps: ['b-rota'] },
  { key: 'b-model', wbs: '3.2', title: 'Modelagem estatística do rendimento', assignee: 'thiago', start: 275, duration: 25, status: TaskStatus.DONE, points: 8, deps: ['b-doe1', 'b-doe2'] },
  { key: 'b-pur',   wbs: '3.2', title: 'Purificação e concentração do extrato', assignee: 'rafael', start: 290, duration: 40, status: TaskStatus.DONE, points: 13, deps: ['b-model'] },
  { key: 'b-est',   wbs: '3.2', title: 'Estabilidade acelerada do ingrediente', assignee: 'juliana', start: 315, duration: 45, status: TaskStatus.DONE, points: 8, deps: ['b-pur'] },
  { key: 'b-rel',   wbs: '3.2', title: 'Relatório técnico de bancada', assignee: 'rafael', start: 350, duration: 20, status: TaskStatus.DONE, points: 5, deps: ['b-est', 'b-model'] },

  // ── 4.1 Infraestrutura Piloto ──
  { key: 'e-esp',   wbs: '4.1', title: 'Especificação de equipamentos do piloto', assignee: 'thiago', start: 300, duration: 30, status: TaskStatus.DONE, points: 8, deps: ['b-model'] },
  { key: 'e-aq',    wbs: '4.1', title: 'Aquisição e instalação do reator piloto', assignee: 'thiago', start: 325, duration: 55, status: TaskStatus.DONE, priority: TaskPriority.CRITICAL, points: 13, slip: 12, deps: ['e-esp'] },
  { key: 'e-com',   wbs: '4.1', title: 'Comissionamento da planta piloto', assignee: 'thiago', start: 335, duration: 40, status: TaskStatus.DONE, priority: TaskPriority.HIGH, points: 13, slip: 8, deps: ['e-aq'] },
  { key: 'e-iq',    wbs: '4.1', title: 'Qualificação de instalação e operação (IQ/OQ)', assignee: 'thiago', start: 350, duration: 32, status: TaskStatus.DONE, points: 8, deps: ['e-com'] },

  // ── 4.2 Lotes de Validação ──
  { key: 'e-l1',    wbs: '4.2', title: 'Lote piloto #1 — prova de conceito', assignee: 'juliana', start: 350, duration: 30, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.CRITICAL, points: 13, slip: 10, deps: ['e-com'],
    checklist: [['Preparar 200 kg de matéria-prima', true], ['Calibrar sondas de pH e temperatura', true], ['Rodar batelada completa', true], ['Coletar amostras de cada etapa', false], ['Fechar balanço de massa', false]] },
  { key: 'e-l2',    wbs: '4.2', title: 'Lote piloto #2 — reprodutibilidade', assignee: 'juliana', start: 385, duration: 25, status: TaskStatus.TODO, priority: TaskPriority.HIGH, points: 13, deps: ['e-l1'] },
  { key: 'e-l3',    wbs: '4.2', title: 'Lote piloto #3 — ajuste fino de rendimento', assignee: 'juliana', start: 415, duration: 25, status: TaskStatus.TODO, points: 13, deps: ['e-l2'] },
  { key: 'e-bal',   wbs: '4.2', title: 'Balanço de massa e energia do piloto', assignee: 'thiago', start: 430, duration: 30, status: TaskStatus.TODO, points: 8, deps: ['e-l2'] },
  { key: 'e-cost',  wbs: '4.2', title: 'Análise de custo de produção em escala', assignee: 'thiago', start: 460, duration: 28, status: TaskStatus.TODO, priority: TaskPriority.HIGH, points: 8, deps: ['e-bal', 'e-l3'] },

  // ── 5.1 Ensaios de Aplicação ──
  { key: 'v-prot',  wbs: '5.1', title: 'Protocolo de ensaios de aplicação', assignee: 'rafael', start: 370, duration: 25, status: TaskStatus.IN_PROGRESS, points: 5 },
  { key: 'v-pan',   wbs: '5.1', title: 'Aplicação em matriz de panificação', assignee: 'rafael', start: 470, duration: 40, status: TaskStatus.TODO, points: 13, deps: ['v-prot', 'e-l2'] },
  { key: 'v-beb',   wbs: '5.1', title: 'Aplicação em bebida funcional', assignee: 'rafael', start: 495, duration: 40, status: TaskStatus.TODO, points: 13, deps: ['v-prot', 'e-l2'] },
  { key: 'v-sens',  wbs: '5.1', title: 'Análise sensorial com painel treinado', assignee: 'juliana', start: 540, duration: 30, status: TaskStatus.TODO, points: 8, deps: ['v-pan', 'v-beb'] },

  // ── 5.2 Regulatório e PI ──
  { key: 'v-anv',   wbs: '5.2', title: 'Levantamento regulatório ANVISA', assignee: 'camila', start: 360, duration: 35, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, points: 8,
    checklist: [['Mapear RDCs aplicáveis', true], ['Consultar precedentes de novos alimentos', true], ['Definir estratégia de submissão', false]] },
  { key: 'v-dos',   wbs: '5.2', title: 'Dossiê de segurança do ingrediente', assignee: 'camila', start: 555, duration: 60, status: TaskStatus.TODO, priority: TaskPriority.CRITICAL, points: 21, deps: ['v-anv', 'v-sens'] },
  { key: 'v-nov',   wbs: '5.2', title: 'Protocolo de novos alimentos na ANVISA', assignee: 'camila', start: 615, duration: 50, status: TaskStatus.TODO, priority: TaskPriority.CRITICAL, points: 13, deps: ['v-dos'] },
  { key: 'v-pat',   wbs: '5.2', title: 'Pedido de patente da rota de processo', assignee: 'marina', start: 520, duration: 45, status: TaskStatus.TODO, priority: TaskPriority.HIGH, points: 13, deps: ['b-rel'] },

  // ── 5.3 Transferência Tecnológica ──
  { key: 't-man',   wbs: '5.3', title: 'Manual de processo e POPs finais', assignee: 'thiago', start: 620, duration: 40, status: TaskStatus.TODO, points: 13, deps: ['e-cost'],
    checklist: [['Consolidar parâmetros do processo', false], ['Revisar POPs de operação', false], ['Aprovar com a qualidade do cliente', false]] },
  { key: 't-trein', wbs: '5.3', title: 'Treinamento da equipe industrial do cliente', assignee: 'thiago', start: 660, duration: 25, status: TaskStatus.TODO, points: 8, deps: ['t-man'] },
  { key: 't-transf',wbs: '5.3', title: 'Transferência tecnológica e aceite formal', assignee: 'marina', start: 680, duration: 35, status: TaskStatus.TODO, priority: TaskPriority.CRITICAL, points: 13, deps: ['t-trein', 'v-nov'] },
];

// ── Marcos (roadmap) ─────────────────────────────────────────────────────────

const MILESTONES: Array<{ title: string; description: string; at: number; reached: boolean }> = [
  { title: 'Kick-off e TAP aprovado',            description: 'Escopo, orçamento e equipe formalizados com o cliente.', at: 30,  reached: true },
  { title: 'Matéria-prima caracterizada',        description: 'Laudos completos dos três coprodutos selecionados.',     at: 133, reached: true },
  { title: 'Rota tecnológica definida',          description: 'Rota enzimática reprodutível em bancada.',               at: 215, reached: true },
  { title: 'Processo otimizado em bancada',      description: 'Condições ótimas e modelo de rendimento validados.',     at: 370, reached: true },
  { title: 'Planta piloto comissionada',         description: 'Reator instalado, qualificado e liberado para uso.',     at: 382, reached: true },
  { title: 'Relatório de meio de projeto',       description: 'Entrega pendente — revisão com o cliente em curso.',     at: 375, reached: false },
  { title: 'Lotes piloto validados',             description: 'Três lotes reprodutíveis com balanço de massa fechado.', at: 490, reached: false },
  { title: 'Provas de conceito em aplicação',    description: 'Ingrediente aprovado em panificação e bebida.',          at: 575, reached: false },
  { title: 'Dossiê regulatório protocolado',     description: 'Submissão de novos alimentos aceita pela ANVISA.',       at: 665, reached: false },
  { title: 'Transferência concluída',            description: 'Aceite formal do cliente e encerramento do projeto.',    at: LAST_DAY, reached: false },
];

// ── Riscos ───────────────────────────────────────────────────────────────────

const RISKS: Array<{
  title: string; description: string; probability: RiskProbability; impact: RiskImpact;
  owner: TeamKey; response: string;
}> = [
  {
    title: 'Atraso na entrega do reator piloto',
    description: 'Fornecedor único do reator de 500 L, com prazo de importação sujeito a fila alfandegária.',
    probability: RiskProbability.VERY_HIGH, impact: RiskImpact.HIGH, owner: 'thiago',
    response: 'Materializado: entrega atrasou 12 dias. Cronograma da fase 4 repactuado e fornecedor alternativo homologado para peças de reposição.',
  },
  {
    title: 'Variabilidade sazonal do coproduto compromete a padronização',
    description: 'Composição do coproduto varia com a safra, afetando o rendimento da hidrólise.',
    probability: RiskProbability.HIGH, impact: RiskImpact.HIGH, owner: 'rafael',
    response: 'Caracterizar lotes de duas safras distintas e definir faixa de especificação de entrada com tolerância.',
  },
  {
    title: 'Mudança regulatória para novos alimentos',
    description: 'Revisão da RDC de novos alimentos em consulta pública pode alterar o dossiê exigido.',
    probability: RiskProbability.MEDIUM, impact: RiskImpact.VERY_HIGH, owner: 'camila',
    response: 'Acompanhamento mensal da agenda regulatória e submissão de consulta prévia à ANVISA antes do dossiê final.',
  },
  {
    title: 'Rendimento em escala piloto abaixo do obtido em bancada',
    description: 'Transferência de escala pode reduzir a conversão por limitação de transferência de massa.',
    probability: RiskProbability.HIGH, impact: RiskImpact.MEDIUM, owner: 'thiago',
    response: 'Três lotes piloto com ajuste progressivo de agitação e carga enzimática antes de fechar o custo.',
  },
  {
    title: 'Custo da enzima inviabiliza o produto final',
    description: 'A enzima selecionada responde por parcela relevante do custo variável.',
    probability: RiskProbability.MEDIUM, impact: RiskImpact.HIGH, owner: 'rafael',
    response: 'Negociar preço por volume e manter segunda enzima homologada na triagem como alternativa.',
  },
  {
    title: 'Contaminação microbiológica nos lotes piloto',
    description: 'Planta piloto compartilhada aumenta o risco de contaminação cruzada entre bateladas.',
    probability: RiskProbability.MEDIUM, impact: RiskImpact.MEDIUM, owner: 'juliana',
    response: 'POP de sanitização entre lotes e controle microbiológico obrigatório em cada batelada.',
  },
  {
    title: 'Publicação de terceiros antecipa a patente',
    description: 'Grupos concorrentes pesquisam rotas semelhantes; publicação prévia derruba a novidade.',
    probability: RiskProbability.LOW, impact: RiskImpact.VERY_HIGH, owner: 'marina',
    response: 'Depósito do pedido de patente antecipado para antes das provas de conceito em aplicação.',
  },
  {
    title: 'Perda de pesquisador-chave da equipe',
    description: 'Conhecimento da rota enzimática concentrado em poucas pessoas.',
    probability: RiskProbability.LOW, impact: RiskImpact.HIGH, owner: 'marina',
    response: 'Documentação em POPs versionados e revezamento de execução entre dois analistas.',
  },
];

const SCORE: Record<string, number> = { VERY_LOW: 1, LOW: 2, MEDIUM: 3, HIGH: 4, VERY_HIGH: 5 };

// ── Partes interessadas ──────────────────────────────────────────────────────

const STAKEHOLDERS: Array<{
  contactKey: string; name: string; email: string; phone?: string;
  type: StakeholderType; roleNote: string; influence: RiskImpact; interest: RiskImpact;
}> = [
  { contactKey: 'ct-sponsor', name: 'Eduardo Villela', email: 'eduardo.villela@nutrivale.com.br', phone: '(11) 3555-2100',
    type: StakeholderType.SPONSOR, roleNote: 'Diretor de Inovação da Nutrivale — patrocinador e aprovador do orçamento',
    influence: RiskImpact.VERY_HIGH, interest: RiskImpact.VERY_HIGH },
  { contactKey: 'ct-marina', name: 'Marina Alencar', email: 'marina@bioinfood.com', phone: '(19) 99812-4400',
    type: StakeholderType.OWNER, roleNote: 'Coordenadora do projeto pela Bioinfood',
    influence: RiskImpact.HIGH, interest: RiskImpact.VERY_HIGH },
  { contactKey: 'ct-rafael', name: 'Rafael Bittencourt', email: 'rafael@bioinfood.com',
    type: StakeholderType.TEAM_MEMBER, roleNote: 'Pesquisador responsável pela rota tecnológica',
    influence: RiskImpact.MEDIUM, interest: RiskImpact.HIGH },
  { contactKey: 'ct-juliana', name: 'Juliana Prado', email: 'juliana@bioinfood.com',
    type: StakeholderType.TEAM_MEMBER, roleNote: 'Analista de laboratório — caracterização e lotes piloto',
    influence: RiskImpact.LOW, interest: RiskImpact.HIGH },
  { contactKey: 'ct-thiago', name: 'Thiago Nakamura', email: 'thiago@bioinfood.com',
    type: StakeholderType.TEAM_MEMBER, roleNote: 'Engenheiro de processos — escalonamento piloto',
    influence: RiskImpact.MEDIUM, interest: RiskImpact.HIGH },
  { contactKey: 'ct-planta', name: 'Sandra Okamoto', email: 'sandra.okamoto@nutrivale.com.br', phone: '(11) 3555-2144',
    type: StakeholderType.STAKEHOLDER, roleNote: 'Gerente da planta industrial que receberá a transferência',
    influence: RiskImpact.HIGH, interest: RiskImpact.MEDIUM },
  { contactKey: 'ct-regulatorio', name: 'Luís Fontana', email: 'luis@fontanaregulatorio.com.br',
    type: StakeholderType.STAKEHOLDER, roleNote: 'Consultor regulatório externo (ANVISA)',
    influence: RiskImpact.MEDIUM, interest: RiskImpact.MEDIUM },
  { contactKey: 'ct-fomento', name: 'Patrícia Neves', email: 'patricia.neves@fapesp.br',
    type: StakeholderType.STAKEHOLDER, roleNote: 'Analista da agência de fomento — acompanha as prestações de contas',
    influence: RiskImpact.HIGH, interest: RiskImpact.LOW },
];

// ── POPs ─────────────────────────────────────────────────────────────────────

const POPS = [
  {
    id: 'pop-demo-centesimal',
    title: 'Preparo de amostras para caracterização centesimal',
    description: 'Moagem, homogeneização e quarteamento de coprodutos agroindustriais antes das análises.',
    versions: [
      { versionNumber: 1, changeNotes: 'Versão inicial.' },
      { versionNumber: 2, changeNotes: 'Inclui granulometria mínima e tempo de secagem revisado após os lotes da safra 2025.' },
    ],
  },
  {
    id: 'pop-demo-reator',
    title: 'Operação do reator piloto de hidrólise enzimática',
    description: 'Partida, condução e parada da batelada no reator de 500 L, com pontos de coleta.',
    versions: [{ versionNumber: 1, changeNotes: 'Emitido após o comissionamento da planta piloto.' }],
  },
  {
    id: 'pop-demo-micro',
    title: 'Controle microbiológico de lotes piloto',
    description: 'Sanitização entre bateladas e plano de amostragem microbiológica.',
    versions: [{ versionNumber: 1, changeNotes: 'Versão inicial, derivada do risco de contaminação cruzada.' }],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export async function seedDemoProject(prisma: PrismaClient, adminId: string, liderId: string) {
  // Recria do zero: o projeto cascateia tarefas, EAP, riscos, marcos, TAP e
  // partes interessadas, então rodar o seed de novo não duplica nada.
  await prisma.project.deleteMany({ where: { id: PROJECT_ID } });

  // ── Equipe interna ──
  const demoHash = await bcrypt.hash('demo123', 10);
  const users: Record<string, string> = {};
  for (const member of TEAM) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: { name: member.name, email: member.email, passwordHash: demoHash, role: member.role },
    });
    users[member.key] = user.id;
  }

  // ── Contatos das partes interessadas ──
  const contacts: Record<string, string> = {};
  for (const person of STAKEHOLDERS) {
    const contact = await prisma.contact.upsert({
      where: { id: person.contactKey },
      update: {},
      create: {
        id: person.contactKey,
        name: person.name,
        email: person.email,
        phone: person.phone ?? null,
      },
    });
    contacts[person.contactKey] = contact.id;
  }

  // ── Cliente ──
  const client = await prisma.organization.upsert({
    where: { id: 'org-nutrivale' },
    update: {},
    create: {
      id: 'org-nutrivale',
      partyType: PartyType.COMPANY,
      legalName: 'Nutrivale Alimentos S.A.',
      tradeName: 'Nutrivale',
      documentType: DocumentType.CNPJ,
      status: OrganizationStatus.ACTIVE,
      roles: { create: { type: PartyRoleType.CUSTOMER } },
      customerProfile: { create: { stage: CustomerStage.ACTIVE, salesRepId: liderId } },
    },
  });

  // ── Projeto ──
  const project = await prisma.project.create({
    data: {
      id: PROJECT_ID,
      name: 'Plataforma de Ingredientes Funcionais a partir de Coprodutos',
      description:
        'Desenvolvimento de uma plataforma tecnológica para converter coprodutos agroindustriais em ingredientes funcionais de alto valor, da bancada à transferência industrial.',
      objective:
        'Entregar à Nutrivale uma rota enzimática validada em escala piloto para produção de ingrediente funcional rico em fibras solúveis, com dossiê regulatório protocolado e processo transferido para a planta industrial.',
      status: ProjectStatus.IN_PROGRESS,
      startDate: day(0),
      endDate: day(LAST_DAY),
      clientId: client.id,
      createdById: users.marina,
      // Linha de base congelada no fim do planejamento (tarefa g-base).
      baselineSetAt: day(33),
      baselineSetById: liderId,
    },
  });

  // ── TAP ──
  const charter = await prisma.charter.create({
    data: {
      projectId: project.id,
      projectType: 'P&D contratado (R&D as a Service)',
      priority: 'Alta',
      projectOwnerId: contacts['ct-marina'],
      problem:
        'A Nutrivale destina cerca de 40 mil toneladas/ano de coprodutos a ração de baixo valor, enquanto importa fibras funcionais para sua linha de produtos saudáveis. Há perda de margem nas duas pontas.',
      justification:
        'Converter o coproduto em ingrediente funcional interno reduz custo de matéria-prima importada, cria uma linha de receita nova e melhora o indicador de circularidade exigido pelos clientes do varejo.',
      assumptions:
        'Disponibilidade contínua de coproduto nas duas safras cobertas pelo projeto; acesso à planta piloto da Bioinfood; equipe do cliente disponível para os ensaios de aplicação.',
      mainObjective:
        'Desenvolver e validar em escala piloto uma rota enzimática de obtenção de fibra solúvel a partir de coprodutos agroindustriais, com dossiê regulatório pronto para submissão.',
      specificObjectives: [
        '1. Caracterizar três coprodutos candidatos e selecionar o de maior potencial.',
        '2. Definir rota enzimática com rendimento mínimo de 55% em base seca.',
        '3. Reproduzir a rota em escala piloto (500 L) em três lotes consecutivos.',
        '4. Comprovar desempenho do ingrediente em duas matrizes alimentícias.',
        '5. Protocolar o dossiê de novos alimentos na ANVISA.',
        '6. Transferir o processo para a planta industrial do cliente.',
      ].join('\n'),
      kpis: [
        'Rendimento de extração ≥ 55% (base seca)',
        'Reprodutibilidade entre lotes piloto: CV ≤ 8%',
        'Custo de produção ≤ R$ 18,00/kg de ingrediente',
        'Teor de fibra solúvel ≥ 70%',
        'Aceitação sensorial ≥ 7,0 em escala hedônica de 9 pontos',
      ].join('\n'),
      scope:
        'Prospecção e caracterização de coprodutos; desenvolvimento da rota enzimática em bancada; otimização por planejamento experimental; escalonamento e validação em planta piloto de 500 L; ensaios de aplicação em panificação e bebida; dossiê regulatório; transferência tecnológica e treinamento.',
      outOfScope:
        'Construção da planta industrial; registro de marca do produto final; estudos clínicos de alegação de saúde; distribuição e comercialização do ingrediente.',
      deliverables: [
        'Relatório de caracterização dos coprodutos',
        'Rota enzimática documentada e reprodutível',
        'Relatório técnico de bancada com modelo de rendimento',
        'Três lotes piloto validados com balanço de massa',
        'Provas de conceito em duas matrizes alimentícias',
        'Dossiê de segurança e protocolo ANVISA',
        'Pedido de patente depositado',
        'Manual de processo, POPs e equipe do cliente treinada',
      ].join('\n'),
      infrastructure:
        'Laboratório de bioprocessos da Bioinfood (bancada e analítica); planta piloto com reator encamisado de 500 L, sistema de filtração tangencial e secador spray; laboratório de análise sensorial com painel treinado.',
      budget: '1850000.00',
      governance:
        'Reunião quinzenal de acompanhamento entre a coordenação e o líder técnico do cliente. Comitê diretor trimestral com o patrocinador. Mudança de escopo exige aprovação formal do patrocinador e repactuação da linha de base.',
      dependencies:
        'Fornecimento regular de coproduto pela unidade de Piracicaba; importação do reator piloto; disponibilidade do painel sensorial; prazos de análise da ANVISA, fora do controle do projeto.',
      constraints:
        'Orçamento aprovado de R$ 1,85 milhão sem previsão de aporte adicional. Prazo de 24 meses vinculado ao convênio de fomento. Uso da planta piloto limitado a 10 dias por mês, compartilhado com outros projetos.',
      approvedById: liderId,
      approvedAt: day(15),
      team: {
        create: Object.values(users).map((userId) => ({ userId })),
      },
    },
  });

  // ── EAP ──
  const wbsIds: Record<string, string> = {};
  for (const [index, node] of WBS.entries()) {
    const parentCode = node.code.includes('.') ? node.code.split('.')[0] : null;
    const created = await prisma.wbsNode.create({
      data: {
        projectId: project.id,
        parentId: parentCode ? wbsIds[parentCode] : null,
        code: node.code,
        title: node.title,
        owner: node.owner,
        readyCriteria: node.readyCriteria ?? null,
        outputs: node.outputs ?? null,
        order: index,
      },
    });
    wbsIds[node.code] = created.id;
  }

  // ── Tarefas ──
  const taskIds: Record<string, string> = {};
  for (const [index, spec] of TASKS.entries()) {
    const slip = spec.slip ?? 0;
    const start = day(spec.start);
    const due = day(spec.start + spec.duration);

    const created = await prisma.task.create({
      data: {
        projectId: project.id,
        wbsNodeId: wbsIds[spec.wbs],
        assigneeId: users[spec.assignee],
        title: spec.title,
        status: spec.status,
        priority: spec.priority ?? TaskPriority.MEDIUM,
        storyPoints: spec.points ?? null,
        startDate: start,
        dueDate: due,
        // A linha de base é o plano aprovado: onde a tarefa estava antes de escorregar.
        baselineStart: day(spec.start - slip),
        baselineEnd: day(spec.start + spec.duration - slip),
        actualStart: spec.status === TaskStatus.TODO ? null : start,
        actualEnd: spec.status === TaskStatus.DONE ? due : null,
        order: index,
        checklist: spec.checklist
          ? {
              create: spec.checklist.map(([text, checked], order) => ({ text, checked, order })),
            }
          : undefined,
      },
    });
    taskIds[spec.key] = created.id;
  }

  // ── Dependências (desenham as setas do Gantt) ──
  for (const spec of TASKS) {
    for (const predecessorKey of spec.deps ?? []) {
      await prisma.taskDependency.create({
        data: {
          predecessorId: taskIds[predecessorKey],
          successorId: taskIds[spec.key],
          type: TaskDependencyType.FS,
        },
      });
    }
  }

  // ── Marcos ──
  for (const [order, milestone] of MILESTONES.entries()) {
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        title: milestone.title,
        description: milestone.description,
        date: day(milestone.at),
        reached: milestone.reached,
        order,
      },
    });
  }

  // ── Riscos ──
  for (const risk of RISKS) {
    await prisma.risk.create({
      data: {
        projectId: project.id,
        ownerId: users[risk.owner],
        title: risk.title,
        description: risk.description,
        probability: risk.probability,
        impact: risk.impact,
        score: SCORE[risk.probability] * SCORE[risk.impact],
        response: risk.response,
      },
    });
  }

  // ── Partes interessadas ──
  for (const person of STAKEHOLDERS) {
    await prisma.projectStakeholder.create({
      data: {
        projectId: project.id,
        contactId: contacts[person.contactKey],
        type: person.type,
        roleNote: person.roleNote,
        influence: person.influence,
        interest: person.interest,
      },
    });
  }

  // ── POPs e uso nas tarefas ──
  const popVersionIds: Record<string, string> = {};
  for (const pop of POPS) {
    await prisma.pop.upsert({
      where: { id: pop.id },
      update: {},
      create: { id: pop.id, title: pop.title, description: pop.description },
    });
    for (const version of pop.versions) {
      const created = await prisma.popVersion.upsert({
        where: { popId_versionNumber: { popId: pop.id, versionNumber: version.versionNumber } },
        update: {},
        create: {
          popId: pop.id,
          versionNumber: version.versionNumber,
          changeNotes: version.changeNotes,
          createdById: adminId,
        },
      });
      popVersionIds[`${pop.id}#${version.versionNumber}`] = created.id;
    }
  }

  const POP_USAGE: Array<[string, string]> = [
    ['p-cent', 'pop-demo-centesimal#2'],
    ['e-l1', 'pop-demo-reator#1'],
    ['e-l1', 'pop-demo-micro#1'],
  ];
  for (const [taskKey, popKey] of POP_USAGE) {
    await prisma.taskPop.create({
      data: {
        taskId: taskIds[taskKey],
        popVersionId: popVersionIds[popKey],
        addedById: users.thiago,
      },
    });
  }

  return { projectId: project.id, charterId: charter.id, taskCount: TASKS.length };
}
