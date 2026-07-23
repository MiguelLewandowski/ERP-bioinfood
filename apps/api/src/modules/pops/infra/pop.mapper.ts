import {
  PopCategoryEntity, PopVersionWithAuthor, PopWithLatestVersion, PopWithVersions,
} from '../domain/pop.entity';

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
  title: string;
  description: string | null;
  category: { id: string; name: string };
  latestVersion: PopVersionDto;
  createdAt: Date;
}

export interface PopCategoryDto {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
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
    title: p.title,
    description: p.description,
    category: p.category,
    latestVersion: toVersionDto(p.latestVersion),
    createdAt: p.createdAt,
  };
}

export function toPopDetailDto(p: PopWithVersions): PopDetailDto {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    latestVersion: toVersionDto(p.versions[0]),
    versions: p.versions.map(toVersionDto),
    createdAt: p.createdAt,
  };
}

export function toPopCategoryDto(c: PopCategoryEntity): PopCategoryDto {
  return { id: c.id, name: c.name, isActive: c.isActive, order: c.order };
}
