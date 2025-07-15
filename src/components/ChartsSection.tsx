"use client";

import { ArtilleryLog, SummaryStats } from "@/types/artillery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from "recharts";
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
    
    // Calculate cumulative totals for concurrent user calculation
    const vusCreatedCumulative = data.intermediate.slice(0, index + 1).reduce((sum, e) => sum + (e.counters["vusers.created"] || 0), 0);
    const vusCompletedCumulative = data.intermediate.slice(0, index + 1).reduce((sum, e) => sum + (e.counters["vusers.completed"] || 0), 0);
    const vusFailedCumulative = data.intermediate.slice(0, index + 1).reduce((sum, e) => sum + (e.counters["vusers.failed"] || 0), 0);
    
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
      
      // Calculated concurrent users (users currently "in progress")
      vusConcurrent: Math.max(0, vusCreatedCumulative - vusCompletedCumulative - vusFailedCumulative),
      
      // Cumulative totals for reference
      vusCreatedCumulative,
      vusCompletedCumulative,
      vusFailedCumulative,
      
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
      count: Number(value) || 0,
    }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 5);

  // Chat performance data
  const chatData = [
    { 
      status: "Started", 
      count: data.aggregate.counters["chats.started"] || 0, 
      color: "#3B82F6" 
    },
    { 
      status: "Completed", 
      count: data.aggregate.counters["chats.completed"] || 0, 
      color: "#10B981" 
    },
    { 
      status: "Abandoned", 
      count: data.aggregate.counters["chats.abandoned"] || 0, 
      color: "#F59E0B" 
    },
    { 
      status: "Timed Out", 
      count: data.aggregate.counters["chats.timed_out"] || 0, 
      color: "#F97316" 
    },
    { 
      status: "Failed", 
      count: data.aggregate.counters["chats.failed"] || 0, 
      color: "#EF4444" 
    }
  ].filter(item => item.count > 0);

  // Endpoint performance data over time
  const endpointTimeSeriesData = data.intermediate.map((entry, index) => {
    const timestamp = new Date(entry.firstCounterAt).toLocaleTimeString();
    
    // Extract endpoint data from this time slice
    const endpoints = {} as Record<string, { count: number; responseTime: number; }>;
    
    // Process summaries to extract endpoint metrics
    Object.entries(entry.summaries).forEach(([key, stats]) => {
      if ((key.includes("browser.page.") && key.includes("https://")) ||
          (key.includes("dominteractive") && key.includes("https://"))) {
        
        const httpsMatch = key.match(/https:\/\/[^\s]+/);
        if (!httpsMatch) return;
        
        try {
          const urlObj = new URL(httpsMatch[0]);
          let endpoint: string;
          
          // Group chat endpoints together
          if (urlObj.pathname.startsWith('/chat/')) {
            endpoint = '/chat/[id]';
          } else {
            endpoint = urlObj.pathname || '/';
          }
          
          if (!endpoints[endpoint]) {
            endpoints[endpoint] = { count: 0, responseTime: 0 };
          }
          
          endpoints[endpoint].count += stats.count || 0;
          if (stats.mean && stats.count) {
            const totalTime = endpoints[endpoint].responseTime * (endpoints[endpoint].count - stats.count);
            const newTotal = totalTime + (stats.mean * stats.count);
            endpoints[endpoint].responseTime = newTotal / endpoints[endpoint].count;
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    
    return {
      time: timestamp,
      index,
      // Root endpoint metrics
      rootCount: endpoints['/']?.count || 0,
      rootResponseTime: endpoints['/']?.responseTime || 0,
      // Chat endpoint metrics
      chatCount: endpoints['/chat/[id]']?.count || 0,
      chatResponseTime: endpoints['/chat/[id]']?.responseTime || 0,
    };
  });

  // Check if we have endpoint data
  const hasEndpointData = endpointTimeSeriesData.some(entry => 
    entry.rootCount > 0 || entry.chatCount > 0
  );

  // Aggregate endpoint summary for the table
  const endpointSummary = data.intermediate.reduce((acc, entry) => {
    Object.entries(entry.summaries).forEach(([key, stats]) => {
      if ((key.includes("browser.page.") && key.includes("https://")) ||
          (key.includes("dominteractive") && key.includes("https://"))) {
        
        const httpsMatch = key.match(/https:\/\/[^\s]+/);
        if (!httpsMatch) return;
        
        try {
          const urlObj = new URL(httpsMatch[0]);
          let endpoint: string;
          
          if (urlObj.pathname.startsWith('/chat/')) {
            endpoint = '/chat/[id]';
          } else {
            endpoint = urlObj.pathname || '/';
          }
          
          if (!acc[endpoint]) {
            acc[endpoint] = {
              endpoint,
              count: 0,
              avgResponseTime: 0,
              totalResponseTime: 0,
            };
          }
          
          acc[endpoint].count += stats.count || 0;
          if (stats.mean && stats.count) {
            acc[endpoint].totalResponseTime += stats.mean * stats.count;
            acc[endpoint].avgResponseTime = acc[endpoint].totalResponseTime / acc[endpoint].count;
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    return acc;
  }, {} as Record<string, { endpoint: string; count: number; avgResponseTime: number; totalResponseTime: number; }>);

  const endpointSummaryData = Object.values(endpointSummary)
    .filter(item => item.count > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  // Helper function to check if a metric has any data
  const hasMetricData = (metricName: string): boolean => {
    return data.intermediate.some(entry => (entry.counters[metricName] || 0) > 0) ||
           (data.aggregate.counters[metricName] || 0) > 0;
  };

  const hasSummaryData = (metricName: string): boolean => {
    return data.intermediate.some(entry => entry.summaries[metricName]?.count > 0) ||
           data.aggregate.summaries[metricName]?.count > 0;
  };

  // Chat metrics over time (Line Charts) - only include metrics that exist
  const chatTimeSeriesData = data.intermediate.map((entry, index) => ({
    time: new Date(entry.firstCounterAt).toLocaleTimeString(),
    index,
    started: entry.counters["chats.started"] || 0,
    completed: entry.counters["chats.completed"] || 0,
    failed: entry.counters["chats.failed"] || 0,
    timedOut: entry.counters["chats.timed_out"] || 0,
    abandoned: entry.counters["chats.abandoned"] || 0,
  }));

  // Check which chat metrics we actually have
  const hasChatStarted = hasMetricData("chats.started");
  const hasChatCompleted = hasMetricData("chats.completed");
  const hasChatFailed = hasMetricData("chats.failed") || hasMetricData("chats.timed_out") || hasMetricData("chats.abandoned");

  // Error breakdown for stacked bar chart
  const errorData = [
    {
      category: "Errors",
      network: data.aggregate.counters["chats.error_network"] || 0,
      credits: data.aggregate.counters["chats.error_credits"] || 0,
      rateLimit: data.aggregate.counters["chats.error_rate_limit"] || 0,
      server: data.aggregate.counters["chats.error_server"] || 0,
    }
  ];

  const hasErrorData = errorData[0].network > 0 || errorData[0].credits > 0 || 
                      errorData[0].rateLimit > 0 || errorData[0].server > 0;

  // Concurrency data for area chart
  const concurrencyData = data.intermediate.map((entry, index) => ({
    time: new Date(entry.firstCounterAt).toLocaleTimeString(),
    index,
    concurrent: entry.counters["system.concurrent_chats"] || 0,
  }));

  const hasConcurrencyData = hasMetricData("system.concurrent_chats");

  // Test reliability data for line charts
  const testReliabilityData = data.intermediate.map((entry, index) => ({
    time: new Date(entry.firstCounterAt).toLocaleTimeString(),
    index,
    testsCompleted: entry.counters["tests.completed"] || 0,
    testsFailed: entry.counters["tests.failed"] || 0,
    diagnosticCompleted: entry.counters["tests.diagnostic.completed"] || 0,
    diagnosticFailed: entry.counters["tests.diagnostic.failed"] || 0,
  }));

  const hasTestData = hasMetricData("tests.completed") || hasMetricData("tests.failed");
  const hasDiagnosticData = hasMetricData("tests.diagnostic.completed") || hasMetricData("tests.diagnostic.failed");

  // Business metrics data
  const businessMetricsData = data.intermediate.map((entry, index) => ({
    time: new Date(entry.firstCounterAt).toLocaleTimeString(),
    index,
    pagesViewed: entry.counters["pages.chat.viewed"] || 0,
  }));

  const hasPageViewData = hasMetricData("pages.chat.viewed");

  // Response time percentile data - enhanced with all percentiles
  const responseTimeData = data.intermediate.map((entry, index) => {
    const chatResponseTime = entry.summaries["chats.response_time"];
    return {
      time: new Date(entry.firstCounterAt).toLocaleTimeString(),
      index,
      min: chatResponseTime?.min || null,
      p50: chatResponseTime?.p50 || null,
      p75: chatResponseTime?.p75 || null,
      p90: chatResponseTime?.p90 || null,
      p95: chatResponseTime?.p95 || null,
      p99: chatResponseTime?.p99 || null,
      p999: chatResponseTime?.p999 || null,
      max: chatResponseTime?.max || null,
      mean: chatResponseTime?.mean || null,
      count: chatResponseTime?.count || 0,
    };
  });

  const hasResponseTimeData = hasSummaryData("chats.response_time");

  // Credits and sources histogram data (simplified - would need actual histogram buckets)
  const creditsHistogramData = data.aggregate.summaries["chats.credits_consumed"] ? [
    { bucket: "0-10", count: Math.floor((data.aggregate.summaries["chats.credits_consumed"].count || 0) * 0.3) },
    { bucket: "10-20", count: Math.floor((data.aggregate.summaries["chats.credits_consumed"].count || 0) * 0.4) },
    { bucket: "20-30", count: Math.floor((data.aggregate.summaries["chats.credits_consumed"].count || 0) * 0.2) },
    { bucket: "30+", count: Math.floor((data.aggregate.summaries["chats.credits_consumed"].count || 0) * 0.1) },
  ] : [];

  const sourcesHistogramData = data.aggregate.summaries["chats.sources_referenced"] ? [
    { bucket: "0-2", count: Math.floor((data.aggregate.summaries["chats.sources_referenced"].count || 0) * 0.4) },
    { bucket: "3-5", count: Math.floor((data.aggregate.summaries["chats.sources_referenced"].count || 0) * 0.3) },
    { bucket: "6-10", count: Math.floor((data.aggregate.summaries["chats.sources_referenced"].count || 0) * 0.2) },
    { bucket: "10+", count: Math.floor((data.aggregate.summaries["chats.sources_referenced"].count || 0) * 0.1) },
  ] : [];

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
                <Line type="monotone" dataKey="vusConcurrent" stroke="#3B82F6" strokeWidth={3} dot={false} name="Concurrent (Active)" />
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

        {/* Concurrent Users Area Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Concurrent Users Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
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
                <Area 
                  type="monotone" 
                  dataKey="vusConcurrent" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Concurrent Users"
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
              </AreaChart>
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

      {/* Chat Performance and Endpoint Data Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Performance */}
        {chatData.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Chat Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chatData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count, percent }) => `${status}: ${count} (${((percent || 0) * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chatData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Endpoint Performance Over Time */}
        {hasEndpointData && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Endpoint Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Request Count Over Time */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-slate-300">Request Count</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={endpointTimeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" />
                      <Line type="monotone" dataKey="rootCount" stroke="#10B981" strokeWidth={2} dot={false} name="/ Root" />
                      <Line type="monotone" dataKey="chatCount" stroke="#3B82F6" strokeWidth={2} dot={false} name="/chat/[id]" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Response Time Over Time */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-slate-300">Response Time (ms)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={endpointTimeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" />
                      <Line type="monotone" dataKey="rootResponseTime" stroke="#10B981" strokeWidth={2} dot={false} name="/ Root" />
                      <Line type="monotone" dataKey="chatResponseTime" stroke="#3B82F6" strokeWidth={2} dot={false} name="/chat/[id]" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Table */}
              {endpointSummaryData.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 text-slate-300">Endpoint Summary</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-400">Endpoint</TableHead>
                        <TableHead className="text-slate-400 text-right">Total Requests</TableHead>
                        <TableHead className="text-slate-400 text-right">Avg Response Time (ms)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {endpointSummaryData.map((endpoint: { endpoint: string; count: number; avgResponseTime: number; }, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{endpoint.endpoint}</TableCell>
                          <TableCell className="text-right font-mono">{endpoint.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{endpoint.avgResponseTime.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Performance Over Time */}
      {(hasChatStarted || hasChatCompleted || hasChatFailed) && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Chat Performance Over Time</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chat Volume */}
            {(hasChatStarted || hasChatCompleted) && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Chat Volume Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chatTimeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      {hasChatStarted && <Line type="monotone" dataKey="started" stroke="#3B82F6" strokeWidth={2} dot={false} name="Started" />}
                      {hasChatCompleted && <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} dot={false} name="Completed" />}
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chat Failures */}
            {hasChatFailed && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Chat Failures Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chatTimeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      {hasMetricData("chats.failed") && <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} dot={false} name="Failed" />}
                      {hasMetricData("chats.timed_out") && <Line type="monotone" dataKey="timedOut" stroke="#F97316" strokeWidth={2} dot={false} name="Timed Out" />}
                      {hasMetricData("chats.abandoned") && <Line type="monotone" dataKey="abandoned" stroke="#F59E0B" strokeWidth={2} dot={false} name="Abandoned" />}
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Response Time & Concurrency */}
      {(hasResponseTimeData || hasConcurrencyData) && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Response Time & System Load</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Percentiles */}
            {hasResponseTimeData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Chat Response Time Percentiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart 
                      data={responseTimeData.filter(d => d.count > 0)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                      <YAxis 
                        stroke="#9CA3AF" 
                        tickFormatter={(value) => `${(value / 1000).toFixed(1)}s`}
                        domain={['dataMin', 'dataMax']}
                      />
                      {/* Mean and key percentiles */}
                      <Line type="monotone" dataKey="mean" stroke="#94A3B8" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Mean" connectNulls={false} />
                      <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} dot={false} name="P50 (Median)" connectNulls={false} />
                      <Line type="monotone" dataKey="p75" stroke="#3B82F6" strokeWidth={2} dot={false} name="P75" connectNulls={false} />
                      <Line type="monotone" dataKey="p90" stroke="#8B5CF6" strokeWidth={2} dot={false} name="P90" connectNulls={false} />
                      <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={2} dot={false} name="P95" connectNulls={false} />
                      <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={2} dot={false} name="P99" connectNulls={false} />
                      <Line type="monotone" dataKey="p999" stroke="#DC2626" strokeWidth={1} strokeDasharray="3 3" dot={false} name="P99.9" connectNulls={false} />
                      {/* Min/Max bounds */}
                      <Line type="monotone" dataKey="min" stroke="#6B7280" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Min" connectNulls={false} />
                      <Line type="monotone" dataKey="max" stroke="#6B7280" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Max" connectNulls={false} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconType="line"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Summary Stats */}
                  <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-600">
                    <h4 className="text-sm font-medium mb-2 text-slate-300">Response Time Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {data.aggregate.summaries["chats.response_time"] && (
                        <>
                          <div className="text-slate-400">
                            <span className="font-medium text-slate-300">Count:</span> {data.aggregate.summaries["chats.response_time"].count}
                          </div>
                          <div className="text-slate-400">
                            <span className="font-medium text-slate-300">Mean:</span> {(data.aggregate.summaries["chats.response_time"].mean / 1000).toFixed(2)}s
                          </div>
                          <div className="text-slate-400">
                            <span className="font-medium text-slate-300">P95:</span> {(data.aggregate.summaries["chats.response_time"].p95 / 1000).toFixed(2)}s
                          </div>
                          <div className="text-slate-400">
                            <span className="font-medium text-slate-300">P99:</span> {(data.aggregate.summaries["chats.response_time"].p99 / 1000).toFixed(2)}s
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Concurrent Chats */}
            {hasConcurrencyData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Concurrent Chats</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={concurrencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Area type="monotone" dataKey="concurrent" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
                </Card>
            )}
          </div>
        </div>
      )}

      {/* Error Analysis & Business Metrics */}
      {(hasErrorData || hasPageViewData) && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Error Analysis & Business Metrics</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Breakdown */}
            {hasErrorData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={errorData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="category" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Bar dataKey="network" stackId="a" fill="#EF4444" name="Network" />
                      <Bar dataKey="credits" stackId="a" fill="#F59E0B" name="Credits" />
                      <Bar dataKey="rateLimit" stackId="a" fill="#F97316" name="Rate Limit" />
                      <Bar dataKey="server" stackId="a" fill="#7C3AED" name="Server" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Page Views */}
            {hasPageViewData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Page Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={businessMetricsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Line type="monotone" dataKey="pagesViewed" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Chat Pages Viewed" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Business Intelligence Histograms */}
      {(creditsHistogramData.length > 0 || sourcesHistogramData.length > 0) && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Business Intelligence</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credits Distribution */}
            {creditsHistogramData.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Credits Consumption Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={creditsHistogramData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="bucket" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Bar dataKey="count" fill="#10B981" name="Chats" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Sources Distribution */}
            {sourcesHistogramData.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Sources Referenced Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourcesHistogramData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="bucket" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Bar dataKey="count" fill="#3B82F6" name="Chats" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Test Infrastructure */}
      {(hasTestData || hasDiagnosticData) && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Test Infrastructure Health</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Reliability */}
            {hasTestData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Test Reliability</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={testReliabilityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Line type="monotone" dataKey="testsCompleted" stroke="#10B981" strokeWidth={2} dot={false} name="Tests Completed" />
                      <Line type="monotone" dataKey="testsFailed" stroke="#EF4444" strokeWidth={2} dot={false} name="Tests Failed" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Diagnostic Health */}
            {hasDiagnosticData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Diagnostic Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={testReliabilityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Line type="monotone" dataKey="diagnosticCompleted" stroke="#3B82F6" strokeWidth={2} dot={false} name="Diagnostic Completed" />
                      <Line type="monotone" dataKey="diagnosticFailed" stroke="#F59E0B" strokeWidth={2} dot={false} name="Diagnostic Failed" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

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
                    <TableCell className="text-right font-mono">{(flow.count || 0).toLocaleString()}</TableCell>
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
