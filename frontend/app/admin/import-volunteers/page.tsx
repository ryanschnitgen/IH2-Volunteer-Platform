"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAdmin } from "@backend/lib/admin";
import * as XLSX from 'xlsx';

export default function ImportVolunteers() {
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
      // Read and preview file (supports both CSV and Excel)
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Show preview of first 5 rows
      setPreview(jsonData.slice(0, 5));

      // Load match preview
      await loadMatchPreview(jsonData);
    } catch (err: any) {
      setError("Failed to read file: " + err.message);
    }
  };

  const loadMatchPreview = async (excelData: any[]) => {
    if (!user?.email) return;

    setLoadingMatch(true);
    try {
      // Get all existing volunteers from database
      const response = await fetch(`/api/admin/import-volunteers?userEmail=${encodeURIComponent(user.email)}`);
      const dbData = await response.json();

      if (!response.ok) {
        throw new Error(dbData.error || "Failed to load volunteers");
      }

      // Create maps of volunteers by email and username
      const dbVolunteersByEmail = new Map();
      const dbVolunteersByUsername = new Map();

      dbData.volunteers.forEach((v: any) => {
        if (v.email) {
          dbVolunteersByEmail.set(v.email.toLowerCase(), v);
        }
        if (v.username) {
          dbVolunteersByUsername.set(v.username.toLowerCase(), v);
        }
      });

      // Get unique volunteers from CSV
      const excelVolunteers: any[] = [];
      excelData.forEach((row: any) => {
        const firstName = row.FirstName?.trim();
        const lastName = row.LastName?.trim();
        const email = row.EmailAddress?.trim().toLowerCase();
        const username = row.Username?.trim().toLowerCase().replace(/\s+/g, '');

        if (firstName && lastName) {
          excelVolunteers.push({
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            username: username || undefined,
            email: email || undefined,
          });
        }
      });

      // Check matches by email or username
      const willUpdate: any[] = [];
      const notFound: any[] = [];

      for (const excelVol of excelVolunteers) {
        // Try to match by email first, then username
        let dbVol = null;
        if (excelVol.email) {
          dbVol = dbVolunteersByEmail.get(excelVol.email);
        }
        if (!dbVol && excelVol.username) {
          dbVol = dbVolunteersByUsername.get(excelVol.username);
        }

        if (dbVol) {
          willUpdate.push({
            name: excelVol.name,
            username: excelVol.username,
            email: excelVol.email,
            currentEmail: dbVol.email || '(no email)',
            currentUsername: dbVol.username || '(no username)',
            hasAccount: dbVol.hasAccount,
            status: 'update',
          });
        } else {
          notFound.push({
            name: excelVol.name,
            email: excelVol.email || '(no email)',
            username: excelVol.username || '(no username)',
            status: 'not-found',
          });
        }
      }

      setMatchPreview({
        totalRows: excelData.length,
        uniqueVolunteers: excelVolunteers.length,
        willUpdate: willUpdate.length,
        willCreate: notFound.length,
        updateList: willUpdate,
        createList: notFound,
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

      // Send to API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      try {
        const response = await fetch("/api/admin/import-volunteers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: user.email,
            data: jsonData,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to import volunteers");
        }

        setResult(responseData);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error("Import timed out after 5 minutes. Try importing in smaller batches.");
        }
        throw err;
      }
    } catch (err: any) {
      setError(err.message || "Failed to import volunteers");
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
          Import Volunteers
        </h1>
        <p className="text-gray-600 mb-8">
          Upload a CSV file with volunteer information. Email is optional - volunteers without emails can sign up later.
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
              <p><strong>Matched Existing Volunteers:</strong> {result.results.matched || result.results.updated}</p>
              <p><strong>Actually Modified:</strong> {result.results.updated}</p>
              <p><strong>New Volunteers Created:</strong> {result.results.created} {result.results.attemptedCreate > 0 && `(attempted: ${result.results.attemptedCreate})`}</p>
              {result.results.skipped > 0 && (
                <p className="text-orange-700"><strong>Skipped (Missing Name):</strong> {result.results.skipped}</p>
              )}
              {result.results.errors && result.results.errors.length > 0 && (
                <p className="text-red-700"><strong>Errors:</strong> {result.results.errors.length}</p>
              )}
              {/* Summary breakdown */}
              <div className="mt-3 pt-3 border-t border-green-300">
                <p className="text-xs text-green-700">
                  <strong>Breakdown:</strong> {result.results.matched || 0} matched + {result.results.created || 0} created + {result.results.skipped || 0} skipped = {(result.results.matched || 0) + (result.results.created || 0) + (result.results.skipped || 0)} of {result.results.total}
                </p>
              </div>
            </div>
            {result.results.skippedDetails && result.results.skippedDetails.length > 0 && (
              <details className="mt-4" open>
                <summary className="cursor-pointer font-semibold text-orange-700">⚠️ View Skipped Rows ({result.results.skipped})</summary>
                <div className="text-xs mt-2 overflow-auto bg-white p-2 rounded max-h-64">
                  <table className="min-w-full text-xs">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="border px-2 py-1 text-left">CSV Row</th>
                        <th className="border px-2 py-1 text-left">Reason</th>
                        <th className="border px-2 py-1 text-left">FirstName</th>
                        <th className="border px-2 py-1 text-left">LastName</th>
                        <th className="border px-2 py-1 text-left">Email</th>
                        <th className="border px-2 py-1 text-left">Username</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.skippedDetails.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-orange-50">
                          <td className="border px-2 py-1">{row.row}</td>
                          <td className="border px-2 py-1 font-semibold">{row.reason}</td>
                          <td className="border px-2 py-1">{row.firstName}</td>
                          <td className="border px-2 py-1">{row.lastName}</td>
                          <td className="border px-2 py-1">{row.email}</td>
                          <td className="border px-2 py-1">{row.username}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            {result.results.errors && result.results.errors.length > 0 && (
              <details className="mt-4" open>
                <summary className="cursor-pointer font-semibold text-red-700">❌ View Errors ({result.results.errors.length})</summary>
                <pre className="text-xs mt-2 overflow-auto bg-white p-2 rounded max-h-64 text-red-800">
                  {JSON.stringify(result.results.errors, null, 2)}
                </pre>
              </details>
            )}
            {/* Show warning if creates failed */}
            {result.results.attemptedCreate > 0 && result.results.created === 0 && (
              <div className="mt-4 bg-red-100 border border-red-300 rounded p-3">
                <p className="text-red-800 font-semibold">⚠️ {result.results.attemptedCreate} volunteers failed to create!</p>
                <p className="text-red-700 text-sm mt-1">Check the server logs for details, or errors above.</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upload File
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File (.csv)
              </label>
              <input
                type="file"
                accept=".csv"
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
                          <th className="border px-2 py-1">Name</th>
                          <th className="border px-2 py-1">Username</th>
                          <th className="border px-2 py-1">Email</th>
                          <th className="border px-2 py-1">Phone</th>
                          <th className="border px-2 py-1">Hours Worked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row: any, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border px-2 py-1">{row.FirstName} {row.LastName}</td>
                            <td className="border px-2 py-1">{row.Username || '-'}</td>
                            <td className="border px-2 py-1">{row.EmailAddress || '-'}</td>
                            <td className="border px-2 py-1">{row.CellPhone || '-'}</td>
                            <td className="border px-2 py-1">{row.HoursWorked || 0}</td>
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
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded p-3">
                        <div className="text-2xl font-bold text-green-600">{matchPreview.willUpdate}</div>
                        <div className="text-sm text-gray-600">Will Update (Email + Username)</div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <div className="text-2xl font-bold text-blue-600">{matchPreview.willCreate}</div>
                        <div className="text-sm text-gray-600">Will Create New</div>
                      </div>
                    </div>

                    {matchPreview.updateList.length > 0 && (
                      <details className="mb-2">
                        <summary className="cursor-pointer font-semibold text-green-800 hover:text-green-900">
                          ✓ {matchPreview.willUpdate} Volunteers Will Be Updated
                        </summary>
                        <div className="mt-2 max-h-48 overflow-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-green-100">
                              <tr>
                                <th className="border px-2 py-1 text-left">Name</th>
                                <th className="border px-2 py-1 text-left">CSV Email</th>
                                <th className="border px-2 py-1 text-left">CSV Username</th>
                                <th className="border px-2 py-1 text-left">Current Email</th>
                                <th className="border px-2 py-1 text-left">Current Username</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {matchPreview.updateList.map((v: any, i: number) => (
                                <tr key={i} className="hover:bg-green-50">
                                  <td className="border px-2 py-1">{v.name}</td>
                                  <td className="border px-2 py-1 font-semibold text-blue-700">{v.email || '(no email)'}</td>
                                  <td className="border px-2 py-1 font-semibold text-green-700">{v.username || '(no username)'}</td>
                                  <td className="border px-2 py-1">{v.currentEmail}</td>
                                  <td className="border px-2 py-1">{v.currentUsername}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}

                    {matchPreview.createList && matchPreview.createList.length > 0 && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-blue-800 hover:text-blue-900">
                          + {matchPreview.willCreate} New Volunteers Will Be Created
                        </summary>
                        <div className="mt-2 max-h-48 overflow-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-blue-100">
                              <tr>
                                <th className="border px-2 py-1 text-left">Name</th>
                                <th className="border px-2 py-1 text-left">CSV Email</th>
                                <th className="border px-2 py-1 text-left">CSV Username</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {matchPreview.createList.map((v: any, i: number) => (
                                <tr key={i} className="hover:bg-blue-50">
                                  <td className="border px-2 py-1">{v.name}</td>
                                  <td className="border px-2 py-1 font-semibold text-blue-700">{v.email}</td>
                                  <td className="border px-2 py-1 font-semibold text-green-700">{v.username}</td>
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
              {importing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Importing {matchPreview?.uniqueVolunteers || preview.length} volunteers... This may take a few minutes.
                </div>
              ) : (
                "Import Volunteers"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
