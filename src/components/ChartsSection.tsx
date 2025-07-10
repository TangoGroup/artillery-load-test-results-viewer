"use client";

import { ArtilleryLog, SummaryStats } from "@/types/artillery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChartsSectionProps {
  data: ArtilleryLog;
  activeIndex?: number | null;
  onMouseMove?: (index: number | null) => void;
}

export function ChartsSection({ data, activeIndex, onMouseMove }: ChartsSectionProps) {
  // Detect data type: browser automation vs traditional HTTP
  const isBrowserData = data.intermediate.some(entry => 
    Object.keys(entry.counters).some(key => key.startsWith("browser."))
  );

  // Calculate time period for rate calculations
  const calculatePeriodSeconds = (entry: typeof data.intermediate[0]): number => {
    const periodMs = entry.lastCounterAt - entry.firstCounterAt;
    return Math.max(periodMs / 1000, 1); // At least 1 second to avoid division by zero
  };

  // Helper function to find and aggregate browser metrics
  const findBrowserMetric = (entry: typeof data.intermediate[0], metricType: string, percentile: keyof SummaryStats) => {
    const matchingKeys = Object.keys(entry.summaries).filter(key => 
      key.startsWith(`browser.page.${metricType}.`)
    );
    
    if (matchingKeys.length === 0) return 0;
    
    // Calculate weighted average based on count
    let totalValue = 0;
    let totalCount = 0;
    
    matchingKeys.forEach(key => {
      const stats = entry.summaries[key];
      if (stats && stats[percentile] !== undefined) {
        totalValue += (stats[percentile] as number) * stats.count;
        totalCount += stats.count;
      }
    });
    
    return totalCount > 0 ? totalValue / totalCount : 0;
  };

  // Prepare time series data
  const allTimeSeriesData = data.intermediate.map((entry, index) => {
    const timestamp = new Date(entry.firstCounterAt).toLocaleTimeString();
    const periodSeconds = calculatePeriodSeconds(entry);
    
    // Calculate request rate from counters if rates are empty
    const httpRequestRate = entry.rates["http.request_rate"] || 
      (isBrowserData ? (entry.counters["browser.http_requests"] || 0) / periodSeconds : 
       (entry.counters["http.requests"] || 0) / periodSeconds);
    
    return {
      time: timestamp,
      index,
      // HTTP/Browser request rate
      httpRequestRate,
      
      // VU metrics
      vusCreated: entry.counters["vusers.created"] || 0,
      vusActive: entry.counters["vusers.active"] || 0,
      vusCompleted: entry.counters["vusers.completed"] || 0,
      vusFailed: entry.counters["vusers.failed"] || 0,
      
      // Response time metrics - prioritize browser metrics if available
      responseTimeP50: findBrowserMetric(entry, "TTFB", "p50") || entry.summaries["http.response_time"]?.p50 || 0,
      responseTimeP95: findBrowserMetric(entry, "TTFB", "p95") || entry.summaries["http.response_time"]?.p95 || 0,
      responseTimeP99: findBrowserMetric(entry, "TTFB", "p99") || entry.summaries["http.response_time"]?.p99 || 0,
      responseTimeMax: findBrowserMetric(entry, "TTFB", "max") || entry.summaries["http.response_time"]?.max || 0,
      
      // Browser-specific metrics
      fcpP50: findBrowserMetric(entry, "FCP", "p50"),
      fcpP95: findBrowserMetric(entry, "FCP", "p95"),
      lcpP50: findBrowserMetric(entry, "LCP", "p50"),
      lcpP95: findBrowserMetric(entry, "LCP", "p95"),
      
      // Session length metrics
      sessionLengthMean: entry.summaries["vusers.session_length"]?.mean || 0,
      sessionLengthP95: entry.summaries["vusers.session_length"]?.p95 || 0,
      sessionLengthP99: entry.summaries["vusers.session_length"]?.p99 || 0,
    };
  });

  // Use all time series data (no filtering)
  const timeSeriesData = allTimeSeriesData;

  // HTTP status codes data
  const httpCodesData = Object.entries(data.aggregate.counters)
    .filter(([key]) => key.startsWith("http.codes.") || key.startsWith("browser.page.codes."))
    .map(([key, value]) => ({
      code: key.replace("http.codes.", "").replace("browser.page.codes.", ""),
      count: value,
    }));

  // User flows data
  const userFlowsData = Object.entries(data.aggregate.counters)
    .filter(([key]) => key.startsWith("vusers.created_by_name."))
    .map(([key, value]) => ({
      flow: key.replace("vusers.created_by_name.", ""),
      count: value,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performance Charts</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Rate */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">
              {isBrowserData ? "Browser Request Rate" : "HTTP Request Rate"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={timeSeriesData}
                onMouseMove={(e) => {
                  if (e && e.activeLabel && onMouseMove) {
                    const index = timeSeriesData.findIndex(item => item.time === e.activeLabel);
                    onMouseMove(index >= 0 ? index : null);
                  }
                }}
                onMouseLeave={() => onMouseMove && onMouseMove(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Line 
                  type="monotone" 
                  dataKey="httpRequestRate" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                  name="Request Rate"
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {activeIndex !== null && activeIndex !== undefined && (
                  <ReferenceLine 
                    x={timeSeriesData[activeIndex]?.time} 
                    stroke="#FF6B6B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Virtual Users */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Virtual Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={timeSeriesData}
                onMouseMove={(e) => {
                  if (e && e.activeLabel && onMouseMove) {
                    const index = timeSeriesData.findIndex(item => item.time === e.activeLabel);
                    onMouseMove(index >= 0 ? index : null);
                  }
                }}
                onMouseLeave={() => onMouseMove && onMouseMove(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Line type="monotone" dataKey="vusCreated" stroke="#10B981" strokeWidth={2} dot={false} name="Created" />
                <Line type="monotone" dataKey="vusActive" stroke="#3B82F6" strokeWidth={2} dot={false} name="Active" />
                <Line type="monotone" dataKey="vusCompleted" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Completed" />
                <Line type="monotone" dataKey="vusFailed" stroke="#EF4444" strokeWidth={2} dot={false} name="Failed" />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {activeIndex !== null && activeIndex !== undefined && (
                  <ReferenceLine 
                    x={timeSeriesData[activeIndex]?.time} 
                    stroke="#FF6B6B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Time / TTFB */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">
              {isBrowserData ? "Time To First Byte (TTFB)" : "Response Time Percentiles"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={timeSeriesData}
                onMouseMove={(e) => {
                  if (e && e.activeLabel && onMouseMove) {
                    const index = timeSeriesData.findIndex(item => item.time === e.activeLabel);
                    onMouseMove(index >= 0 ? index : null);
                  }
                }}
                onMouseLeave={() => onMouseMove && onMouseMove(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Line type="monotone" dataKey="responseTimeP50" stroke="#10B981" strokeWidth={2} dot={false} name="P50" />
                <Line type="monotone" dataKey="responseTimeP95" stroke="#F59E0B" strokeWidth={2} dot={false} name="P95" />
                <Line type="monotone" dataKey="responseTimeP99" stroke="#EF4444" strokeWidth={2} dot={false} name="P99" />
                <Line type="monotone" dataKey="responseTimeMax" stroke="#7C3AED" strokeWidth={2} dot={false} name="Max" />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {activeIndex !== null && activeIndex !== undefined && (
                  <ReferenceLine 
                    x={timeSeriesData[activeIndex]?.time} 
                    stroke="#FF6B6B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Browser Metrics or Session Length */}
        {isBrowserData ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Core Web Vitals</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={timeSeriesData}
                  onMouseMove={(e) => {
                    if (e && e.activeLabel && onMouseMove) {
                      const index = timeSeriesData.findIndex(item => item.time === e.activeLabel);
                      onMouseMove(index >= 0 ? index : null);
                    }
                  }}
                  onMouseLeave={() => onMouseMove && onMouseMove(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Line type="monotone" dataKey="fcpP50" stroke="#10B981" strokeWidth={2} dot={false} name="FCP P50" />
                  <Line type="monotone" dataKey="fcpP95" stroke="#F59E0B" strokeWidth={2} dot={false} name="FCP P95" />
                  <Line type="monotone" dataKey="lcpP50" stroke="#3B82F6" strokeWidth={2} dot={false} name="LCP P50" />
                  <Line type="monotone" dataKey="lcpP95" stroke="#EF4444" strokeWidth={2} dot={false} name="LCP P95" />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {activeIndex !== null && activeIndex !== undefined && (
                    <ReferenceLine 
                      x={timeSeriesData[activeIndex]?.time} 
                      stroke="#FF6B6B" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Session Length</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={timeSeriesData}
                  onMouseMove={(e) => {
                    if (e && e.activeLabel && onMouseMove) {
                      const index = timeSeriesData.findIndex(item => item.time === e.activeLabel);
                      onMouseMove(index >= 0 ? index : null);
                    }
                  }}
                  onMouseLeave={() => onMouseMove && onMouseMove(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Line type="monotone" dataKey="sessionLengthMean" stroke="#10B981" strokeWidth={2} dot={false} name="Mean" />
                  <Line type="monotone" dataKey="sessionLengthP95" stroke="#F59E0B" strokeWidth={2} dot={false} name="P95" />
                  <Line type="monotone" dataKey="sessionLengthP99" stroke="#EF4444" strokeWidth={2} dot={false} name="P99" />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {activeIndex !== null && activeIndex !== undefined && (
                    <ReferenceLine 
                      x={timeSeriesData[activeIndex]?.time} 
                      stroke="#FF6B6B" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HTTP Status Codes */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">
              {isBrowserData ? "Page Status Codes" : "HTTP Status Codes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={httpCodesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="code" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top User Flows */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 User Flows</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-400">Flow Name</TableHead>
                  <TableHead className="text-slate-400 text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userFlowsData.map((flow, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{flow.flow}</TableCell>
                    <TableCell className="text-right font-mono">{flow.count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
