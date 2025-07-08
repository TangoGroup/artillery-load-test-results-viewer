"use client";

import { ArtilleryLog, ApdexRating, SummaryStats } from "@/types/artillery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeyMetricsSummaryProps {
  data: ArtilleryLog;
}

export function KeyMetricsSummary({ data }: KeyMetricsSummaryProps) {
  const aggregate = data.aggregate;
  
  // Detect data type: browser automation vs traditional HTTP
  const isBrowserData = aggregate.counters && Object.keys(aggregate.counters).some(key => key.startsWith("browser."));
  
  // VU metrics
  const vusCreated = aggregate.counters["vusers.created"] || 0;
  const vusCompleted = aggregate.counters["vusers.completed"] || 0;
  const vusFailed = aggregate.counters["vusers.failed"] || 0;
  
  // Request metrics - adapt based on data type
  let httpRequests = 0;
  let httpRequestsCompleted = 0;
  let httpRequestsFailed = 0;
  let requestTypeLabel = "HTTP Requests";

  if (isBrowserData) {
    requestTypeLabel = "Browser Requests";
    httpRequests = aggregate.counters["browser.http_requests"] || 0;
    // For browser data, use page codes as completion indicators
    httpRequestsCompleted = Object.entries(aggregate.counters)
      .filter(([key]) => key.startsWith("browser.page.codes.2")) // 2xx codes
      .reduce((sum, [, count]) => sum + count, 0);
    httpRequestsFailed = Object.entries(aggregate.counters)
      .filter(([key]) => key.startsWith("browser.page.codes.4") || key.startsWith("browser.page.codes.5")) // 4xx, 5xx codes
      .reduce((sum, [, count]) => sum + count, 0);
  } else {
    httpRequests = aggregate.counters["http.requests"] || 0;
    httpRequestsCompleted = aggregate.counters["http.responses"] || 0;
    httpRequestsFailed = aggregate.counters["http.request_errors"] || 0;
  }
  
  // Response time metrics - adapt based on data type
  let responseTimeStats: SummaryStats | undefined;
  let responseTimeLabel = "Response Time";
  
  if (isBrowserData) {
    responseTimeLabel = "TTFB";
    // Find any TTFB metrics
    const ttfbKeys = Object.keys(aggregate.summaries).filter(key => key.startsWith("browser.page.TTFB."));
    if (ttfbKeys.length > 0) {
      // Use the first TTFB metric found, or aggregate if multiple
      responseTimeStats = aggregate.summaries[ttfbKeys[0]];
    }
  } else {
    responseTimeStats = aggregate.summaries["http.response_time"];
  }
  
  const p95 = responseTimeStats?.p95 || 0;
  const p99 = responseTimeStats?.p99 || 0;
  const mean = responseTimeStats?.mean || 0;
  
  // Apdex calculation - adjust thresholds for browser data
  const getApdexRating = (p95: number): ApdexRating => {
    const threshold = isBrowserData ? 100 : 150; // Lower threshold for TTFB
    if (p95 < threshold) return "satisfied";
    if (p95 <= threshold * 3) return "tolerated";
    return "frustrated";
  };
  
  const apdexRating = getApdexRating(p95);
  
  // Pass/Fail check - adjust for browser data
  const passFailThreshold = isBrowserData ? 200 : 300;
  const apdexThreshold = isBrowserData ? 100 : 150;
  const isPassFail = p99 < passFailThreshold && p95 < apdexThreshold;
  
  const getApdexColor = (rating: ApdexRating) => {
    switch (rating) {
      case "satisfied": return "bg-green-600";
      case "tolerated": return "bg-yellow-600"; 
      case "frustrated": return "bg-red-600";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">Virtual Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Created:</span>
              <span className="font-mono">{vusCreated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Completed:</span>
              <span className="font-mono text-green-400">{vusCompleted.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Failed:</span>
              <span className="font-mono text-red-400">{vusFailed.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">{requestTypeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total:</span>
              <span className="font-mono">{httpRequests.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Completed:</span>
              <span className="font-mono text-green-400">{httpRequestsCompleted.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Failed:</span>
              <span className="font-mono text-red-400">{httpRequestsFailed.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">{responseTimeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Average:</span>
              <span className="font-mono">{mean.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">P95:</span>
              <span className="font-mono">{p95.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">P99:</span>
              <span className="font-mono">{p99.toFixed(1)}ms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">Apdex Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Badge className={`${getApdexColor(apdexRating)} text-white capitalize`}>
              {apdexRating}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-slate-400 text-center">
            Based on P95 &lt; {isBrowserData ? '100ms' : '150ms'}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">Pass/Fail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Badge className={`${isPassFail ? 'bg-green-600' : 'bg-red-600'} text-white`}>
              {isPassFail ? 'PASS' : 'FAIL'}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-slate-400 text-center">
            P99 &lt; {passFailThreshold}ms & P95 &lt; {apdexThreshold}ms
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
