
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import Papa from "papaparse";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
  X,
} from "lucide-react";

import { useAppLevel } from "@/lib/auth/app-level-context";
import { Pagination } from "@/components/ui/pagination";
import { getGlobalCategories } from "@/lib/api/global-vocabulary";

import type {
  GlobalVocabularyCategory,
} from "@/lib/api/global-vocabulary";

import {
  bulkImportVocabulary,
  getImportJobs,
  type ImportVocabularyItem,
  type ImportJob,
  type ImportJobPage,
} from "@/lib/api/imports";

const BATCH_SIZE = 100;
const MAX_ROWS = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_LIMIT = 10;

type FlatRow = Record<string, unknown>;
type DatasetType = "CSV" | "XLSX" | "JSON";

type ParsedDataset = {
  filename: string;
  type: DatasetType;
  items: ImportVocabularyItem[];
};

const emptyJobPagination: ImportJobPage["pagination"] = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Operation failed.";
}

function rowValue(row: FlatRow, key: string): string {
  const raw = row[key];

  return raw === undefined || raw === null
    ? ""
    : String(raw).trim();
}

function safeDifficulty(
  input: string,
): ImportVocabularyItem["difficulty"] {
  const value = input.toUpperCase() || "EASY";

  if (
    value !== "EASY" &&
    value !== "MEDIUM" &&
    value !== "HARD"
  ) {
    throw new Error(`Invalid difficulty: ${input}`);
  }

  return value;
}

function validGrammarValue(
  value: unknown,
): value is string | number | boolean | null | string[] {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" &&
      Number.isFinite(value)) ||
    (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    )
  );
}

function parseGrammar(
  row: FlatRow,
): NonNullable<ImportVocabularyItem["grammar"]> {
  const grammar: NonNullable<
    ImportVocabularyItem["grammar"]
  > = {};

  for (const field of ["article", "gender", "plural"]) {
    const value = rowValue(row, field);
    if (value) grammar[field] = value;
  }

  const additional = rowValue(row, "additional_grammar");

  if (additional) {
    const parsed: unknown = JSON.parse(additional);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "additional_grammar must be a JSON object",
      );
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (!validGrammarValue(value)) {
        throw new Error(
          `Invalid grammar value for ${key}`,
        );
      }

      if (
        !["article", "gender", "plural"].includes(key)
      ) {
        grammar[key] = value;
      }
    }
  }

  return grammar;
}

function fromFlatRow(
  row: FlatRow,
  categoryId: string,
): ImportVocabularyItem {
  const term = rowValue(row, "term") ||
    rowValue(row, "german");

  if (!term) {
    throw new Error("Vocabulary term is required");
  }

  const english = rowValue(row, "english_meaning") ||
    rowValue(row, "english");

  const bangla = rowValue(row, "bangla_meaning") ||
    rowValue(row, "bangla");

  const translations: ImportVocabularyItem["translations"] = [];

  if (english) {
    translations.push({
      languageCode: "en",
      meaning: english,
    });
  }

  if (bangla) {
    translations.push({
      languageCode: "bn",
      meaning: bangla,
    });
  }

  if (translations.length === 0) {
    throw new Error(
      "At least one translation is required",
    );
  }

  const exampleGroup =
    rowValue(row, "example_group") || null;

  const examples: ImportVocabularyItem["examples"] = [];

  const exampleColumns: Array<[string, string]> = [
    ["german_example", "de"],
    ["english_example", "en"],
    ["bangla_example", "bn"],
  ];

  for (const [column, code] of exampleColumns) {
    const text = rowValue(row, column);

    if (text) {
      examples.push({
        languageCode: code,
        text,
        translationGroupId: exampleGroup,
      });
    }
  }

  const result: ImportVocabularyItem = {
    term,
    pronunciation:
      rowValue(row, "pronunciation") || null,
    partOfSpeech:
      rowValue(row, "part_of_speech") || null,
    difficulty: safeDifficulty(
      rowValue(row, "difficulty"),
    ),
    grammar: parseGrammar(row),
    notes: rowValue(row, "notes") || null,
    translations,
    examples,
  };

  // Only actual database IDs may be sent.
  // Category slugs are not treated as IDs.
  const rowCategoryId = rowValue(row, "categoryId");

  if (rowCategoryId || categoryId) {
    result.categoryId = rowCategoryId || categoryId;
  }

  const lessonId = rowValue(row, "lessonId");

  if (lessonId) {
    result.lessonId = lessonId;
  }

  return result;
}

