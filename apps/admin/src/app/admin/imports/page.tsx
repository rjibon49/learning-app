'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getVocabularyCategories } from '@/lib/api/vocabulary';
import { bulkImportVocabulary } from '@/lib/api/imports';
import type { VocabularyCategory } from '@/types/vocabulary';
import { LoadingState } from '@/components/feedback/state-views';

export default function BulkImportPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [categories, setCategories] = useState<VocabularyCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedApp) return;
    getVocabularyCategories(selectedApp.id).then(setCategories).catch(console.error);
  }, [selectedApp]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setResult(null);
    setError(null);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Filter rows that have at least german, english, bangla
        const validRows = results.data.filter((row: any) => row.german && row.english && row.bangla);
        if (validRows.length === 0) {
          setError('No valid rows found. Please ensure CSV headers match: german, english, bangla');
          setParsedData([]);
        } else {
          setParsedData(validRows);
        }
      },
      error: () => setError('Failed to parse CSV file.'),
    });
  };

  const handleImport = async () => {
    if (!selectedApp || parsedData.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await bulkImportVocabulary({
        appId: selectedApp.id,
        categoryId: selectedCategory || null,
        items: parsedData,
      });
      setResult({ success: true, count: res.importedCount });
      setFile(null);
      setParsedData([]);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading workspace..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk Import</h1>
        <p className="text-sm text-slate-500">Import hundreds of vocabulary words instantly via CSV for `{selectedApp.name}`.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Upload CSV File</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Target Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50 focus:outline-none"
              >
                <option value="">No Category (General)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex w-full items-center justify-center">
              <label htmlFor="csv-upload" className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100">
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
                  <p className="mb-1 text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                  <p className="text-xs text-slate-500">CSV file only</p>
                </div>
                <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="mt-4 text-xs text-slate-500 bg-blue-50 p-3 rounded-md">
              <p className="font-semibold text-blue-800 mb-1">Required CSV Headers:</p>
              <code className="text-blue-700">german, english, bangla</code>
              <p className="font-semibold text-blue-800 mt-2 mb-1">Optional Headers:</p>
              <code className="text-blue-700">article, pluralGerman, pronunciationBangla</code>
            </div>

            {parsedData.length > 0 && (
              <button 
                onClick={handleImport} 
                disabled={importing} 
                className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {importing ? 'Importing Data...' : `Import ${parsedData.length} Words`}
              </button>
            )}
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5" /> {error}
            </div>
          )}
          
          {result && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5" /> 
              Successfully imported {result.count} words into the database!
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full min-h-[400px]">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-900">Data Preview</h2>
              {parsedData.length > 0 && <span className="rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">{parsedData.length} Rows</span>}
            </div>
            
            {parsedData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500 p-8 text-center">
                Upload a CSV file to preview the data before importing.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-white sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">German</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">English</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Bangla</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Article</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{row.german}</td>
                        <td className="px-4 py-2 text-slate-600">{row.english}</td>
                        <td className="px-4 py-2 text-slate-600">{row.bangla}</td>
                        <td className="px-4 py-2 text-slate-500">{row.article || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 100 && (
                  <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                    Showing first 100 rows preview...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}