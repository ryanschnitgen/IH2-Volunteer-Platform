"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAdmin } from "@backend/lib/admin";
import * as XLSX from 'xlsx';

export default function ImportHours() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [matchPreview, setMatchPreview] = useState<any>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setResult(null);
    setMatchPreview(null);

    try {
      // Read and preview file
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Show preview of first 5 rows
      setPreview(jsonData.slice(0, 5));

      // Load match preview
      await loadMatchPreview(jsonData);
    } catch (err: any) {
      setError("Failed to read Excel file: " + err.message);
    }
  };

  const loadMatchPreview = async (excelData: any[]) => {
    if (!user?.email) return;

    setLoadingMatch(true);
    try {
      // Get all existing volunteers from database
      const response = await fetch(`/api/admin/import-hours?userEmail=${encodeURIComponent(user.email)}`);
      const dbData = await response.json();

      if (!response.ok) {
        throw new Error(dbData.error || "Failed to load volunteers");
      }

      // Create a map of volunteers by name
      const dbVolunteers = new Map();
      dbData.volunteers.forEach((v: any) => {
        const key = v.name.toLowerCase().trim();
        dbVolunteers.set(key, v);
      });

      // Get unique volunteers from Excel
      const excelVolunteers = new Map();
      excelData.forEach((row: any) => {
        if (row.FirstName && row.LastName) {
          const name = `${row.FirstName} ${row.LastName}`;
          const key = name.toLowerCase().trim();
          if (!excelVolunteers.has(key)) {
            excelVolunteers.set(key, {
              name,
              firstName: row.FirstName,
              lastName: row.LastName,
              username: row.Username,
            });
          }
        }
      });

      // Check matches
      const matched = [];
      const notFound = [];

      for (const [key, excelVol] of excelVolunteers.entries()) {
        const dbVol = dbVolunteers.get(key);
        if (dbVol) {
          matched.push({
            name: excelVol.name,
            email: dbVol.email,
            hasAccount: dbVol.hasAccount,
            status: 'match',
          });
        } else {
          notFound.push({
            name: excelVol.name,
            username: excelVol.username,
            status: 'new',
          });
        }
      }

      setMatchPreview({
        totalRows: excelData.length,
        uniqueVolunteers: excelVolunteers.size,
        matched: matched.length,
        notFound: notFound.length,
        matchedList: matched,
        notFoundList: notFound,
      });
    } catch (err: any) {
      console.error("Failed to load match preview:", err);
    } finally {
      setLoadingMatch(false);
    }
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Send to API
      const response = await fetch("/api/admin/import-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          data: jsonData,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to import hours");
      }

      setResult(responseData);
    } catch (err: any) {
      setError(err.message || "Failed to import hours");
    } finally {
      setImporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Import Historical Hours
        </h1>
        <p className="text-gray-600 mb-8">
          Upload an Excel file with volunteer hours from the legacy system
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">✓ Import Successful</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Total Rows:</strong> {result.results.total}</p>
              <p><strong>Hours Imported:</strong> {result.results.imported}</p>
              <p><strong>Volunteers Matched:</strong> {result.results.matched}</p>
              <p><strong>New Volunteers Created:</strong> {result.results.created}</p>
              <p><strong>Skipped (duplicates/invalid):</strong> {result.results.skipped}</p>
              {result.results.errors.length > 0 && (
                <p className="text-red-700"><strong>Errors:</strong> {result.results.errors.length}</p>
              )}
            </div>
            {result.results.errors.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">View Errors</summary>
                <pre className="text-xs mt-2 overflow-auto bg-white p-2 rounded">
                  {JSON.stringify(result.results.errors, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Expected File Format
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>Your Excel file should have these columns:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>DateVolunteered</strong> - Date in M/D/YY format (e.g., 12/11/25)</li>
              <li><strong>HoursWorked</strong> - Number of hours (e.g., 3, 2.5)</li>
              <li><strong>FirstName</strong> - Volunteer's first name</li>
              <li><strong>LastName</strong> - Volunteer's last name</li>
              <li><strong>ActivityCategoryName</strong> - Category (e.g., "Angel Tree")</li>
              <li><strong>ActivityName</strong> - Activity description</li>
              <li><strong>Username</strong> - (Optional) Legacy username</li>
            </ul>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
              <p className="font-semibold text-blue-800">ℹ️ Note</p>
              <p className="text-blue-700 text-sm">
                The system will automatically match volunteers by name. If a volunteer
                doesn't exist, a new profile will be created with a legacy email address.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upload File
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Excel File (.xlsx)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                  cursor-pointer"
              />
            </div>

            {preview.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Preview (First 5 Rows)</h3>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-2 py-1">Date</th>
                          <th className="border px-2 py-1">Hours</th>
                          <th className="border px-2 py-1">Name</th>
                          <th className="border px-2 py-1">Category</th>
                          <th className="border px-2 py-1">Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row: any, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border px-2 py-1">{row.DateVolunteered}</td>
                            <td className="border px-2 py-1">{row.HoursWorked}</td>
                            <td className="border px-2 py-1">{row.FirstName} {row.LastName}</td>
                            <td className="border px-2 py-1">{row.ActivityCategoryName}</td>
                            <td className="border px-2 py-1">{row.ActivityName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {loadingMatch && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Checking volunteer matches...</p>
                  </div>
                )}

                {matchPreview && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-3">📊 Match Analysis</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded p-3">
                        <div className="text-2xl font-bold text-gray-900">{matchPreview.totalRows}</div>
                        <div className="text-sm text-gray-600">Total Hour Entries</div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <div className="text-2xl font-bold text-green-600">{matchPreview.matched}</div>
                        <div className="text-sm text-gray-600">Will Match Existing</div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <div className="text-2xl font-bold text-orange-600">{matchPreview.notFound}</div>
                        <div className="text-sm text-gray-600">Will Create New</div>
                      </div>
                    </div>

                    {matchPreview.matchedList.length > 0 && (
                      <details className="mb-2">
                        <summary className="cursor-pointer font-semibold text-green-800 hover:text-green-900">
                          ✓ {matchPreview.matched} Volunteers Will Match to Existing Profiles
                        </summary>
                        <div className="mt-2 max-h-48 overflow-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-green-100">
                              <tr>
                                <th className="border px-2 py-1 text-left">Name</th>
                                <th className="border px-2 py-1 text-left">Email</th>
                                <th className="border px-2 py-1 text-left">Has Account</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {matchPreview.matchedList.map((v: any, i: number) => (
                                <tr key={i} className="hover:bg-green-50">
                                  <td className="border px-2 py-1">{v.name}</td>
                                  <td className="border px-2 py-1">{v.email}</td>
                                  <td className="border px-2 py-1">{v.hasAccount ? 'Yes ✓' : 'No'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}

                    {matchPreview.notFoundList.length > 0 && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-orange-800 hover:text-orange-900">
                          ⚠️ {matchPreview.notFound} Volunteers Not Found (Will Create New Profiles)
                        </summary>
                        <div className="mt-2 max-h-48 overflow-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-orange-100">
                              <tr>
                                <th className="border px-2 py-1 text-left">Name</th>
                                <th className="border px-2 py-1 text-left">Will Create Email</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {matchPreview.notFoundList.map((v: any, i: number) => (
                                <tr key={i} className="hover:bg-orange-50">
                                  <td className="border px-2 py-1">{v.name}</td>
                                  <td className="border px-2 py-1 text-xs text-gray-600">
                                    {v.username ? `${v.username.toLowerCase()}@legacy.ih2.org` : 'legacy email'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? "Importing..." : "Import Hours"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