function validateItem(
  value: unknown,
  fallbackCategoryId: string,
): ImportVocabularyItem {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("Invalid vocabulary object");
  }

  const item = value as Record<string, unknown>;

  if (
    typeof item.term !== "string" ||
    !item.term.trim()
  ) {
    throw new Error("Term is required");
  }

  if (!Array.isArray(item.translations)) {
    throw new Error("Translations must be an array");
  }

  if (!Array.isArray(item.examples)) {
    throw new Error("Examples must be an array");
  }

  for (const translation of item.translations) {
    if (
      !translation ||
      typeof translation.languageCode !== "string" ||
      typeof translation.meaning !== "string" ||
      !translation.languageCode.trim() ||
      !translation.meaning.trim()
    ) {
      throw new Error("Invalid translation");
    }
  }

  for (const example of item.examples) {
    if (
      !example ||
      typeof example.languageCode !== "string" ||
      typeof example.text !== "string" ||
      !example.languageCode.trim() ||
      !example.text.trim()
    ) {
      throw new Error("Invalid example");
    }
  }

  const difficulty = safeDifficulty(
    typeof item.difficulty === "string"
      ? item.difficulty
      : "EASY",
  );

  const normalized: ImportVocabularyItem = {
    ...(item as unknown as ImportVocabularyItem),
    term: item.term.trim(),
    difficulty,
    translations: item.translations,
    examples: item.examples,
  };

  if (
    fallbackCategoryId &&
    !normalized.categoryId
  ) {
    normalized.categoryId = fallbackCategoryId;
  }

  return normalized;
}

async function readRows(
  file: File,
): Promise<FlatRow[]> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".csv")) {
    const text = (await file.text()).replace(
      /^\uFEFF/,
      "",
    );

    const result = Papa.parse<FlatRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  if (filename.endsWith(".xlsx")) {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(
      (await file.arrayBuffer()) as never,
    );

    const sheet =
      workbook.getWorksheet("Vocabulary") ??
      workbook.worksheets[0];

    if (!sheet) {
      throw new Error("Excel worksheet not found");
    }

    const headers: string[] = [];

    sheet.getRow(1).eachCell(
      (cell, column) => {
        headers[column - 1] =
          String(cell.text ?? "").trim();
      },
    );

    const rows: FlatRow[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const record: FlatRow = {};

      headers.forEach((header, index) => {
        if (header) {
          record[header] =
            row.getCell(index + 1).text ?? "";
        }
      });

      if (
        Object.values(record).some(
          (entry) => String(entry).trim(),
        )
      ) {
        rows.push(record);
      }
    });

    return rows;
  }

  throw new Error("Unsupported file format");
}

