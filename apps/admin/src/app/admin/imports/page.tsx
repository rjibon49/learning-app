'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
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
          setError('No valid rows found. Please ensure CSV headers match exactly: german, english, bangla');
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

  const downloadSampleCSV = () => {
    const headers = "german,english,bangla,article,pluralGerman,pronunciationBangla,difficulty\n";
    const sampleRow = "Apfel,Apple,আপেল,der,die Äpfel,আফেল,EASY\n";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "vocabulary_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading workspace..." />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" /> Bulk Import
          </h1>
          <p className="text-sm text-slate-500 mt-1">Import hundreds of vocabulary words instantly via CSV for <span className="font-semibold text-slate-700">{selectedApp.name}</span>.</p>
        </div>
        <button 
          onClick={downloadSampleCSV}
          className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <Download className="h-4 w-4" /> Download Sample CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">Upload CSV File</h2>
            
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Select Target Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm bg-slate-50 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">No Category (General)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex w-full items-center justify-center">
              <label htmlFor="csv-upload" className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  <UploadCloud className="mb-3 h-8 w-8 text-indigo-400" />
                  <p className="mb-1 text-sm text-indigo-900"><span className="font-bold">Click to upload CSV</span></p>
                  <p className="text-xs text-indigo-600/70">.csv files only</p>
                </div>
                <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="mt-5 text-xs text-slate-600 bg-slate-50 border border-slate-100 p-4 rounded-lg">
              <p className="font-bold text-slate-800 mb-1.5">Required Headers:</p>
              <code className="text-indigo-600 font-medium block mb-3">german, english, bangla</code>
              
              <p className="font-bold text-slate-800 mb-1.5">Optional Headers:</p>
              <code className="text-indigo-600 font-medium block">article, pluralGerman, pronunciationBangla, difficulty</code>
            </div>

            {parsedData.length > 0 && (
              <button 
                onClick={handleImport} 
                disabled={importing} 
                className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Importing Data...' : `Import ${parsedData.length} Words`}
              </button>
            )}
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-2 flex flex-col h-full">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-sm font-medium text-rose-700 border border-rose-200">
              <AlertCircle className="h-5 w-5 shrink-0" /> {error}
            </div>
          )}
          
          {result && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> 
              Successfully imported {result.count} words into the database!
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 min-h-[450px] flex flex-col">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900">Data Preview</h2>
              {parsedData.length > 0 && (
                <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold border border-indigo-200">
                  {parsedData.length} Rows Found
                </span>
              )}
            </div>
            
            {parsedData.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500 p-8 text-center bg-slate-50/50">
                Upload a CSV file to preview the data before importing.
              </div>
            ) : (
              <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-white sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wider">German</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wider">English</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wider">Bangla</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wider">Article</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedData.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-900">{row.german}</td>
                        <td className="px-5 py-3 text-slate-600 font-medium">{row.english}</td>
                        <td className="px-5 py-3 text-slate-600 font-medium">{row.bangla}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {row.article ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold uppercase">{row.article}</span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 100 && (
                  <div className="p-3 text-center text-xs font-medium text-slate-500 bg-slate-50 border-t border-slate-100">
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