import { Injectable, Inject } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';
import { CharterWithMeta, UpsertCharterData } from '../domain/charter.entity';
import { sanitizeRichTextFields } from '../../../common/sanitize/rich-text';

/**
 * Campos narrativos do TAP — os que o `RichTextEditor` do web edita e que
 * portanto chegam como HTML. Precisam passar pela allowlist antes do banco.
 *
 * Fora da lista de propósito: `projectType`, `priority` (listas fechadas) e
 * `budget` (numérico). Sanitizar tudo indiscriminadamente escaparia caractere
 * legítimo num campo que nunca vai virar HTML.
 */
const RICH_TEXT_FIELDS = [
  'problem',
  'justification',
  'assumptions',
  'mainObjective',
  'specificObjectives',
  'kpis',
  'scope',
  'outOfScope',
  'deliverables',
  'infrastructure',
  'governance',
  'dependencies',
] as const;

@Injectable()
export class UpsertCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  async execute(projectId: string, data: UpsertCharterData): Promise<CharterWithMeta> {
    const charter = await this.repo.upsert(
      projectId,
      sanitizeRichTextFields(data, RICH_TEXT_FIELDS),
    );
    const lastEdit = await this.repo.findLastEdit(charter.id);
    return {
      ...charter,
      lastEditedBy: lastEdit?.actor ?? null,
      lastEditedAt: lastEdit?.at ?? null,
    };
  }
}
