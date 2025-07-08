"use client";

import { ArtilleryLog } from "@/types/artillery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdditionalPanelsProps {
  data: ArtilleryLog;
}

export function AdditionalPanels({ data }: AdditionalPanelsProps) {
  // Detect data type: browser automation vs traditional HTTP
  const isBrowserData = data.aggregate.counters && Object.keys(data.aggregate.counters).some(key => key.startsWith("browser."));

  // Prepare histogram data
  let histogramData: { range: string; count: number }[] = [];
  let histogramTitle = "Response Time Histogram";

  if (isBrowserData) {
    // For browser data, show FCP histogram if available
    const fcpHistograms = Object.entries(data.aggregate.histograms || {})
      .filter(([key]) => key.startsWith("browser.page.FCP."));
    
    if (fcpHistograms.length > 0) {
      histogramTitle = "First Contentful Paint (FCP) Distribution";
      // Use the first FCP histogram found
      const [, fcpData] = fcpHistograms[0];
      histogramData = [
        { range: "P50", count: fcpData.p50 },
        { range: "P75", count: fcpData.p75 },
        { range: "P90", count: fcpData.p90 },
        { range: "P95", count: fcpData.p95 },
        { range: "P99", count: fcpData.p99 },
        { range: "Max", count: fcpData.max }
      ];
    }
  } else {
    // Traditional HTTP data
    const httpHistogram = data.aggregate.histograms["http.response_time"];
    if (httpHistogram) {
      histogramData = Object.entries(httpHistogram).map(([key, value]) => ({
        range: key,
        count: value as number
      }));
    }
  }

  // Request/URL breakdown data
  let urlRequestsData: { url: string; count: number }[] = [];
  let urlTableTitle = "Request Breakdown by URL";

  if (isBrowserData) {
    // For browser data, show page code breakdown
    urlTableTitle = "Page Response Codes";
    urlRequestsData = Object.entries(data.aggregate.counters)
      .filter(([key]) => key.startsWith("browser.page.codes."))
      .map(([key, value]) => ({
        url: key.replace("browser.page.codes.", ""),
        count: value,
      }))
      .sort((a, b) => b.count - a.count);
  } else {
    // Traditional HTTP data
    urlRequestsData = Object.entries(data.aggregate.counters)
      .filter(([key]) => key.startsWith("http.requests.") && !key.startsWith("http.requests.total"))
      .map(([key, value]) => ({
        url: key.replace("http.requests.", ""),
        count: value,
      }))
      .sort((a, b) => b.count - a.count);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Additional Panels</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histogram */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">{histogramTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="range" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* URL/Code Breakdown */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">{urlTableTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-400">
                    {isBrowserData ? "Response Code" : "URL"}
                  </TableHead>
                  <TableHead className="text-slate-400 text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urlRequestsData.length > 0 ? (
                  urlRequestsData.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{entry.url}</TableCell>
                      <TableCell className="text-right font-mono">{entry.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-400">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
