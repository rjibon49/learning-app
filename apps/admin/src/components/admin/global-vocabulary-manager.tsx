"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FileAudio,
  ImageIcon,
  Upload,
  X,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  BookOpen,
  Pencil,
  FileImage,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { getPublicLanguages } from "@/lib/api/languages";
import { Pagination } from "@/components/ui/pagination";
import { DeleteActions } from "@/components/ui/delete-actions";
import { FormField, apiFieldErrors } from "@/components/ui/form-field";
import { useConfirm, useToast } from "@/components/ui/feedback-provider";

import {
  getCourses,
  getModules,
  getLessons,
  type Course,
  type CourseModule,
  type Lesson,
} from "@/lib/api/courses";

import {
  getMediaPage,
  uploadMedia,
  getMediaAccess,
  type MediaAsset,
} from "@/lib/api/media";

import type { LearningLanguage } from "@/types/app";

import {
  listGlobalVocabulary,
  getGlobalVocabulary,
  createGlobalVocabulary,
  updateGlobalVocabulary,
  archiveGlobalVocabulary,
  getGlobalCategories,
  addVocabularyTranslation,
  updateVocabularyTranslation,
  deleteVocabularyTranslation,
  addVocabularyExample,
  updateVocabularyExample,
  deleteVocabularyExample,
  type GlobalVocabularyItem,
  type GlobalVocabularyCategory,
  type VocabularyStatus,
  type VocabularyDifficulty,
  type VocabularyInput,
  type TranslationInput,
  type ExampleInput,
  type PaginationMeta,
  type VocabularyGrammar,
} from "@/lib/api/global-vocabulary";

// ==================================================
// TYPES
// ==================================================

type GrammarField = {
  key: string;
  value: string;
};

type FormState = {
  term: string;
  pronunciation: string;
  partOfSpeech: string;
  categoryId: string;
  lessonId: string;
  difficulty: VocabularyDifficulty;
  status: VocabularyStatus;
  notes: string;

  article: string;
  gender: string;
  plural: string;

  advancedGrammar: GrammarField[];

  imageAssetId: string;
  audioAssetId: string;

  /* Quick add (create only): saved as the first translation / example. */
  meaning: string;
  meaningLanguageId: string;
  exampleText: string;
};

type MediaPickerType = "IMAGE" | "AUDIO";

type MediaPickerProps = {
  type: MediaPickerType;
  appId: string;
  selectedId: string;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
};

type LessonPickerProps = {
  appId: string;
  value: string;
  currentLessonName?: string | null;
  onChange: (lessonId: string) => void;
};

type EditorProps = {
  initialEditId?: string;
  startCreating?: boolean;
};

const STATUSES: VocabularyStatus[] = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
];

const PAGE_LIMIT = 10;

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 1,
};

function emptyForm(): FormState {
  return {
    term: "",
    pronunciation: "",
    partOfSpeech: "",
    categoryId: "",
    lessonId: "",
    difficulty: "EASY",
    status: "DRAFT",
    notes: "",
    article: "",
    gender: "",
    plural: "",
    advancedGrammar: [],
    imageAssetId: "",
    audioAssetId: "",
    meaning: "",
    meaningLanguageId: "",
    exampleText: "",
  };
}

const MEANING_LANGUAGE_KEY = "cms.vocabulary.meaningLanguageId";

