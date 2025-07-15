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

// Chat Performance Metrics
export type ChatMetrics = {
  'chats.started'?: number;
  'chats.completed'?: number;
  'chats.failed'?: number;
  'chats.timed_out'?: number;
  'chats.abandoned'?: number;
  'chats.response_time'?: SummaryStats;
};

// System & Concurrency Metrics
export type SystemMetrics = {
  'system.concurrent_chats'?: number;
};

// Error Metrics
export type ErrorMetrics = {
  'chats.error_network'?: number;
  'chats.error_credits'?: number;
  'chats.error_rate_limit'?: number;
  'chats.error_server'?: number;
};

// Business Metrics
export type BusinessMetrics = {
  'chats.credits_consumed'?: SummaryStats;
  'chats.sources_referenced'?: SummaryStats;
  'pages.chat.viewed'?: number;
};

// Test Infrastructure Metrics
export type TestMetrics = {
  'tests.completed'?: number;
  'tests.failed'?: number;
  'tests.diagnostic.completed'?: number;
  'tests.diagnostic.failed'?: number;
};

// Browser-specific metrics
export type BrowserMetrics = {
  'browser.http_requests'?: number;
  'browser.page.domcontentloaded'?: number;
  'browser.memory_used_mb'?: SummaryStats;
  'browser.page.dominteractive'?: SummaryStats;
};

// VUser metrics
export type VUserMetrics = {
  'vusers.created'?: number;
  'vusers.failed'?: number;
  'vusers.completed'?: number;
  'vusers.active'?: number;
  'vusers.session_length'?: SummaryStats;
  [key: `vusers.created_by_name.${string}`]: number;
};

// HTTP metrics
export type HttpMetrics = {
  'http.requests'?: number;
  'http.request_rate'?: number;
  'http.response_time'?: SummaryStats;
  [key: `http.codes.${string}`]: number;
};

// Extended counters type that includes all specific metrics
export type ExtendedCounters = Record<string, number> & 
  Partial<ChatMetrics> & 
  Partial<SystemMetrics> &
  Partial<ErrorMetrics> &
  Partial<BusinessMetrics> &
  Partial<TestMetrics> &
  Partial<BrowserMetrics> & 
  Partial<VUserMetrics> & 
  Partial<HttpMetrics>;

// Extended summaries type
export type ExtendedSummaries = Record<string, SummaryStats> & 
  Partial<Pick<ChatMetrics, 'chats.response_time'>> &
  Partial<Pick<BusinessMetrics, 'chats.credits_consumed' | 'chats.sources_referenced'>> &
  Partial<Pick<VUserMetrics, 'vusers.session_length'>> &
  Partial<Pick<HttpMetrics, 'http.response_time'>>;

export type LogEntry = {
  counters: ExtendedCounters;
  rates: Record<string, number>;
  firstCounterAt: number;
  firstHistogramAt?: number;
  lastCounterAt: number;
  lastHistogramAt?: number;
  firstMetricAt: number;
  lastMetricAt: number;
  period: string | number;
  summaries: ExtendedSummaries;
  histograms: MetricsGroup;
};

// Chart-specific data types
export type ChatPerformanceData = {
  status: 'Started' | 'Completed' | 'Failed' | 'Timed Out' | 'Abandoned';
  count: number;
  color: string;
};

export type EndpointPerformanceData = {
  endpoint: string;
  count: number;
  avgResponseTime: number;
  totalResponseTime: number;
};

export type ErrorBreakdownData = {
  errorType: 'Network' | 'Credits' | 'Rate Limit' | 'Server';
  count: number;
  color: string;
};

export type TimeSeriesData = {
  time: string;
  index: number;
  [key: string]: string | number;
};

export type HistogramData = {
  bucket: string;
  count: number;
  value: number;
};

export type ConcurrencyData = {
  time: string;
  concurrent_chats: number;
};

