export type SummaryStats = {
  min: number;
  max: number;
  count: number;
  mean: number;
  p50: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
};

export type MetricsGroup = Record<string, SummaryStats>;

export type LogEntry = {
  counters: Record<string, number>;
  rates: Record<string, number>;
  firstCounterAt: number;
  firstHistogramAt?: number;
  lastCounterAt: number;
  lastHistogramAt?: number;
  firstMetricAt: number;
  lastMetricAt: number;
  period: string | number;
  summaries: MetricsGroup;
  histograms: MetricsGroup;
};

export type ArtilleryLog = {
  intermediate: LogEntry[];
  aggregate: LogEntry;
  testId: string;
  metadata: {
    tags: { name: string; value: string }[];
    count: number;
    region: string;
    cluster: string;
    artilleryVersion: {
      core: string;
      pro: string;
    };
  };
  ensure: unknown[];
};

export type ApdexRating = 'satisfied' | 'tolerated' | 'frustrated';
