// Regras de derivação do domínio de Projeto (puras, sem dependência de framework).

/**
 * Término dinâmico/estimado do projeto = maior prazo (dueDate) entre as
 * atividades. Calculado a cada leitura, não persistido.
 */
export function computeForecastEnd(tasks: Array<{ dueDate: Date | null }>): Date | null {
  const times = tasks
    .map((t) => t.dueDate?.getTime())
    .filter((t): t is number => t !== undefined);
  if (times.length === 0) return null;
  return new Date(Math.max(...times));
}
