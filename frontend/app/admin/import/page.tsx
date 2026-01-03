"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { isAdmin } from "@backend/lib/admin";

interface ImportResults {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

export default function ImportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any[]>([]);

  // Check admin access
  if (user && !isAdmin(user.email)) {
    router.push("/");
    return null;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setResults(null);

    // Parse CSV for preview
    const text = await selectedFile.text();
    const rows = parseCSV(text);
    setPreview(rows.slice(0, 5)); // Show first 5 rows
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim().replace(/^"|"$/g, '') || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleImport = async () => {
    if (!file) return;

    setProcessing(true);
    setError("");

    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      console.log('Sending CSV data:', csvData.length, 'rows');

      const response = await fetch('/api/volunteers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResults(data);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Import Volunteer Data
        </h1>
        <p className="text-gray-600 mb-8">
          Upload your CSV file from the old platform to import volunteer profiles
        </p>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Step 1: Select CSV File
          </h2>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={processing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700 disabled:opacity-50"
          />

          {file && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>File:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 2: Preview Data (First 5 rows)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 text-left">Name</th>
                    <th className="px-2 py-2 text-left">Email</th>
                    <th className="px-2 py-2 text-left">Phone</th>
                    <th className="px-2 py-2 text-left">City</th>
                    <th className="px-2 py-2 text-left">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2">{row.FirstName} {row.LastName}</td>
                      <td className="px-2 py-2">{row.EmailAddress}</td>
                      <td className="px-2 py-2">{row.CellPhone || row.HomePhone || '-'}</td>
                      <td className="px-2 py-2">{row.City || '-'}</td>
                      <td className="px-2 py-2">{row.HoursWorked || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Button */}
        {file && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 3: Import Data
            </h2>
            <button
              onClick={handleImport}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Importing..." : "Import Volunteers"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Import Complete!
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-semibold">Total Rows</p>
                <p className="text-2xl font-bold text-blue-900">{results.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-semibold">Imported</p>
                <p className="text-2xl font-bold text-green-900">{results.imported}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-600 font-semibold">Updated</p>
                <p className="text-2xl font-bold text-yellow-900">{results.updated}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 font-semibold">Skipped</p>
                <p className="text-2xl font-bold text-gray-900">{results.skipped}</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-2">
                  Errors ({results.errors.length}):
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  {results.errors.map((err, idx) => (
                    <p key={idx} className="text-sm text-red-700">
                      • {err.email}: {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => router.push('/admin/volunteers')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                View Volunteers
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