// Chart type enum for better type safety
export type ChartType = 
  | 'line'
  | 'area' 
  | 'bar'
  | 'stacked_bar'
  | 'pie'
  | 'histogram'
  | 'percentile';

// Metric type enum
export type MetricType = 'counter' | 'histogram' | 'gauge';

// Metric configuration type for chart generation
export type MetricDefinition = {
  name: string;
  type: MetricType;
  description: string;
  chartType: ChartType;
  category: 'chat' | 'system' | 'error' | 'business' | 'test' | 'browser' | 'vuser' | 'http';
};

// Predefined metric configurations based on user notes
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  'chats.started': {
    name: 'chats.started',
    type: 'counter',
    description: 'Chat requests initiated',
    chartType: 'line',
    category: 'chat'
  },
  'chats.completed': {
    name: 'chats.completed',
    type: 'counter',
    description: 'Successfully completed chats',
    chartType: 'line',
    category: 'chat'
  },
  'chats.failed': {
    name: 'chats.failed',
    type: 'counter',
    description: 'Failed chat attempts',
    chartType: 'line',
    category: 'chat'
  },
  'chats.timed_out': {
    name: 'chats.timed_out',
    type: 'counter',
    description: 'Chats that timed out',
    chartType: 'line',
    category: 'chat'
  },
  'chats.abandoned': {
    name: 'chats.abandoned',
    type: 'counter',
    description: 'Chats started but not submitted',
    chartType: 'line',
    category: 'chat'
  },
  'chats.response_time': {
    name: 'chats.response_time',
    type: 'histogram',
    description: 'Time to complete response',
    chartType: 'histogram',
    category: 'chat'
  },
  'system.concurrent_chats': {
    name: 'system.concurrent_chats',
    type: 'gauge',
    description: 'Active chats at any moment',
    chartType: 'area',
    category: 'system'
  },
  'chats.error_network': {
    name: 'chats.error_network',
    type: 'counter',
    description: 'Network/timeout errors',
    chartType: 'stacked_bar',
    category: 'error'
  },
  'chats.error_credits': {
    name: 'chats.error_credits',
    type: 'counter',
    description: 'Credit-related errors',
    chartType: 'stacked_bar',
    category: 'error'
  },
  'chats.error_rate_limit': {
    name: 'chats.error_rate_limit',
    type: 'counter',
    description: 'Rate limiting errors',
    chartType: 'stacked_bar',
    category: 'error'
  },
  'chats.error_server': {
    name: 'chats.error_server',
    type: 'counter',
    description: 'Server errors (5xx)',
    chartType: 'stacked_bar',
    category: 'error'
  },
  'chats.credits_consumed': {
    name: 'chats.credits_consumed',
    type: 'histogram',
    description: 'Credits used per chat',
    chartType: 'histogram',
    category: 'business'
  },
  'chats.sources_referenced': {
    name: 'chats.sources_referenced',
    type: 'histogram',
    description: 'Sources cited per response',
    chartType: 'histogram',
    category: 'business'
  },
  'pages.chat.viewed': {
    name: 'pages.chat.viewed',
    type: 'counter',
    description: 'Chat page views',
    chartType: 'line',
    category: 'business'
  },
  'tests.completed': {
    name: 'tests.completed',
    type: 'counter',
    description: 'Successful test runs',
    chartType: 'line',
    category: 'test'
  },
  'tests.failed': {
    name: 'tests.failed',
    type: 'counter',
    description: 'Failed test runs',
    chartType: 'line',
    category: 'test'
  },
  'tests.diagnostic.completed': {
    name: 'tests.diagnostic.completed',
    type: 'counter',
    description: 'Diagnostic tests completed',
    chartType: 'line',
    category: 'test'
  },
  'tests.diagnostic.failed': {
    name: 'tests.diagnostic.failed',
    type: 'counter',
    description: 'Diagnostic tests failed',
    chartType: 'line',
    category: 'test'
  }
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