function downloadSample() {
  const csv = [
    [
      "term",
      "pronunciation",
      "part_of_speech",
      "article",
      "gender",
      "plural",
      "difficulty",
      "english_meaning",
      "bangla_meaning",
      "german_example",
      "english_example",
      "bangla_example",
      "example_group",
      "notes",
    ].join(","),
    [
      "Fenster",
      "/ˈfɛnstɐ/",
      "NOUN",
      "das",
      "neuter",
      "Fenster",
      "EASY",
      "Window",
      "জানালা",
      "Das Fenster ist offen.",
      "The window is open.",
      "জানালাটি খোলা।",
      "fenster-1",
      "German A1 noun",
    ].join(","),
    [
      "Stuhl",
      "/ʃtuːl/",
      "NOUN",
      "der",
      "masculine",
      "Stühle",
      "EASY",
      "Chair",
      "চেয়ার",
      "Der Stuhl ist neu.",
      "The chair is new.",
      "চেয়ারটি নতুন।",
      "stuhl-1",
      "German A1 noun",
    ].join(","),
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF", csv],
    { type: "text/csv;charset=utf-8" },
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "global-vocabulary-sample.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function BulkImportPage() {
  const { selectedApp, isLoadingApps } =
    useAppLevel();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dataset, setDataset] =
    useState<ParsedDataset | null>(null);

  const [categories, setCategories] =
    useState<GlobalVocabularyCategory[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");

  const [previewPage, setPreviewPage] =
    useState(1);

  const [jobPage, setJobPage] = useState(1);

  const [jobs, setJobs] =
    useState<ImportJob[]>([]);

  const [jobPagination, setJobPagination] =
    useState<ImportJobPage["pagination"]>(
      emptyJobPagination,
    );

  const [parseErrors, setParseErrors] =
    useState<string[]>([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [queuedRows, setQueuedRows] = useState(0);

  const loadJobs = useCallback(async () => {
    if (!selectedApp) {
      setJobs([]);
      setJobPagination(emptyJobPagination);
      return;
    }

    try {
      const response = await getImportJobs(
        selectedApp.id,
        jobPage,
        10,
      );

      setJobs(response.data);
      setJobPagination(response.pagination);
    } catch (err) {
      setError(getError(err));
    }
  }, [selectedApp, jobPage]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    let active = true;

    void getGlobalCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch((err: unknown) => {
        if (active) setError(getError(err));
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedItems = useMemo(() => {
    return dataset?.items ?? [];
  }, [dataset]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return selectedItems;

    return selectedItems.filter((item) => {
      const translations = item.translations
        .map((translation) => translation.meaning)
        .join(" ");

      return `${item.term} ${translations}`
        .toLowerCase()
        .includes(query);
    });
  }, [selectedItems, search]);

  const totalPreviewPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length / PREVIEW_LIMIT,
    ),
  );

  const safePreviewPage = Math.min(
    previewPage,
    totalPreviewPages,
  );

  const visibleItems = filteredItems.slice(
    (safePreviewPage - 1) * PREVIEW_LIMIT,
    safePreviewPage * PREVIEW_LIMIT,
  );

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;

    for (const item of selectedItems) {
      const key = item.term
        .normalize("NFC")
        .trim()
        .toLowerCase();

      if (seen.has(key)) {
        count += 1;
      } else {
        seen.add(key);
      }
    }

    return count;
  }, [selectedItems]);

  function clearFile() {
    setDataset(null);
    setParseErrors([]);
    setSearch("");
    setPreviewPage(1);
    setConfirmed(false);
    setQueuedRows(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    clearFile();
    setError("");
    setMessage("");
    setParsing(true);

    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          "Maximum file size is 5 MB",
        );
      }

      const lower = file.name.toLowerCase();

      const type: DatasetType =
        lower.endsWith(".json")
          ? "JSON"
          : lower.endsWith(".xlsx")
            ? "XLSX"
            : lower.endsWith(".csv")
              ? "CSV"
              : (() => {
                  throw new Error(
                    "Only CSV, XLSX and JSON are supported",
                  );
                })();

      const errors: string[] = [];
      const parsed: ImportVocabularyItem[] = [];

      if (type === "JSON") {
        const raw: unknown = JSON.parse(
          await file.text(),
        );

        const records: unknown =
          raw &&
          typeof raw === "object" &&
          !Array.isArray(raw) &&
          "items" in raw
            ? raw.items
            : raw;

        if (!Array.isArray(records)) {
          throw new Error(
            "JSON must contain an items array",
          );
        }

        if (records.length > MAX_ROWS) {
          throw new Error(
            `Maximum ${MAX_ROWS} rows per file`,
          );
        }

        records.forEach((record, index) => {
          try {
            parsed.push(
              validateItem(record, categoryId),
            );
          } catch (err) {
            errors.push(
              `Row ${index + 1}: ${getError(err)}`,
            );
          }
        });
      } else {
        const rows = await readRows(file);

        if (rows.length > MAX_ROWS) {
          throw new Error(
            `Maximum ${MAX_ROWS} rows per file`,
          );
        }

        rows.forEach((row, index) => {
          try {
            parsed.push(
              fromFlatRow(row, categoryId),
            );
          } catch (err) {
            errors.push(
              `Row ${index + 2}: ${getError(err)}`,
            );
          }
        });
      }

      setParseErrors(errors.slice(0, 30));

      if (errors.length) {
        throw new Error(
          `${errors.length} invalid rows. Please correct the file before importing.`,
        );
      }

      if (parsed.length === 0) {
        throw new Error(
          "No vocabulary found in this file",
        );
      }

      setDataset({
        filename: file.name,
        type,
        items: parsed,
      });

      setPreviewPage(1);
    } catch (err) {
      setError(getError(err));
    } finally {
      setParsing(false);
    }
  }

  async function queueImport() {
    if (
      !selectedApp ||
      !dataset ||
      !confirmed ||
      importing ||
      duplicates > 0
    ) {
      return;
    }

    setImporting(true);
    setError("");
    setMessage("");

    let submitted = 0;

    try {
      const items = selectedItems.map((item) => ({
        ...item,
        categoryId:
          item.categoryId || categoryId || null,
      }));

      for (
        let start = 0;
        start < items.length;
        start += BATCH_SIZE
      ) {
        const batch = items.slice(
          start,
          start + BATCH_SIZE,
        );

        await bulkImportVocabulary({
          appId: selectedApp.id,
          filename:
            `${dataset.filename.slice(0, 150)}-batch-${Math.floor(start / BATCH_SIZE) + 1}`,
          items: batch,
        });

        submitted += batch.length;
        setQueuedRows(submitted);
      }

      setMessage(
        `${submitted} vocabulary rows queued successfully. Check Job History for processing results.`,
      );

      setConfirmed(false);
      clearFile();
      setJobPage(1);
      await loadJobs();
    } catch (err) {
      setQueuedRows(submitted);

      setError(
        `${submitted} rows have been accepted into the queue. Submission stopped: ${getError(err)}. Check job history before retrying to avoid duplicates.`,
      );

      setConfirmed(false);
    } finally {
      setImporting(false);
    }
  }

  if (isLoadingApps) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Loading workspace...
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-7 w-7 text-indigo-600" />

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Global Vocabulary Import
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {selectedApp?.name ??
                "Select an application"}{" "}
              · CSV, Excel and JSON
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Sample CSV
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* TWO COLUMN LAYOUT */}

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">

        {/* LEFT SIDE - UPLOAD */}

        <aside className="space-y-4 lg:sticky lg:top-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-bold text-slate-900">
              Import Vocabulary
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Upload and review your dataset before importing.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold">
                  Target Category (optional)
                </span>

                <select
                  value={categoryId}
                  disabled={importing}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setConfirmed(false);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5"
                >
                  <option value="">
                    Use file category / No category
                  </option>

                  {categories
                    .filter((category) => category.isActive)
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-center hover:border-indigo-400">
                <UploadCloud className="h-9 w-9 text-indigo-500" />

                <span className="text-sm font-semibold">
                  Choose Dataset File
                </span>

                <span className="text-xs text-slate-500">
                  .csv · .xlsx · .json
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.json"
                  disabled={parsing || importing}
                  onChange={(event) =>
                    void handleFile(event)
                  }
                  className="hidden"
                />
              </label>

              {parsing && (
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading dataset...
                </div>
              )}

              {dataset && (
                <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-all text-xs font-semibold text-indigo-800">
                        {dataset.filename}
                      </p>
                      <p className="mt-1 text-xs text-indigo-600">
                        {dataset.type} · {dataset.items.length} rows
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={importing}
                      title="Remove file"
                      aria-label="Remove file"
                      className="rounded p-1 text-indigo-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Valid rows
                  </p>
                  <p className="text-xl font-bold">
                    {selectedItems.length}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Batches
                  </p>
                  <p className="text-xl font-bold">
                    {Math.ceil(
                      selectedItems.length / BATCH_SIZE,
                    )}
                  </p>
                </div>
              </div>

              {duplicates > 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  {duplicates} duplicate term(s) found within this file.
                  Correct them before importing.
                </p>
              )}

              {queuedRows > 0 && importing && (
                <p className="text-xs text-indigo-700">
                  Submitted {queuedRows} rows...
                </p>
              )}

              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={
                    importing ||
                    selectedItems.length === 0 ||
                    duplicates > 0
                  }
                  onChange={(event) =>
                    setConfirmed(event.target.checked)
                  }
                  className="mt-0.5"
                />

                <span>
                  I reviewed the preview and confirmed
                  that the dataset and target app are correct.
                </span>
              </label>

              <button
                type="button"
                onClick={() => void queueImport()}
                disabled={
                  !selectedApp ||
                  !confirmed ||
                  importing ||
                  parsing ||
                  selectedItems.length === 0 ||
                  duplicates > 0
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}

                {importing
                  ? "Submitting..."
                  : `Queue ${selectedItems.length} Words`}
              </button>

              <p className="text-xs text-slate-500">
                Maximum {MAX_ROWS.toLocaleString()} rows
                per file, submitted in batches of {BATCH_SIZE}.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold">
              Import Instructions
            </h3>

            <p className="text-xs leading-5 text-slate-600">
              Supported: CSV, XLSX and JSON. For CSV/Excel,
              use term, english_meaning, bangla_meaning,
              article, gender, plural, pronunciation,
              difficulty and example columns.
            </p>

            <p className="mt-3 text-xs leading-5 text-slate-600">
              Category slugs are not database IDs.
              Select a category above or provide
              a valid categoryId in the dataset.
            </p>

            <p className="mt-3 text-xs leading-5 text-amber-700">
              Queuing is not completion. Verify each job
              before importing the same file again.
            </p>
          </section>
        </aside>

        {/* RIGHT SIDE */}

        <div className="min-w-0 space-y-5">

          {/* DATA PREVIEW */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Data Preview
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Review terms, translations and grammar before importing.
                </p>
              </div>

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {filteredItems.length} rows
              </span>
            </div>

            {selectedItems.length > 0 && (
              <div className="border-b p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPreviewPage(1);
                    }}
                    placeholder="Search preview by term or translation..."
                    className="w-full rounded-lg border p-2.5 pl-9 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedItems.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-300" />

                <p className="text-sm font-medium text-slate-600">
                  No dataset loaded
                </p>

                <p className="text-xs text-slate-500">
                  Choose a CSV, Excel or JSON file from the left panel
                  to preview its vocabulary.
                </p>
              </div>
            ) : (
              <>
                <div className="max-h-[510px] overflow-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-600">
                      <tr>
                        <th className="px-4 py-3">
                          Term
                        </th>
                        <th className="px-4 py-3">
                          English
                        </th>
                        <th className="px-4 py-3">
                          Bangla
                        </th>
                        <th className="px-4 py-3">
                          Article
                        </th>
                        <th className="px-4 py-3">
                          Difficulty
                        </th>
                        <th className="px-4 py-3">
                          Examples
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {visibleItems.map((item, index) => {
                        const english =
                          item.translations.find(
                            (translation) =>
                              translation.languageCode === "en",
                          )?.meaning ?? "—";

                        const bangla =
                          item.translations.find(
                            (translation) =>
                              translation.languageCode === "bn",
                          )?.meaning ?? "—";

                        const article =
                          item.grammar?.article;

                        return (
                          <tr
                            key={`${safePreviewPage}-${index}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-semibold">
                              {item.term}
                            </td>

                            <td className="px-4 py-3">
                              {english}
                            </td>

                            <td className="px-4 py-3">
                              {bangla}
                            </td>

                            <td className="px-4 py-3">
                              {typeof article === "string"
                                ? article
                                : "—"}
                            </td>

                            <td className="px-4 py-3">
                              {item.difficulty}
                            </td>

                            <td className="px-4 py-3">
                              {item.examples.length}
                            </td>
                          </tr>
                        );
                      })}

                      {visibleItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-slate-500"
                          >
                            No matching words.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t p-4">
                  <Pagination
                    pagination={{
                      page: safePreviewPage,
                      limit: PREVIEW_LIMIT,
                      total: filteredItems.length,
                      totalPages: totalPreviewPages,
                    }}
                    onPageChange={setPreviewPage}
                    onPageSizeChange={() =>
                      setPreviewPage(1)
                    }
                  />
                </div>
              </>
            )}
          </section>

          {/* VALIDATION ERRORS */}

          {parseErrors.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-bold text-amber-900">
                Dataset Validation Errors
              </h3>

              <div className="mt-3 space-y-1">
                {parseErrors.map((item, index) => (
                  <p
                    key={index}
                    className="text-xs text-amber-800"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* IMPORT HISTORY */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Import Job History
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Monitor background processing results.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadJobs()}
                title="Refresh jobs"
                aria-label="Refresh import jobs"
                className="rounded-lg border p-2 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Success</th>
                    <th className="px-4 py-3">Failed</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />

                          <span
                            title={job.filename}
                            className="max-w-64 truncate"
                          >
                            {job.filename}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            "rounded-full px-2 py-1 text-xs font-semibold " +
                            (
                              job.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : job.status === "FAILED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                            )
                          }
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {job.totalRows}
                      </td>

                      <td className="px-4 py-3 text-emerald-700">
                        {job.successRows}
                      </td>

                      <td className="px-4 py-3 text-red-600">
                        {job.failedRows}
                      </td>
                    </tr>
                  ))}

                  {jobs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-10 text-center text-slate-500"
                      >
                        No import jobs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t p-4">
              <Pagination
                pagination={jobPagination}
                onPageChange={setJobPage}
                onPageSizeChange={() =>
                  setJobPage(1)
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
