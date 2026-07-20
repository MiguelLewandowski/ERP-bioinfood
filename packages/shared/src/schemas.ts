import { z } from 'zod';

// Schemas Zod dos forms mais editados do CRM/projetos, compartilhados entre
// apps/web (react-hook-form + zodResolver) e apps/api (limites replicados
// manualmente nos DTOs class-validator — ver comentário em cada DTO).
// Fonte única de verdade para os limites: mudar aqui primeiro.

export const projectSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
    description: z.string().max(4000, 'Máximo de 4000 caracteres').optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    clientId: z.string().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'A data de fim não pode ser anterior à data de início',
    path: ['endDate'],
  });

export type ProjectFormData = z.infer<typeof projectSchema>;

// CNPJ obrigatório, exceto quando a empresa é marcada como estrangeira
// (documentType = FOREIGN) — decisão 5 do crm-redesign-2026-07.
export const organizationSchema = z
  .object({
    legalName: z.string().min(1, 'Razão social é obrigatória').max(200, 'Máximo de 200 caracteres'),
    tradeName: z.string().max(200, 'Máximo de 200 caracteres').optional(),
    document: z.string().max(20, 'Máximo de 20 caracteres').optional(),
    documentType: z.enum(['CNPJ', 'CPF', 'FOREIGN', 'OTHER']),
    notes: z.string().max(4000, 'Máximo de 4000 caracteres').optional(),
    sectorId: z.string().optional(),
    sourceId: z.string().optional(),
    categoryId: z.string().optional(),
    salesRepId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.documentType !== 'FOREIGN' && !data.document?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['document'],
        message: 'CNPJ é obrigatório (ou marque a empresa como estrangeira)',
      });
    }
  });

export type OrganizationFormData = z.infer<typeof organizationSchema>;

export const opportunitySchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Máximo de 200 caracteres'),
  clientId: z.string().optional(),
  responsibleId: z.string().optional(),
  amount: z.string().optional(),
  startDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  description: z.string().max(4000, 'Máximo de 4000 caracteres').optional(),
});

export type OpportunityFormData = z.infer<typeof opportunitySchema>;
