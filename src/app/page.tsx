"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArtilleryLog } from "@/types/artillery";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const [data, setData] = useState<ArtilleryLog | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = () => {
      const rawData = reader.result;
      if (typeof rawData === "string") {
        try {
          const jsonData: ArtilleryLog = JSON.parse(rawData);
          setData(jsonData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/json": [".json"] },
    onDrop,
  });

  if (data) {
    return <Dashboard data={data} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Artillery Performance Dashboard</h1>
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-slate-400 transition-colors"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-slate-300">Drop the JSON file here...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-300">Drag & drop your <code className="bg-slate-800 px-2 py-1 rounded">results.json</code> file here</p>
              <p className="text-slate-500 text-sm">or click to select a file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
