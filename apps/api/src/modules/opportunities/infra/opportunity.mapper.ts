import { OpportunityListItem } from '../domain/opportunity.entity';

export interface OpportunityDto {
  id: string;
  title: string;
  amount: string | null;
  currency: string;
  probability: number | null;
  pipelineId: string;
  stageId: string;
  expectedCloseDate: string | null;
  closedAt: string | null;
  engagementStageId: string | null;
  organization: { id: string; legalName: string; tradeName: string | null };
  mainContact: { id: string; name: string } | null;
  responsible: { id: string; name: string } | null;
  pipeline: { id: string; name: string };
  stage: { id: string; name: string; type: string };
}

// The domain list item is already a plain, safe projection.
export function toOpportunityDto(o: OpportunityListItem): OpportunityDto {
  return o;
}
