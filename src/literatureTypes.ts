export interface DiscoveryPaper {
  readonly id: string;
  readonly title: string;
  readonly authors: string;
  readonly year: number;
  readonly doi?: string;
  readonly url?: string;
  readonly abstract?: string;
  readonly source: string;
  readonly queries: string[];
  readonly discoveredAt: number;
  readonly jobId?: string;
  readonly runId?: string;
}

export interface LiteratureJobInput {
  readonly name: string;
  readonly brief: string;
  readonly queries: string[];
  readonly dailyTime: string;
  readonly enabled: boolean;
  readonly expand: boolean;
}

export interface LiteratureJob extends LiteratureJobInput {
  readonly id: string;
  readonly createdAt: number;
  readonly lastRunAt?: number;
  readonly nextRunAt?: number;
}

export interface LiteratureRun {
  readonly id: string;
  readonly jobId: string;
  readonly startedAt: number;
  readonly finishedAt?: number;
  readonly status: 'running' | 'completed' | 'failed';
  readonly resultCount: number;
  readonly error?: string;
}

export interface LiteratureSnapshot {
  readonly jobs: LiteratureJob[];
  readonly runs: LiteratureRun[];
  readonly results: DiscoveryPaper[];
  readonly scheduler: { readonly active: boolean; readonly timeZone: string };
}

export interface LiteratureSearch {
  readonly brief: string;
  readonly queries: string[];
  readonly expand: boolean;
}

export type LiteratureCommand =
  | ({ readonly action: 'search' } & LiteratureSearch)
  | ({ readonly action: 'create' } & LiteratureJobInput)
  | ({ readonly action: 'update'; readonly id: string } & LiteratureJobInput)
  | { readonly action: 'delete' | 'run'; readonly id: string };