function rememberedMeaningLanguage(): string {
  try {
    return window.localStorage.getItem(MEANING_LANGUAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberMeaningLanguage(id: string) {
  try {
    if (id) window.localStorage.setItem(MEANING_LANGUAGE_KEY, id);
  } catch {
    /* storage blocked: ignore */
  }
}

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Operation failed. Please try again.";
}

function grammarValueToText(
  value: VocabularyGrammar[string],
): string {
  if (value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function grammarToFields(
  grammar: VocabularyGrammar | null,
): GrammarField[] {
  if (!grammar) return [];

  return Object.entries(grammar)
    .filter(
      ([key]) =>
        !["article", "gender", "plural"].includes(key),
    )
    .map(([key, value]) => ({
      key,
      value: grammarValueToText(value),
    }));
}

function toForm(item: GlobalVocabularyItem): FormState {
  const grammar = item.grammar ?? {};

  return {
    term: item.term,
    pronunciation: item.pronunciation ?? "",
    partOfSpeech: item.partOfSpeech ?? "",
    categoryId: item.categoryId ?? "",
    lessonId: item.lessonId ?? "",
    difficulty: item.difficulty,
    status: item.status,
    notes: item.notes ?? "",

    article:
      typeof grammar.article === "string"
        ? grammar.article
        : "",

    gender:
      typeof grammar.gender === "string"
        ? grammar.gender
        : "",

    plural:
      typeof grammar.plural === "string"
        ? grammar.plural
        : "",

    advancedGrammar: grammarToFields(
      item.grammar,
    ),

    imageAssetId: item.imageAssetId ?? "",
    audioAssetId: item.audioAssetId ?? "",
    meaning: "",
    meaningLanguageId: "",
    exampleText: "",
  };
}

function buildGrammar(
  form: FormState,
  original?: VocabularyGrammar | null,
): VocabularyGrammar {
  // Preserve existing typed properties unless edited.
  const grammar: VocabularyGrammar = {
    ...(original ?? {}),
  };

  delete grammar.article;
  delete grammar.gender;
  delete grammar.plural;

  if (form.article.trim()) {
    grammar.article = form.article.trim();
  }

  if (form.gender.trim()) {
    grammar.gender = form.gender.trim();
  }

  if (form.plural.trim()) {
    grammar.plural = form.plural.trim();
  }

  const existingKeys = new Set<string>();

  for (const field of form.advancedGrammar) {
    const key = field.key.trim();
    const value = field.value.trim();

    if (!key && !value) continue;

    if (!key) {
      throw new Error(
        "Every advanced grammar field needs a property name.",
      );
    }

    if (
      ["article", "gender", "plural"].includes(key)
    ) {
      throw new Error(
        `"${key}" already has a dedicated field.`,
      );
    }

    if (existingKeys.has(key)) {
      throw new Error(
        `Duplicate grammar property: ${key}`,
      );
    }

    existingKeys.add(key);

    if (!value) {
      delete grammar[key];
      continue;
    }

    // Preserve non-string values if they are unchanged.
    const previousValue = original?.[key];

    if (
      previousValue !== undefined &&
      grammarValueToText(previousValue) === value
    ) {
      grammar[key] = previousValue;
    } else {
      grammar[key] = value;
    }
  }

  // Remove old additional properties explicitly deleted.
  for (const key of Object.keys(grammar)) {
    if (
      ["article", "gender", "plural"].includes(key)
    ) {
      continue;
    }

    if (!existingKeys.has(key)) {
      delete grammar[key];
    }
  }

  return grammar;
}

// ==================================================
// LESSON SELECTOR
// ==================================================

function LessonSelector({
  appId,
  value,
  currentLessonName,
  onChange,
}: LessonPickerProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] =
    useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getCourses(appId)
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch((err: unknown) => {
        if (active) setError(getError(err));
      });

    return () => {
      active = false;
    };
  }, [appId]);

  useEffect(() => {
    let active = true;

    if (!courseId) return;

    void getModules(courseId)
      .then((data) => {
        if (active) setModules(data);
      })
      .catch((err: unknown) => {
        if (active) setError(getError(err));
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    let active = true;

    if (!moduleId) return;

    void getLessons(moduleId)
      .then((data) => {
        if (active) setLessons(data);
      })
      .catch((err: unknown) => {
        if (active) setError(getError(err));
      });

    return () => {
      active = false;
    };
  }, [moduleId]);

  const hasSelectedLesson = lessons.some(
    (lesson) => lesson.id === value,
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Link Vocabulary to Lesson
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Optional. Choose a course, module and lesson.
        </p>
      </div>

      {value && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs font-medium text-indigo-800">
            Selected:{" "}
            {lessons.find(
              (lesson) => lesson.id === value,
            )?.title ||
              currentLessonName ||
              "Existing lesson"}
          </span>

          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-semibold text-red-600"
          >
            Remove
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-xs">
          <span className="font-semibold">Course</span>
          <select
            value={courseId}
            onChange={(event) => {
              setCourseId(event.target.value);
              setModuleId("");
              setModules([]);
              setLessons([]);
              onChange("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
          >
            <option value="">Choose Course</option>
            {courses.map((course) => (
              <option
                key={course.id}
                value={course.id}
              >
                {course.title}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-semibold">Module</span>
          <select
            value={moduleId}
            disabled={!courseId}
            onChange={(event) => {
              setModuleId(event.target.value);
              setLessons([]);
              onChange("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm disabled:opacity-50"
          >
            <option value="">Choose Module</option>
            {modules.map((module) => (
              <option
                key={module.id}
                value={module.id}
              >
                {module.title}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-semibold">Lesson</span>
          <select
            value={
              hasSelectedLesson ? value : ""
            }
            disabled={!moduleId || loading}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm disabled:opacity-50"
          >
            <option value="">Choose Lesson</option>

            {lessons.map((lesson) => (
              <option
                key={lesson.id}
                value={lesson.id}
              >
                {lesson.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-red-600"
        >
          {error}
        </p>
      )}

      {loading && (
        <p className="text-xs text-slate-500">
          Loading lessons...
        </p>
      )}
    </section>
  );
}

// ==================================================
// MEDIA LIBRARY PICKER
// ==================================================

// ==================================================
// SIGNED R2 MEDIA PREVIEWS
// ==================================================

/** Preview URLs are obtained via authenticated API calls, not guessed from R2 object keys. */
function MediaPreview({
  assetId,
  type,
  className = "",
}: {
  assetId: string;
  type: MediaPickerType;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const anchor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = anchor.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      // Browser fallback: the preview still works without IntersectionObserver.
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [assetId]);

  useEffect(() => {
    let active = true;
    if (!assetId || !visible) return;

    void (async () => {
      try {
        const access = await getMediaAccess(assetId);
        if (active) setUrl(access.url);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setPending(false);
      }
    })();
    return () => { active = false; };
  }, [assetId, visible]);

  return (
    <div
      ref={anchor}
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 ${className}`}
    >
      {!visible ? (
        <button
          type="button"
          aria-label="Load media preview"
          onClick={() => setVisible(true)}
          className="flex h-full w-full items-center justify-center text-slate-400"
        >
          {type === "IMAGE" ? <ImageIcon className="h-8 w-8" /> : <FileAudio className="h-8 w-8" />}
        </button>
      ) : pending ? (
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      ) : url && type === "IMAGE" ? (
        // Signed API media URLs may be short-lived and are not Next Image optimizer origins.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Media asset preview"
          className="h-full w-full object-contain"
          onError={() => { setFailed(true); setUrl(null); }}
        />
      ) : url && type === "AUDIO" ? (
        <audio controls preload="none" src={url} className="w-full" />
      ) : (
        <div className="flex flex-col items-center gap-1 p-2 text-center text-xs text-slate-500">
          {type === "IMAGE" ? <ImageIcon className="h-7 w-7" /> : <FileAudio className="h-7 w-7" />}
          {failed && <span>Preview unavailable</span>}
        </div>
      )}
    </div>
  );
}

function MediaLibraryPicker({
  type,
  appId,
  selectedId,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const MEDIA_GRID_LIMIT = 8;

  const [gridPage, setGridPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadId = useRef(0);

  const load = useCallback(async (targetPage: number) => {
    const request = ++loadId.current;
    setLoading(true);
    setError("");
    try {
      // Media API pagination is server-side; filter media types client-side.
      const response = await getMediaPage({ page: targetPage, limit: 60 });
      if (request !== loadId.current) return;
      setAssets(response.data);
      setPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setGridPage(1);
    } catch (err) {
      if (request === loadId.current) setError(getError(err));
    } finally {
      if (request === loadId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++loadId.current;
    void getMediaPage({ page: 1, limit: 60 })
      .then((response) => {
        if (!active || requestId !== loadId.current) return;
        setAssets(response.data);
        setPage(response.pagination.page);
        setTotalPages(response.pagination.totalPages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active || requestId !== loadId.current) return;
        setError(getError(err));
        setLoading(false);
      });
    return () => { active = false; loadId.current += 1; };
  }, []);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading) onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose, uploading]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) =>
      asset.type === type && asset.status === "READY" &&
      (!query || `${asset.originalName ?? ""} ${asset.objectKey ?? ""}`.toLowerCase().includes(query))
    );
  }, [assets, search, type]);

  const gridTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / MEDIA_GRID_LIMIT)
  );

  const safeGridPage = Math.min(
    gridPage,
    gridTotalPages
  );

  const visibleAssets = useMemo(() => {
    const start = (safeGridPage - 1) * MEDIA_GRID_LIMIT;

    return filtered.slice(
      start,
      start + MEDIA_GRID_LIMIT
    );
  }, [filtered, safeGridPage]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (type === "IMAGE" && !file.type.startsWith("image/")) {
      setError("Choose a supported image file.");
      return;
    }
    if (type === "AUDIO" && !file.type.startsWith("audio/")) {
      setError("Choose an audio file.");
      return;
    }
    setError("");
    setPendingFile(file);
    setLocalUrl(URL.createObjectURL(file));
  }

  async function uploadSelectedFile() {
    if (!pendingFile || uploading) return;
    setUploading(true);
    setError("");
    try {
      const asset = await uploadMedia(pendingFile, appId, "PRIVATE");
      setPendingFile(null);
      setLocalUrl(null);
      if (asset.type === type && asset.status === "READY") {
        onSelect(asset);
        return;
      }
      setError("Upload accepted. Processing is not READY yet; refresh the library and select it when processing finishes.");
      await load(1);
    } catch (err) {
      setError(getError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Choose ${type.toLowerCase()}`}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              {type === "IMAGE" ? <ImageIcon className="h-5 w-5 text-indigo-600" /> : <FileAudio className="h-5 w-5 text-indigo-600" />}
              {type === "IMAGE" ? "Choose vocabulary image" : "Choose vocabulary audio"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Preview your files before selecting. Private R2 media uses signed preview access.</p>
          </div>
          <button type="button" disabled={uploading} onClick={onClose} aria-label="Close media picker" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setGridPage(1); }} placeholder="Search names on this page..." aria-label="Search media" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" />
            </div>
            <button type="button" disabled={loading} onClick={() => void load(page)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Upload className="h-4 w-4" /> Upload from PC
            </button>
            <input ref={fileInputRef} className="sr-only" type="file" accept={type === "IMAGE" ? "image/jpeg,image/png,image/webp,image/avif,image/tiff" : "audio/*"} onChange={chooseFile} />
          </div>

          {pendingFile && (
            <div className="grid items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 sm:grid-cols-[150px_1fr]">
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-white">
                {localUrl && type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={localUrl} alt="Selected local file preview" className="h-full w-full object-contain" />
                ) : localUrl ? (
                  <audio src={localUrl} controls preload="metadata" className="w-full" />
                ) : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              <div className="min-w-0 space-y-2">
                <p className="break-all text-sm font-semibold text-slate-900">{pendingFile.name}</p>
                <p className="text-xs text-slate-500">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB · Local preview — not uploaded yet</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={uploading} onClick={() => void uploadSelectedFile()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading..." : "Confirm upload"}
                  </button>
                  <button type="button" disabled={uploading} onClick={() => { setPendingFile(null); setLocalUrl(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Discard</button>
                </div>
              </div>
            </div>
          )}
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="min-h-48 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading media...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">No READY {type.toLowerCase()} assets on this page. Use the page controls or upload a file.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {visibleAssets.map((asset) => (
                <div key={asset.id} className={`min-w-0 space-y-2 rounded-xl border p-3 transition hover:border-indigo-300 ${asset.id === selectedId ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}>
                  <MediaPreview key={asset.id} assetId={asset.id} type={type} className="h-32 w-full" />
                  <p title={asset.originalName ?? asset.objectKey} className="truncate text-xs font-medium text-slate-800">{asset.originalName ?? asset.objectKey}</p>
                  <p className="text-[11px] text-slate-500">{asset.visibility} · {asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mimeType ?? type}</p>
                  <button type="button" onClick={() => onSelect(asset)} className={`flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${asset.id === selectedId ? "bg-emerald-100 text-emerald-800" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                    {asset.id === selectedId ? <><CheckCircle2 className="h-3.5 w-3.5" /> Selected</> : "Use this file"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">
              {filtered.length === 0
                ? "0"
                : (safeGridPage - 1) * MEDIA_GRID_LIMIT + 1}
              {" – "}
              {Math.min(
                safeGridPage * MEDIA_GRID_LIMIT,
                filtered.length
              )}
            </span>
            {" of "}
            {filtered.length}
            {" matching files in library batch "}
            {page}
            {" of "}
            {Math.max(1, totalPages)}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={
                loading ||
                (page <= 1 && safeGridPage <= 1)
              }
              onClick={() => {
                if (safeGridPage > 1) {
                  setGridPage(safeGridPage - 1);
                } else if (page > 1) {
                  void load(page - 1);
                }
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="min-w-20 text-center text-xs font-semibold text-slate-600">
              {safeGridPage} / {gridTotalPages}
            </span>

            <button
              type="button"
              disabled={
                loading ||
                (
                  safeGridPage >= gridTotalPages &&
                  page >= totalPages
                )
              }
              onClick={() => {
                if (safeGridPage < gridTotalPages) {
                  setGridPage(safeGridPage + 1);
                } else if (page < totalPages) {
                  void load(page + 1);
                }
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// MAIN VOCABULARY MANAGER
// ==================================================

export function GlobalVocabularyManager({
  initialEditId,
  startCreating = false,
}: EditorProps) {
  const router = useRouter();
  const { admin } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const {
    selectedApp,
    isLoadingApps,
  } = useAppLevel();

  const canWrite = [
    "SUPER_ADMIN",
    "ADMIN",
    "CONTENT_EDITOR",
  ].includes(admin?.role ?? "");

  const canArchive = [
    "SUPER_ADMIN",
    "ADMIN",
  ].includes(admin?.role ?? "");

  const [items, setItems] =
    useState<GlobalVocabularyItem[]>([]);

  const [categories, setCategories] =
    useState<GlobalVocabularyCategory[]>([]);

  const [languages, setLanguages] =
    useState<LearningLanguage[]>([]);

  const [pagination, setPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_LIMIT);
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<VocabularyStatus | "">("");

  const [categoryFilter, setCategoryFilter] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editorOpen, setEditorOpen] = useState(
    startCreating || Boolean(initialEditId),
  );

  const [editingId, setEditingId] =
    useState<string | null>(initialEditId ?? null);

  const [form, setForm] = useState<FormState>(
    emptyForm,
  );

  const [detail, setDetail] =
    useState<GlobalVocabularyItem | null>(null);

  const [selectedImage, setSelectedImage] =
    useState<MediaAsset | null>(null);

  const [selectedAudio, setSelectedAudio] =
    useState<MediaAsset | null>(null);

  const [mediaPickerType, setMediaPickerType] =
    useState<MediaPickerType | null>(null);

  const [translationLanguage, setTranslationLanguage] =
    useState("");

  const [translationMeaning, setTranslationMeaning] =
    useState("");

  const [translationNotes, setTranslationNotes] =
    useState("");

  const [editingTranslationId, setEditingTranslationId] =
    useState<string | null>(null);

  const [exampleLanguage, setExampleLanguage] =
    useState("");

  const [exampleText, setExampleText] =
    useState("");

  const [exampleGroup, setExampleGroup] =
    useState("");

  const [editingExampleId, setEditingExampleId] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"term" | "meaning" | "meaningLanguageId" | "translation" | "example", string>>
  >({});

  const [addAnother, setAddAnother] = useState(false);
  const termInputRef = useRef<HTMLInputElement>(null);

  const activeLanguageId =
    selectedApp?.languageId ?? "";

  const isGerman =
    selectedApp?.language?.code === "de";

  /** Remembered meaning language, else the first language that is not the one being taught. */
  const defaultMeaningLanguage = useCallback((): string => {
    const remembered = rememberedMeaningLanguage();
    if (remembered && languages.some((l) => l.id === remembered)) return remembered;
    return (
      languages.find((l) => l.id !== activeLanguageId && l.code === "en")?.id ??
      languages.find((l) => l.id !== activeLanguageId)?.id ??
      ""
    );
  }, [languages, activeLanguageId]);

  const loadVocabulary = useCallback(async () => {
    if (!selectedApp) {
      setItems([]);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await listGlobalVocabulary({
        appId: selectedApp.id,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        page,
        limit,
      });

      setItems(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [
    selectedApp,
    search,
    statusFilter,
    categoryFilter,
    page,
    limit,
  ]);

  const selectedAppId = selectedApp?.id;

useEffect(() => {
  let active = true;

  if (!selectedAppId) {
    void Promise.resolve().then(() => {
      if (!active) return;

      setItems([]);
      setPagination(EMPTY_PAGINATION);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }

  void listGlobalVocabulary({
    appId: selectedAppId,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    categoryId: categoryFilter || undefined,
    page,
    limit,
  })
    .then((response) => {
      if (!active) return;

      setItems(response.data);
      setPagination(response.pagination);
      setError("");
      setLoading(false);
    })
    .catch((err: unknown) => {
      if (!active) return;

      setError(getError(err));
      setLoading(false);
    });

  return () => {
    active = false;
  };
}, [
  selectedAppId,
  search,
  statusFilter,
  categoryFilter,
  page,
  limit,
]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getGlobalCategories(),
      getPublicLanguages(),
    ])
      .then(([categoryData, languageData]) => {
        if (!active) return;

        setCategories(categoryData);
        setLanguages(languageData);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(getError(err));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const clearRelatedForms = useCallback(() => {
    setTranslationLanguage(defaultMeaningLanguage());
    setTranslationMeaning("");
    setTranslationNotes("");
    setEditingTranslationId(null);

    setExampleLanguage(activeLanguageId);
    setExampleText("");
    setExampleGroup("");
    setEditingExampleId(null);
    setFieldErrors({});
  }, [defaultMeaningLanguage, activeLanguageId]);

  const openEditor = useCallback(
    async (id: string) => {
      setError("");
      setNotice("");
      setEditorOpen(true);
      setEditingId(id);
      setDetail(null);
      setSelectedImage(null);
      setSelectedAudio(null);
      clearRelatedForms();

      try {
        const record =
          await getGlobalVocabulary(id);

        setDetail(record);
        setForm(toForm(record));
      } catch (err) {
        setError(getError(err));
      }
    },
    [clearRelatedForms],
  );

  useEffect(() => {
  if (!initialEditId) return;

  let active = true;

  void getGlobalVocabulary(initialEditId)
    .then((record) => {
      if (!active) return;

      setDetail(record);
      setForm(toForm(record));
      setError("");
    })
    .catch((err: unknown) => {
      if (!active) return;

      setError(getError(err));
    });

  return () => {
    active = false;
  };
}, [initialEditId]);

  function createNew() {
    setEditingId(null);
    setDetail(null);
    setForm({ ...emptyForm(), meaningLanguageId: defaultMeaningLanguage() });
    setSelectedImage(null);
    setSelectedAudio(null);
    setEditorOpen(true);
    clearRelatedForms();
    setError("");
    setNotice("");
  }

  useEffect(() => {
    if (editingId || !languages.length) return;
    const fallback = defaultMeaningLanguage();
    // Fill an empty default once languages have loaded (direct /vocabulary/new visits).
    void Promise.resolve().then(() =>
      setForm((current) =>
        current.meaningLanguageId ? current : { ...current, meaningLanguageId: fallback },
      ),
    );
  }, [languages, editingId, defaultMeaningLanguage]);

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function addGrammarField() {
    setForm((current) => ({
      ...current,
      advancedGrammar: [
        ...current.advancedGrammar,
        { key: "", value: "" },
      ],
    }));
  }

  function updateGrammarField(
    index: number,
    key: keyof GrammarField,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      advancedGrammar:
        current.advancedGrammar.map((field, i) =>
          i === index
            ? { ...field, [key]: value }
            : field,
        ),
    }));
  }

  function removeGrammarField(index: number) {
    setForm((current) => ({
      ...current,
      advancedGrammar:
        current.advancedGrammar.filter(
          (_, i) => i !== index,
        ),
    }));
  }

  async function reloadDetail(id: string) {
    const record = await getGlobalVocabulary(id);
    setDetail(record);
  }

  async function saveVocabulary(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canWrite || !selectedApp || saving) return;

    const creating = !editingId;
    const errors: typeof fieldErrors = {};
    if (!form.term.trim()) errors.term = "Enter the word or phrase.";
    if (creating && form.meaning.trim() && !form.meaningLanguageId) {
      errors.meaningLanguageId = "Choose the meaning language.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      termInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const grammar = buildGrammar(
        form,
        detail?.grammar,
      );

      const input: VocabularyInput = {
        languageId:
          detail?.languageId ?? activeLanguageId,

        term: form.term.trim(),
        pronunciation:
          form.pronunciation.trim() || null,

        partOfSpeech:
          form.partOfSpeech.trim() || null,

        categoryId: form.categoryId || null,
        lessonId: form.lessonId || null,

        difficulty: form.difficulty,
        status: form.status,

        notes: form.notes.trim() || null,
        grammar,

        imageAssetId:
          form.imageAssetId || null,

        audioAssetId:
          form.audioAssetId || null,
      };

      let saved: GlobalVocabularyItem;

      if (editingId) {
        const { languageId: _languageId, ...changes } =
          input;

        void _languageId;

        saved = await updateGlobalVocabulary(
          editingId,
          changes,
        );
      } else {
        saved = await createGlobalVocabulary(input);
      }

      // Quick add: first meaning + example in the same save.
      const extraErrors: string[] = [];
      if (creating && form.meaning.trim() && form.meaningLanguageId) {
        rememberMeaningLanguage(form.meaningLanguageId);
        try {
          await addVocabularyTranslation(saved.id, {
            languageId: form.meaningLanguageId,
            meaning: form.meaning.trim(),
            notes: null,
            sortOrder: 0,
          });
        } catch (err) {
          extraErrors.push(`meaning not saved (${getError(err)})`);
        }
      }
      if (creating && form.exampleText.trim() && activeLanguageId) {
        try {
          await addVocabularyExample(saved.id, {
            languageId: activeLanguageId,
            text: form.exampleText.trim(),
            translationGroupId: null,
            sortOrder: 0,
          });
        } catch (err) {
          extraErrors.push(`example not saved (${getError(err)})`);
        }
      }

      await loadVocabulary();

      if (extraErrors.length) {
        toast.error(`"${saved.term}" was saved, but ${extraErrors.join(" and ")}. Add it below.`);
      }

      if (creating && addAnother) {
        // Batch entry: keep category, lesson, difficulty, status and meaning language.
        setForm((current) => ({
          ...emptyForm(),
          categoryId: current.categoryId,
          lessonId: current.lessonId,
          difficulty: current.difficulty,
          status: current.status,
          meaningLanguageId: current.meaningLanguageId,
        }));
        setSelectedImage(null);
        setSelectedAudio(null);
        setDetail(null);
        setEditingId(null);
        if (!extraErrors.length) toast.success(`"${saved.term}" added. Type the next word.`);
        window.setTimeout(() => termInputRef.current?.focus(), 0);
        return;
      }

      setEditingId(saved.id);
      await reloadDetail(saved.id);
      if (!creating) setForm((current) => ({ ...current, meaning: "", exampleText: "" }));

      if (!extraErrors.length) {
        toast.success(
          creating
            ? `"${saved.term}" created. Add more meanings or examples below, or close.`
            : `"${saved.term}" saved.`,
        );
      }
    } catch (err) {
      const apiErrors = apiFieldErrors(err);
      if (apiErrors.term) setFieldErrors((current) => ({ ...current, term: apiErrors.term }));
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveTranslation(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingId || saving) return;
    if (!translationLanguage || !translationMeaning.trim()) {
      setFieldErrors((current) => ({
        ...current,
        translation: !translationLanguage ? "Choose a language." : "Enter the meaning.",
      }));
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors((current) => ({ ...current, translation: undefined }));

    const payload: TranslationInput = {
      languageId: translationLanguage,
      meaning: translationMeaning.trim(),
      notes: translationNotes.trim() || null,
      sortOrder: 0,
    };

    try {
      if (editingTranslationId) {
        await updateVocabularyTranslation(
          editingId,
          editingTranslationId,
          payload,
        );
      } else {
        await addVocabularyTranslation(
          editingId,
          payload,
        );
      }

      await reloadDetail(editingId);
      rememberMeaningLanguage(translationLanguage);

      // Keep the language selected so the next meaning is quick to add.
      setTranslationMeaning("");
      setTranslationNotes("");
      setEditingTranslationId(null);

      toast.success("Meaning saved.");
    } catch (err) {
      const apiErrors = apiFieldErrors(err);
      setFieldErrors((current) => ({
        ...current,
        translation: apiErrors.meaning ?? apiErrors.languageId ?? getError(err),
      }));
    } finally {
      setSaving(false);
    }
  }

  async function removeTranslation(id: string, label: string) {
    if (!editingId) return;
    const ok = await confirm({
      title: "Delete this meaning?",
      message: <p><strong>{label}</strong> will be removed from this word.</p>,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await deleteVocabularyTranslation(
        editingId,
        id,
      );
      await reloadDetail(editingId);
      if (editingTranslationId === id) {
        setEditingTranslationId(null);
        setTranslationMeaning("");
        setTranslationNotes("");
      }
      toast.success("Meaning deleted.");
    } catch (err) {
      toast.error(getError(err));
    }
  }

  async function saveExample(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingId || saving) return;
    if (!exampleLanguage || !exampleText.trim()) {
      setFieldErrors((current) => ({
        ...current,
        example: !exampleLanguage ? "Choose a language." : "Enter the example sentence.",
      }));
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors((current) => ({ ...current, example: undefined }));

    const payload: ExampleInput = {
      languageId: exampleLanguage,
      text: exampleText.trim(),
      translationGroupId:
        exampleGroup.trim() || null,
      sortOrder: 0,
    };

    try {
      if (editingExampleId) {
        await updateVocabularyExample(
          editingId,
          editingExampleId,
          payload,
        );
      } else {
        await addVocabularyExample(
          editingId,
          payload,
        );
      }

      await reloadDetail(editingId);

      setExampleText("");
      setExampleGroup("");
      setEditingExampleId(null);

      toast.success("Example saved.");
    } catch (err) {
      const apiErrors = apiFieldErrors(err);
      setFieldErrors((current) => ({
        ...current,
        example: apiErrors.text ?? apiErrors.languageId ?? getError(err),
      }));
    } finally {
      setSaving(false);
    }
  }

  async function removeExample(id: string, text: string) {
    if (!editingId) return;
    const ok = await confirm({
      title: "Delete this example?",
      message: <p className="break-words">{text}</p>,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await deleteVocabularyExample(
        editingId,
        id,
      );
      await reloadDetail(editingId);
      if (editingExampleId === id) {
        setEditingExampleId(null);
        setExampleText("");
        setExampleGroup("");
      }
      toast.success("Example deleted.");
    } catch (err) {
      toast.error(getError(err));
    }
  }

  function afterDelete(id: string) {
    void loadVocabulary();
    if (editingId === id) closeEditor();
  }

  const archiveHelp =
    "Status becomes ARCHIVED: learners stop seeing it but keep their progress. Change the status back to restore it.";
  const permanentHelp =
    "Its meanings, examples, flashcard deck items and learner progress are removed too.";

  function closeEditor() {
    setFieldErrors({});
    setEditorOpen(false);
    setEditingId(null);
    setDetail(null);
    setMediaPickerType(null);

    if (initialEditId || startCreating) {
      router.push("/admin/vocabulary");
    }
  }

  if (isLoadingApps) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Loading applications...
      </p>
    );
  }

  if (!selectedApp) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm">
        Select an application from the top navigation.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <BookOpen className="h-6 w-6 text-indigo-600" /> Global Vocabulary
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage terms, translations, examples, grammar and media · {selectedApp.language.name} · {selectedApp.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/vocabulary/categories"
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Manage Categories
          </Link>

          <button
            type="button"
            onClick={() => void loadVocabulary()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={createNew}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Vocabulary
            </button>
          )}
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      {/* FILTERS */}

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <input
          aria-label="Search vocabulary"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search terms..."
          className="rounded-lg border p-2.5 text-sm"
        />

        <select
          aria-label="Filter category"
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border p-2.5 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter publication status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as
                VocabularyStatus | "",
            );
            setPage(1);
          }}
          className="rounded-lg border p-2.5 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-indigo-900">
          <span className="font-bold">Global vocabulary:</span> Terms are shared across levels of the same language. Use the lesson selector to link a term to a specific lesson.
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs leading-5 text-emerald-900">
          <span className="font-bold">Media preview:</span> Uploaded images can be previewed before saving, and existing private images load through authenticated R2 access.
        </div>
      </div>

      {/* VOCABULARY LIST */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Translation</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {item.term}
                    </p>

                    <p className="text-xs text-slate-500">
                      {item.pronunciation ||
                        item.partOfSpeech ||
                        "—"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {item.category?.name ?? "—"}
                  </td>

                  <td className="px-4 py-3">
                    {item.translations?.[0]?.meaning ??
                      "—"}
                  </td>

                  <td className="px-4 py-3">
                    {item.difficulty}
                  </td>

                  <td className="px-4 py-3">
                    {item.status}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        void openEditor(item.id)
                      }
                      className="rounded-lg border px-3 py-1.5 text-xs"
                    >
                      {canWrite ? "Edit" : "View"}
                    </button>

                    <span className="ml-2 inline-flex">
                      <DeleteActions
                        compact
                        itemName={item.term}
                        entity="word"
                        canArchive={canArchive}
                        hideArchive={item.status === "ARCHIVED"}
                        archiveHelp={archiveHelp}
                        permanentHelp={permanentHelp}
                        onDelete={(permanent) => archiveGlobalVocabulary(item.id, permanent)}
                        onDone={() => afterDelete(item.id)}
                      />
                    </span>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No vocabulary found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4">
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
            isLoading={loading}
          />
        </div>
      </section>

      {/* VOCABULARY EDITOR */}

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-3 sm:p-5">
          <div className="max-h-[94vh] w-full max-w-5xl space-y-5 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Pencil className="h-5 w-5 text-indigo-600" />
                {editingId
                  ? "Edit Vocabulary"
                  : "Create Vocabulary"}
              </h2>

              <div className="flex items-center gap-2">
                {editingId && detail && (
                  <DeleteActions
                    itemName={detail.term}
                    entity="word"
                    canArchive={canArchive}
                    hideArchive={detail.status === "ARCHIVED"}
                    archiveHelp={archiveHelp}
                    permanentHelp={permanentHelp}
                    onDelete={(permanent) => archiveGlobalVocabulary(detail.id, permanent)}
                    onDone={() => afterDelete(detail.id)}
                  />
                )}
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg border p-2"
                  aria-label="Close editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <form
              onSubmit={(event) =>
                void saveVocabulary(event)
              }
              className="space-y-5"
            >
              {/* MAIN FIELDS */}

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  label={`Word / phrase (${selectedApp.language.name})`}
                  required
                  error={fieldErrors.term}
                >
                  {(props) => (
                    <input
                      {...props}
                      ref={termInputRef}
                      autoFocus
                      maxLength={500}
                      value={form.term}
                      onChange={(event) => setField("term", event.target.value)}
                      placeholder={isGerman ? "Bär" : "Type the word"}
                    />
                  )}
                </FormField>

                {!editingId ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-2">
                    <FormField
                      label="Meaning"
                      hint="Optional — saved as the first translation."
                      error={fieldErrors.meaning}
                    >
                      {(props) => (
                        <input
                          {...props}
                          maxLength={500}
                          value={form.meaning}
                          onChange={(event) => setField("meaning", event.target.value)}
                          placeholder={isGerman ? "bear" : "e.g. bear"}
                        />
                      )}
                    </FormField>
                    <FormField label="in" error={fieldErrors.meaningLanguageId}>
                      {(props) => (
                        <select
                          {...props}
                          value={form.meaningLanguageId}
                          onChange={(event) => setField("meaningLanguageId", event.target.value)}
                        >
                          <option value="">Language</option>
                          {languages
                            .filter((language) => language.id !== activeLanguageId)
                            .map((language) => (
                              <option key={language.id} value={language.id}>
                                {language.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </FormField>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                    Meanings and examples are edited in the sections at the bottom.
                  </div>
                )}

                {!editingId && (
                  <FormField
                    label={`Example sentence (${selectedApp.language.name})`}
                    hint="Optional. More examples can be added after saving."
                    className="md:col-span-2"
                  >
                    {(props) => (
                      <input
                        {...props}
                        maxLength={1000}
                        value={form.exampleText}
                        onChange={(event) => setField("exampleText", event.target.value)}
                        placeholder={isGerman ? "Der Bär schläft." : "Use the word in a short sentence"}
                      />
                    )}
                  </FormField>
                )}

                <label className="space-y-1 text-sm">
                  <span className="font-medium">
                    Pronunciation
                  </span>

                  <input
                    value={form.pronunciation}
                    onChange={(event) =>
                      setField(
                        "pronunciation",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border p-2.5"
                    placeholder="IPA / pronunciation"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">
                    Part of Speech
                  </span>

                  <select
                    value={form.partOfSpeech}
                    onChange={(event) =>
                      setField(
                        "partOfSpeech",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border p-2.5"
                  >
                    <option value="">Choose Type</option>

                    {[
                      "NOUN",
                      "VERB",
                      "ADJECTIVE",
                      "ADVERB",
                      "PRONOUN",
                      "PREPOSITION",
                      "CONJUNCTION",
                      "INTERJECTION",
                      "OTHER",
                    ].map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">
                    Category
                  </span>

                  <select
                    value={form.categoryId}
                    onChange={(event) =>
                      setField(
                        "categoryId",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border p-2.5"
                  >
                    <option value="">No Category</option>

                    {categories
                      .filter((category) =>
                        category.isActive ||
                        category.id === form.categoryId,
                      )
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

                <label className="space-y-1 text-sm">
                  <span className="font-medium">
                    Difficulty
                  </span>

                  <select
                    value={form.difficulty}
                    onChange={(event) =>
                      setField(
                        "difficulty",
                        event.target.value as VocabularyDifficulty,
                      )
                    }
                    className="w-full rounded-lg border p-2.5"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">
                      Medium
                    </option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">
                    Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setField(
                        "status",
                        event.target.value as VocabularyStatus,
                      )
                    }
                    className="w-full rounded-lg border p-2.5"
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* LESSON PICKER */}

              <LessonSelector
                appId={selectedApp.id}
                value={form.lessonId}
                currentLessonName={
                  detail?.lesson?.title
                }
                onChange={(value) =>
                  setField("lessonId", value)
                }
              />

              {/* MEDIA PICKERS — PREVIEW ATTACHED IMAGES / AUDIO */}
              <div className="grid gap-4 md:grid-cols-2">
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-bold text-slate-900">Vocabulary Image</h3></div>
                  {form.imageAssetId ? (
                    <MediaPreview key={`image-${form.imageAssetId}`} assetId={form.imageAssetId} type="IMAGE" className="h-44 w-full border border-slate-200 bg-white" />
                  ) : (
                    <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-slate-400"><FileImage className="h-9 w-9" /><span className="text-xs">No image attached</span></div>
                  )}
                  <p className="truncate text-xs text-slate-500" title={selectedImage?.originalName ?? form.imageAssetId}>
                    {selectedImage?.originalName ?? (form.imageAssetId ? "Saved image attached" : "Select an existing image or upload a new one")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!canWrite} onClick={() => setMediaPickerType("IMAGE")} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><ImageIcon className="h-3.5 w-3.5" /> Choose / Upload</button>
                    {form.imageAssetId && <button type="button" disabled={!canWrite} onClick={() => { setField("imageAssetId", ""); setSelectedImage(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-50">Remove</button>}
                  </div>
                </section>
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2"><FileAudio className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-bold text-slate-900">Pronunciation Audio</h3></div>
                  {form.audioAssetId ? (
                    <MediaPreview key={`audio-${form.audioAssetId}`} assetId={form.audioAssetId} type="AUDIO" className="h-44 w-full border border-slate-200 bg-white p-2" />
                  ) : (
                    <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-slate-400"><FileAudio className="h-9 w-9" /><span className="text-xs">No audio attached</span></div>
                  )}
                  <p className="truncate text-xs text-slate-500" title={selectedAudio?.originalName ?? form.audioAssetId}>
                    {selectedAudio?.originalName ?? (form.audioAssetId ? "Saved audio attached" : "Choose a recording from the media library")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!canWrite} onClick={() => setMediaPickerType("AUDIO")} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><FileAudio className="h-3.5 w-3.5" /> Choose / Upload</button>
                    {form.audioAssetId && <button type="button" disabled={!canWrite} onClick={() => { setField("audioAssetId", ""); setSelectedAudio(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-50">Remove</button>}
                  </div>
                </section>
              </div>

              {/* GERMAN GRAMMAR */}

              {isGerman && (
                <section className="rounded-xl border bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold">
                    German Grammar
                  </h3>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span>Article</span>

                      <select
                        value={form.article}
                        onChange={(event) =>
                          setField(
                            "article",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border bg-white p-2.5"
                      >
                        <option value="">None</option>
                        <option value="der">der</option>
                        <option value="die">die</option>
                        <option value="das">das</option>
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span>Gender</span>

                      <select
                        value={form.gender}
                        onChange={(event) =>
                          setField(
                            "gender",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border bg-white p-2.5"
                      >
                        <option value="">None</option>
                        <option value="masculine">
                          Masculine
                        </option>
                        <option value="feminine">
                          Feminine
                        </option>
                        <option value="neuter">
                          Neuter
                        </option>
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span>Plural</span>

                      <input
                        value={form.plural}
                        onChange={(event) =>
                          setField(
                            "plural",
                            event.target.value,
                          )
                        }
                        placeholder="Bären"
                        className="w-full rounded-lg border bg-white p-2.5"
                      />
                    </label>
                  </div>
                </section>
              )}

              {/* ADVANCED GRAMMAR + NOTES (rarely needed: collapsed) */}

              <details
                open={form.advancedGrammar.length > 0 || Boolean(form.notes)}
                className="rounded-xl border p-4"
              >
                <summary className="cursor-pointer text-sm font-bold text-slate-700">
                  More options: extra grammar and notes
                </summary>
                <div className="mt-4 space-y-4">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold">
                      Advanced Grammar
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Optional. Add grammar properties
                      without writing JSON.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addGrammarField}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold"
                  >
                    + Add Property
                  </button>
                </div>

                {form.advancedGrammar.map(
                  (field, index) => (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <input
                        value={field.key}
                        onChange={(event) =>
                          updateGrammarField(
                            index,
                            "key",
                            event.target.value,
                          )
                        }
                        placeholder="Property (e.g. case)"
                        className="rounded-lg border p-2.5 text-sm"
                      />

                      <input
                        value={field.value}
                        onChange={(event) =>
                          updateGrammarField(
                            index,
                            "value",
                            event.target.value,
                          )
                        }
                        placeholder="Value (e.g. nominative)"
                        className="rounded-lg border p-2.5 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeGrammarField(index)
                        }
                        className="rounded-lg border px-3 py-2 text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ),
                )}

                {form.advancedGrammar.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No additional grammar is required.
                  </p>
                )}
              </section>

              {/* NOTES */}

              <label className="block space-y-1 text-sm">
                <span className="font-medium">
                  Notes (optional)
                </span>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setField(
                      "notes",
                      event.target.value,
                    )
                  }
                  placeholder="Additional explanation or teaching notes..."
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
                </div>
              </details>

              {canWrite && (
                <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                  {!editingId ? (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={addAnother}
                        onChange={(event) => setAddAnother(event.target.checked)}
                      />
                      Save and add the next word (keeps category, lesson and language)
                    </label>
                  ) : (
                    <span className="text-xs text-slate-500">Changes are saved only when you click Save.</span>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="rounded-lg border px-4 py-2.5 text-sm"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Save changes"
                          : addAnother
                            ? "Save & add next"
                            : "Create word"}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* TRANSLATIONS */}

            {editingId && detail && (
              <div className="grid gap-5 border-t pt-5 lg:grid-cols-2">
                <section className="space-y-3">
                  <h3 className="font-bold">
                    Meanings
                  </h3>
                  {(detail.translations?.length ?? 0) === 0 && (
                    <p className="text-xs text-amber-700">
                      No meaning yet. Learners need at least one.
                    </p>
                  )}

                  {detail.translations?.map(
                    (translation) => (
                      <div
                        key={translation.id}
                        className="flex justify-between gap-3 rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold">
                            {translation.language?.name ??
                              translation.languageId}
                          </p>

                          <p>{translation.meaning}</p>
                        </div>

                        {canWrite && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTranslationId(
                                  translation.id,
                                );

                                setTranslationLanguage(
                                  translation.languageId,
                                );

                                setTranslationMeaning(
                                  translation.meaning,
                                );

                                setTranslationNotes(
                                  translation.notes ?? "",
                                );
                              }}
                              className="text-indigo-600"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void removeTranslation(
                                  translation.id,
                                  translation.meaning,
                                )
                              }
                              className="text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  )}

                  {canWrite && (
                    <form
                      onSubmit={(event) =>
                        void saveTranslation(event)
                      }
                      className="space-y-3 rounded-lg bg-slate-50 p-3"
                    >
                      <select
                        aria-label="Meaning language"
                        value={translationLanguage}
                        onChange={(event) => {
                          const languageId = event.target.value;
                          setTranslationLanguage(languageId);
                          // One meaning per language: open the saved one for editing.
                          const existing = detail.translations?.find(
                            (t) => t.languageId === languageId,
                          );
                          setEditingTranslationId(existing?.id ?? null);
                          setTranslationMeaning(existing?.meaning ?? "");
                          setTranslationNotes(existing?.notes ?? "");
                        }}
                        className="w-full rounded-lg border bg-white p-2.5"
                      >
                        <option value="">
                          Meaning language
                        </option>

                        {languages.map((language) => (
                          <option
                            key={language.id}
                            value={language.id}
                          >
                            {language.name}
                          </option>
                        ))}
                      </select>

                      <input
                        aria-label="Meaning"
                        aria-invalid={Boolean(fieldErrors.translation)}
                        value={translationMeaning}
                        onChange={(event) =>
                          setTranslationMeaning(
                            event.target.value,
                          )
                        }
                        placeholder="Meaning"
                        className="w-full rounded-lg border p-2.5"
                      />

                      <textarea
                        value={translationNotes}
                        onChange={(event) =>
                          setTranslationNotes(
                            event.target.value,
                          )
                        }
                        placeholder="Notes (optional)"
                        rows={2}
                        className="w-full rounded-lg border p-2.5"
                      />

                      {fieldErrors.translation && (
                        <p className="text-xs font-medium text-rose-600">{fieldErrors.translation}</p>
                      )}

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {editingTranslationId
                          ? "Update meaning"
                          : "Add meaning"}
                      </button>
                      {editingTranslationId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTranslationId(null);
                            setTranslationMeaning("");
                            setTranslationNotes("");
                          }}
                          className="ml-2 text-xs text-slate-500 underline"
                        >
                          Cancel edit
                        </button>
                      )}
                    </form>
                  )}
                </section>

                {/* EXAMPLES */}

                <section className="space-y-3">
                  <h3 className="font-bold">
                    Example Sentences
                  </h3>

                  {detail.examples?.map((example) => (
                    <div
                      key={example.id}
                      className="flex justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="text-xs text-slate-500">
                          {example.language?.code ??
                            example.languageId}
                          {example.translationGroupId
                            ? ` · ${example.translationGroupId}`
                            : ""}
                        </p>

                        <p>{example.text}</p>
                      </div>

                      {canWrite && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExampleId(
                                example.id,
                              );

                              setExampleLanguage(
                                example.languageId,
                              );

                              setExampleText(example.text);

                              setExampleGroup(
                                example.translationGroupId ??
                                  "",
                              );
                            }}
                            className="text-indigo-600"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void removeExample(
                                example.id,
                                example.text,
                              )
                            }
                            className="text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {canWrite && (
                    <form
                      onSubmit={(event) =>
                        void saveExample(event)
                      }
                      className="space-y-3 rounded-lg bg-slate-50 p-3"
                    >
                      <select
                        aria-label="Example language"
                        value={exampleLanguage}
                        onChange={(event) =>
                          setExampleLanguage(
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border bg-white p-2.5"
                      >
                        <option value="">
                          Example language
                        </option>

                        {languages.map((language) => (
                          <option
                            key={language.id}
                            value={language.id}
                          >
                            {language.name}
                          </option>
                        ))}
                      </select>

                      <textarea
                        aria-label="Example sentence"
                        aria-invalid={Boolean(fieldErrors.example)}
                        rows={2}
                        value={exampleText}
                        onChange={(event) =>
                          setExampleText(
                            event.target.value,
                          )
                        }
                        placeholder="Example sentence"
                        className="w-full rounded-lg border p-2.5"
                      />

                      <input
                        value={exampleGroup}
                        onChange={(event) =>
                          setExampleGroup(
                            event.target.value,
                          )
                        }
                        placeholder="Translation group (optional, e.g. example-1)"
                        title="Give the same group to a sentence and its translation so apps can show them together."
                        className="w-full rounded-lg border p-2.5"
                      />

                      {fieldErrors.example && (
                        <p className="text-xs font-medium text-rose-600">{fieldErrors.example}</p>
                      )}

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {editingExampleId
                          ? "Update example"
                          : "Add example"}
                      </button>
                      {editingExampleId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExampleId(null);
                            setExampleText("");
                            setExampleGroup("");
                          }}
                          className="ml-2 text-xs text-slate-500 underline"
                        >
                          Cancel edit
                        </button>
                      )}
                    </form>
                  )}
                </section>
              </div>
            )}


          </div>
        </div>
      )}

      {/* MEDIA PICKER - OUTSIDE EDITOR FORM */}

      {mediaPickerType && (
        <MediaLibraryPicker
          type={mediaPickerType}
          appId={selectedApp.id}
          selectedId={
            mediaPickerType === "IMAGE"
              ? form.imageAssetId
              : form.audioAssetId
          }
          onSelect={(asset) => {
            if (mediaPickerType === "IMAGE") {
              setField("imageAssetId", asset.id);
              setSelectedImage(asset);
            } else {
              setField("audioAssetId", asset.id);
              setSelectedAudio(asset);
            }

            setMediaPickerType(null);
          }}
          onClose={() =>
            setMediaPickerType(null)
          }
        />
      )}
    </div>
  );
}
