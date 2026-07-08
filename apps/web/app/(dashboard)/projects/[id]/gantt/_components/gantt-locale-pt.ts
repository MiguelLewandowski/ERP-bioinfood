// Tradução pt-BR para a SVAR Gantt. A lib só traz en/cn prontos — o `core`
// (botões genéricos, calendário) tem `pt` (pt-PT) pronto em @svar-ui/core-locales,
// mas o namespace `gantt` (rótulos específicos do widget) não tem tradução
// alguma, então precisa ser escrito à mão aqui, espelhando as chaves de
// @svar-ui/gantt-locales/locales/en.js.

export const ganttLocalePt = {
  lang: 'pt-BR',

  calendar: {
    monthFull: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ],
    monthShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    dayFull: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    dayShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    hours: 'Horas',
    minutes: 'Minutos',
    done: 'Concluído',
    clear: 'Limpar',
    today: 'Hoje',
    am: ['am', 'AM'],
    pm: ['pm', 'PM'],
    weekStart: 0,
    clockFormat: 24,
  },

  core: {
    ok: 'OK',
    cancel: 'Cancelar',
    select: 'Selecionar',
    'No data': 'Sem dados',
    'Rows per page': 'Linhas por página',
    'Total pages': 'Total de páginas',
  },

  formats: {
    timeFormat: '%H:%i',
    dateFormat: '%d/%m/%Y',
    monthYearFormat: '%F %Y',
    yearFormat: '%Y',
  },

  gantt: {
    // Cabeçalho / grade
    'Task name': 'Nome da tarefa',
    'Start date': 'Data de início',
    'Add task': 'Adicionar tarefa',
    Duration: 'Duração',
    Task: 'Tarefa',
    Milestone: 'Marco',
    'Summary task': 'Tarefa-resumo',
    Resources: 'Recursos',
    WBS: 'EAP',
    Hours: 'Horas',

    // Painel lateral (editor de tarefa)
    Save: 'Salvar',
    Delete: 'Excluir',
    Name: 'Nome',
    Description: 'Descrição',
    'Select type': 'Selecionar tipo',
    Type: 'Tipo',
    'End date': 'Data de término',
    Progress: 'Progresso',
    Predecessors: 'Predecessoras',
    Successors: 'Sucessoras',
    'Add task name': 'Nome da tarefa',
    'Add description': 'Adicionar descrição',
    'Select link type': 'Selecionar tipo de vínculo',
    'End-to-start': 'Término-início',
    'Start-to-start': 'Início-início',
    'End-to-end': 'Término-término',
    'Start-to-end': 'Início-término',
    'No links': 'Sem vínculos',
    'No assignments': 'Sem atribuições',
    'No segments': 'Sem segmentos',
    'Add resource': 'Adicionar recurso',
    Resource: 'Recurso',
    General: 'Geral',
    Links: 'Vínculos',
    Lag: 'Atraso',
    Segments: 'Segmentos',
    Ungrouped: 'Sem grupo',
    Unassigned: 'Não atribuído',

    // Menu de contexto / barra de ferramentas
    Add: 'Adicionar',
    'Child task': 'Subtarefa',
    'Task above': 'Tarefa acima',
    'Task below': 'Tarefa abaixo',
    'Convert to': 'Converter em',
    Edit: 'Editar',
    Cut: 'Recortar',
    Copy: 'Copiar',
    Paste: 'Colar',
    Move: 'Mover',
    Up: 'Para cima',
    Down: 'Para baixo',
    Indent: 'Indentar',
    Outdent: 'Remover indentação',
    'Split task': 'Dividir tarefa',
    Segment: 'Segmento',

    // Barra de ferramentas
    'New task': 'Nova tarefa',
    'Move up': 'Mover para cima',
    'Move down': 'Mover para baixo',
    Undo: 'Desfazer',
    Redo: 'Refazer',

    // Formatos de escala
    Week: 'Semana',
    Q: 'Trimestre',
  },
};
