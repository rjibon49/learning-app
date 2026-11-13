
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { getPublicLanguages } from "@/lib/api/languages";
import { Pagination } from "@/components/ui/pagination";

import {
  getCourses,
  getModules,
  getLessons,
  type Course,
  type CourseModule,
  type Lesson,
} from "@/lib/api/courses";

import {
  getMediaAssets,
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
  };
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

function MediaLibraryPicker({
  type,
  appId,
  selectedId,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [previewUrl, setPreviewUrl] = useState<
    Record<string, string>
  >({});

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError("");

    try {
      const data = await getMediaAssets(
        undefined,
        targetPage,
        100,
      );

      setAssets(data);
      setPage(targetPage);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (asset.type !== type) return false;
      if (asset.status !== "READY") return false;

      if (!query) return true;

      return (
        asset.originalName ??
        asset.objectKey ??
        ""
      ).toLowerCase().includes(query);
    });
  }, [assets, search, type]);

  async function previewAsset(asset: MediaAsset) {
    try {
      const access = await getMediaAccess(asset.id);

      setPreviewUrl((previous) => ({
        ...previous,
        [asset.id]: access.url,
      }));
    } catch (err) {
      setError(getError(err));
    }
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const asset = await uploadMedia(
        file,
        appId,
        "PRIVATE",
      );

      if (
        asset.type === type &&
        asset.status === "READY"
      ) {
        onSelect(asset);
        return;
      }

      setError(
        "Upload completed, but processing is not READY. Refresh the library shortly.",
      );

      await load(1);
    } catch (err) {
      setError(getError(err));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Select ${type.toLowerCase()}`}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-bold">
              Choose{" "}
              {type === "IMAGE" ? "Image" : "Audio"}
            </h2>
            <p className="text-xs text-slate-500">
              Cloudflare R2 Media Library
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border p-2"
            aria-label="Close picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search filenames on this page..."
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={() => void load(page)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload from PC"}

              <input
                type="file"
                disabled={uploading}
                className="hidden"
                accept={
                  type === "IMAGE"
                    ? "image/jpeg,image/png,image/webp,image/avif,image/tiff"
                    : "audio/*"
                }
                onChange={(event) =>
                  void handleUpload(event)
                }
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}
        </div>

        <div className="min-h-56 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Loading media library...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No READY {type.toLowerCase()} files found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  className={
                    "space-y-3 rounded-xl border p-3 " +
                    (
                      asset.id === selectedId
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200"
                    )
                  }
                >
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                    {type === "IMAGE" &&
                    previewUrl[asset.id] ? (
                      // Signed private R2 URL.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl[asset.id]}
                        alt={asset.originalName ?? "Media"}
                        className="h-full w-full object-contain"
                      />
                    ) : type === "IMAGE" ? (
                      <ImageIcon className="h-9 w-9 text-indigo-500" />
                    ) : previewUrl[asset.id] ? (
                      <audio
                        controls
                        src={previewUrl[asset.id]}
                        className="w-full"
                      />
                    ) : (
                      <FileAudio className="h-9 w-9 text-amber-500" />
                    )}
                  </div>

                  <p className="break-all text-xs font-medium">
                    {asset.originalName ?? asset.objectKey}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      className="rounded-md bg-indigo-600 px-2 py-1.5 text-xs text-white"
                    >
                      {asset.id === selectedId
                        ? "Selected"
                        : "Select"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void previewAsset(asset)
                      }
                      className="rounded-md border px-2 py-1.5 text-xs"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => void load(page - 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">
            Page {page}
          </span>

          <button
            type="button"
            disabled={loading || assets.length < 100}
            onClick={() => void load(page + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
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

  const activeLanguageId =
    selectedApp?.languageId ?? "";

  const isGerman =
    selectedApp?.language?.code === "de";

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

  useEffect(() => {
    void loadVocabulary();
  }, [loadVocabulary]);

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
    setTranslationLanguage("");
    setTranslationMeaning("");
    setTranslationNotes("");
    setEditingTranslationId(null);

    setExampleLanguage("");
    setExampleText("");
    setExampleGroup("");
    setEditingExampleId(null);
  }, []);

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
    if (initialEditId) {
      void openEditor(initialEditId);
    }
  }, [initialEditId, openEditor]);

  function createNew() {
    setEditingId(null);
    setDetail(null);
    setForm(emptyForm());
    setSelectedImage(null);
    setSelectedAudio(null);
    setEditorOpen(true);
    clearRelatedForms();
    setError("");
    setNotice("");
  }

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
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

    if (!canWrite || !selectedApp) return;

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

      if (!input.term) {
        throw new Error(
          "Vocabulary term is required.",
        );
      }

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
        setEditingId(saved.id);
      }

      await reloadDetail(saved.id);
      await loadVocabulary();

      setNotice(
        "Vocabulary saved. You can now manage translations and examples.",
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(
    item: GlobalVocabularyItem,
  ) {
    if (!canArchive) return;

    if (!window.confirm(
      `Archive "${item.term}"?`,
    )) {
      return;
    }

    try {
      await archiveGlobalVocabulary(item.id);
      await loadVocabulary();

      if (editingId === item.id) {
        setEditorOpen(false);
      }

      setNotice("Vocabulary archived.");
    } catch (err) {
      setError(getError(err));
    }
  }

  async function saveTranslation(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingId || !translationLanguage) return;

    setSaving(true);
    setError("");

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

      setTranslationLanguage("");
      setTranslationMeaning("");
      setTranslationNotes("");
      setEditingTranslationId(null);

      setNotice("Translation saved.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeTranslation(id: string) {
    if (
      !editingId ||
      !window.confirm("Delete translation?")
    ) {
      return;
    }

    try {
      await deleteVocabularyTranslation(
        editingId,
        id,
      );
      await reloadDetail(editingId);
    } catch (err) {
      setError(getError(err));
    }
  }

  async function saveExample(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingId || !exampleLanguage) return;

    setSaving(true);
    setError("");

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

      setExampleLanguage("");
      setExampleText("");
      setExampleGroup("");
      setEditingExampleId(null);

      setNotice("Example saved.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeExample(id: string) {
    if (
      !editingId ||
      !window.confirm("Delete example?")
    ) {
      return;
    }

    try {
      await deleteVocabularyExample(
        editingId,
        id,
      );
      await reloadDetail(editingId);
    } catch (err) {
      setError(getError(err));
    }
  }

  function closeEditor() {
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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Global Vocabulary
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {selectedApp.language.name} ·{" "}
            {selectedApp.name}
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

      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
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

      {/* VOCABULARY LIST */}

      <section className="overflow-hidden rounded-xl border bg-white">
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

                    {canArchive &&
                      item.status !== "ARCHIVED" && (
                        <button
                          type="button"
                          onClick={() =>
                            void archiveItem(item)
                          }
                          className="ml-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
                        >
                          Archive
                        </button>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3">
          <div className="max-h-[94vh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-xl bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {editingId
                  ? "Edit Vocabulary"
                  : "Create Vocabulary"}
              </h2>

              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border p-2"
                aria-label="Close editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(event) =>
                void saveVocabulary(event)
              }
              className="space-y-5"
            >
              {/* MAIN FIELDS */}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">
                    Term
                  </span>

                  <input
                    required
                    maxLength={500}
                    value={form.term}
                    onChange={(event) =>
                      setField(
                        "term",
                        event.target.value,
                      )
                    }
                    placeholder={
                      isGerman
                        ? "Bär"
                        : "Vocabulary term"
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>

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

              {/* MEDIA PICKERS */}

              <div className="grid gap-3 md:grid-cols-2">
                <section className="space-y-2 rounded-xl border p-4">
                  <h3 className="text-sm font-bold">
                    Vocabulary Image
                  </h3>

                  <p className="break-all text-xs text-slate-500">
                    {selectedImage?.originalName ||
                      (
                        form.imageAssetId
                          ? "Existing image attached"
                          : "No image selected"
                      )}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMediaPickerType("IMAGE")
                      }
                      className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                    >
                      Choose Image
                    </button>

                    {form.imageAssetId && (
                      <button
                        type="button"
                        onClick={() => {
                          setField("imageAssetId", "");
                          setSelectedImage(null);
                        }}
                        className="rounded-lg border px-3 py-2 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </section>

                <section className="space-y-2 rounded-xl border p-4">
                  <h3 className="text-sm font-bold">
                    Vocabulary Audio
                  </h3>

                  <p className="break-all text-xs text-slate-500">
                    {selectedAudio?.originalName ||
                      (
                        form.audioAssetId
                          ? "Existing audio attached"
                          : "No audio selected"
                      )}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMediaPickerType("AUDIO")
                      }
                      className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                    >
                      Choose Audio
                    </button>

                    {form.audioAssetId && (
                      <button
                        type="button"
                        onClick={() => {
                          setField("audioAssetId", "");
                          setSelectedAudio(null);
                        }}
                        className="rounded-lg border px-3 py-2 text-xs"
                      >
                        Remove
                      </button>
                    )}
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

              {/* ADVANCED GRAMMAR */}

              <section className="space-y-3 rounded-xl border p-4">
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

              {canWrite && (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Vocabulary"}
                </button>
              )}
            </form>

            {/* TRANSLATIONS */}

            {editingId && detail && (
              <div className="grid gap-5 border-t pt-5 lg:grid-cols-2">
                <section className="space-y-3">
                  <h3 className="font-bold">
                    Translations
                  </h3>

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
                        required
                        value={translationLanguage}
                        onChange={(event) =>
                          setTranslationLanguage(
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border bg-white p-2.5"
                      >
                        <option value="">
                          Translation language
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
                        required
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
                        placeholder="Translation notes"
                        className="w-full rounded-lg border p-2.5"
                      />

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {editingTranslationId
                          ? "Update Translation"
                          : "Add Translation"}
                      </button>
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
                        required
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
                        required
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
                        placeholder="Translation Group (example-1)"
                        className="w-full rounded-lg border p-2.5"
                      />

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {editingExampleId
                          ? "Update Example"
                          : "Add Example"}
                      </button>
                    </form>
                  )}
                </section>
              </div>
            )}

            {!editingId && (
              <p className="border-t pt-3 text-xs text-slate-500">
                Save the vocabulary first to add
                translations and example sentences.
              </p>
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
