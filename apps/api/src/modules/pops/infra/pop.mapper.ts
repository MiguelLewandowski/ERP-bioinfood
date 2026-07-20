import { PopVersionWithAuthor, PopWithLatestVersion, PopWithVersions } from '../domain/pop.entity';

export interface PopVersionDto {
  id: string;
  versionNumber: number;
  changeNotes: string | null;
  fileUrl: string | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
}

export interface PopListItemDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  latestVersion: PopVersionDto;
  createdAt: Date;
}

export interface PopDetailDto extends PopListItemDto {
  versions: PopVersionDto[];
}

function toVersionDto(v: PopVersionWithAuthor): PopVersionDto {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    changeNotes: v.changeNotes,
    fileUrl: v.fileUrl,
    createdBy: v.createdBy,
    createdAt: v.createdAt,
  };
}

export function toPopListItemDto(p: PopWithLatestVersion): PopListItemDto {
  return {
    id: p.id,
    projectId: p.projectId,
    title: p.title,
    description: p.description,
    latestVersion: toVersionDto(p.latestVersion),
    createdAt: p.createdAt,
  };
}

export function toPopDetailDto(p: PopWithVersions): PopDetailDto {
  return {
    id: p.id,
    projectId: p.projectId,
    title: p.title,
    description: p.description,
    latestVersion: toVersionDto(p.versions[0]),
    versions: p.versions.map(toVersionDto),
    createdAt: p.createdAt,
  };
}
