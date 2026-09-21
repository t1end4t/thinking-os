import type { Paper } from '../types';

export function paperIdentity(paper: Pick<Paper, 'title' | 'authors' | 'year' | 'doi' | 'url'>): string {
  const identifier = paper.doi?.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();
  const arxiv = `${identifier || ''} ${paper.url || ''}`.match(/(?:arxiv\.org\/(?:abs|pdf)\/|arxiv[.:])([\w.-]+\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?/i);
  if (arxiv) return `arxiv:${arxiv[1].toLowerCase()}`;
  if (identifier) return `doi:${identifier}`;
  const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return `title:${normalized(paper.title)}:${paper.year}:${normalized(paper.authors)}`;
}
