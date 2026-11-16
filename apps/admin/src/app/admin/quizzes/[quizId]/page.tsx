
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileAudio,
  ImageIcon,
  Link2,
  Search,
  X,
} from "lucide-react";

import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/lib/auth/auth-context";

import {
  getQuiz,
  getQuizQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type Quiz,
  type QuizQuestion,
  type QuizType,
  type QuizOption,
} from "@/lib/api/quizzes";

import {
  getMediaAssets,
  type MediaAsset,
} from "@/lib/api/media";

// ===============================================
// TYPES
// ===============================================

type MediaKind = "IMAGE" | "AUDIO";
type SourceMode = "LIBRARY" | "URL";

type QuestionForm = {
  questionType: QuizType;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  points: number;

  imageUrl: string;
  audioUrl: string;

  imageSourceMode: SourceMode;
  audioSourceMode: SourceMode;

  selectedImageId: string;
  selectedAudioId: string;

  options: string[];
  correctIndex: number;
};

type MediaPickerProps = {
  type: MediaKind;
  selectedId: string;
  onSelect: (asset: MediaAsset, url: string) => void;
  onClose: () => void;
};

const PAGE_LIMIT = 10;
const MEDIA_LIMIT = 50;

const QUESTION_TYPES: Array<{
  value: QuizType;
  label: string;
}> = [
  {
    value: "MULTIPLE_CHOICE",
    label: "Multiple Choice",
  },
  {
    value: "TRUE_FALSE",
    label: "True / False",
  },
  {
    value: "TEXT_TO_TARGET",
    label: "Text to Target",
  },
  {
    value: "TARGET_TO_TRANSLATION",
    label: "Target to Translation",
  },
  {
    value: "TRANSLATION_TO_TARGET",
    label: "Translation to Target",
  },
  {
    value: "IMAGE_TO_TARGET",
    label: "Image to Text",
  },
  {
    value: "AUDIO_TO_TARGET",
    label: "Audio to Target",
  },
  {
    value: "LISTEN_AND_TYPE",
    label: "Listen and Type",
  },
  {
    value: "FILL_BLANK",
    label: "Fill in the Blank",
  },
  {
    value: "ARTICLE",
    label: "German Article",
  },
  {
    value: "MATCHING",
    label: "Matching",
  },
  {
    value: "ORDERING",
    label: "Ordering",
  },
  {
    value: "SPEAKING",
    label: "Speaking",
  },
];

function emptyForm(): QuestionForm {
  return {
    questionType: "MULTIPLE_CHOICE",
    questionText: "",
    correctAnswer: "",
    explanation: "",
    points: 1,

    imageUrl: "",
    audioUrl: "",

    imageSourceMode: "URL",
    audioSourceMode: "URL",

    selectedImageId: "",
    selectedAudioId: "",

    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Request failed. Please try again.";
}

function requiresImage(type: QuizType): boolean {
  return type === "IMAGE_TO_TARGET";
}

function requiresAudio(type: QuizType): boolean {
  return (
    type === "AUDIO_TO_TARGET" ||
    type === "LISTEN_AND_TYPE"
  );
}

function hasChoices(type: QuizType): boolean {
  return (
    type === "MULTIPLE_CHOICE" ||
    type === "TRUE_FALSE"
  );
}

function validHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isPermanentUrl(value: string): boolean {
  if (!validHttpsUrl(value)) return false;

  try {
    const url = new URL(value);
    const query = url.searchParams;

    // Reject common temporary signed URL patterns.
    if (
      query.has("X-Amz-Signature") ||
      query.has("X-Amz-Expires") ||
      query.has("X-Amz-Credential") ||
      query.has("Signature") ||
      query.has("Expires") ||
      query.has("token")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getPublicMediaUrl(
  asset: MediaAsset,
  type: MediaKind,
): string | null {
  if (asset.type !== type) return null;
  if (asset.status !== "READY") return null;
  if (asset.visibility !== "PUBLIC") return null;

  const url = asset.publicUrl;

  if (
    typeof url !== "string" ||
    !isPermanentUrl(url)
  ) {
    return null;
  }

  return url;
}

// ===============================================
// REUSABLE IMAGE / AUDIO MEDIA PICKER
// ===============================================

function QuizMediaPicker({
  type,
  selectedId,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [assets, setAssets] =
    useState<MediaAsset[]>([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMedia = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");

      try {
        const result = await getMediaAssets(
          undefined,
          targetPage,
          MEDIA_LIMIT,
        );

        setAssets(result);
        setPage(targetPage);
      } catch (err) {
        setError(getError(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadMedia(1);
  }, [loadMedia]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (!getPublicMediaUrl(asset, type)) {
        return false;
      }

      if (!query) return true;

      const name = (
        asset.originalName ??
        asset.objectKey ??
        ""
      ).toLowerCase();

      return name.includes(query);
    });
  }, [assets, search, type]);

  function selectAsset(asset: MediaAsset) {
    const url = getPublicMediaUrl(asset, type);

    if (!url) {
      setError(
        "The selected media has no permanent public URL.",
      );
      return;
    }

    onSelect(asset, url);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Select ${type.toLowerCase()}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">

        <header className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              {type === "IMAGE" ? (
                <ImageIcon className="h-5 w-5 text-indigo-600" />
              ) : (
                <FileAudio className="h-5 w-5 text-indigo-600" />
              )}

              {type === "IMAGE"
                ? "Choose Image"
                : "Choose Audio"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Select a READY media file with a permanent public URL.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close media picker"
            className="rounded-lg border p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={
                type === "IMAGE"
                  ? "Search image filenames on this page..."
                  : "Search audio filenames on this page..."
              }
              className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>

        <div className="min-h-48 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Loading media library...
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg bg-amber-50 p-5 text-center">
              <p className="text-sm font-medium text-amber-900">
                No suitable {type.toLowerCase()} found.
              </p>

              <p className="mt-2 text-xs text-amber-800">
                This picker requires READY public media.
                Private R2 files will be supported after
                secure media playback integration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => {
                const url = getPublicMediaUrl(
                  asset,
                  type,
                );

                if (!url) return null;

                const selected =
                  selectedId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className={
                      "space-y-3 rounded-xl border p-3 " +
                      (
                        selected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white"
                      )
                    }
                  >
                    <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {type === "IMAGE" ? (
                        // External CMS media image preview.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={
                            asset.originalName ??
                            "Vocabulary image"
                          }
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FileAudio className="h-10 w-10 text-indigo-500" />
                      )}
                    </div>

                    <p className="break-all text-xs font-medium text-slate-700">
                      {asset.originalName ??
                        asset.objectKey ??
                        "Unnamed media"}
                    </p>

                    {type === "AUDIO" && (
                      <audio
                        controls
                        preload="none"
                        src={url}
                        className="w-full"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        selectAsset(asset)
                      }
                      className={
                        "w-full rounded-lg px-3 py-2 text-xs font-semibold " +
                        (
                          selected
                            ? "bg-emerald-600 text-white"
                            : "bg-indigo-600 text-white"
                        )
                      }
                    >
                      {selected
                        ? "Selected"
                        : `Select ${type === "IMAGE" ? "Image" : "Audio"}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t p-4">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() =>
              void loadMedia(page - 1)
            }
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">
            Page {page}
          </span>

          <button
            type="button"
            disabled={
              loading ||
              assets.length < MEDIA_LIMIT
            }
            onClick={() =>
              void loadMedia(page + 1)
            }
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </div>
  );
}

// ===============================================
// MAIN QUIZ QUESTIONS PAGE
// ===============================================

export default function QuizQuestionsPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = params.quizId;

  const { admin } = useAuth();

  const [quiz, setQuiz] =
    useState<Quiz | null>(null);

  const [questions, setQuestions] =
    useState<QuizQuestion[]>([]);

  const [form, setForm] =
    useState<QuestionForm>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_LIMIT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [mediaPicker, setMediaPicker] =
    useState<MediaKind | null>(null);

  const canWrite =
    Boolean(admin) &&
    quiz !== null &&
    quiz.status !== "PUBLISHED" &&
    quiz.status !== "ARCHIVED";

  const canDelete =
    canWrite &&
    (
      admin?.role === "SUPER_ADMIN" ||
      admin?.role === "ADMIN"
    );

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [quizData, questionData] =
        await Promise.all([
          getQuiz(quizId),
          getQuizQuestions(quizId),
        ]);

      setQuiz(quizData);
      setQuestions(questionData);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  function editQuestion(question: QuizQuestion) {
    const options = [...question.options].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    const texts = options.map(
      (option) => option.text,
    );

    setEditingId(question.id);

    setForm({
      questionType: question.questionType,
      questionText:
        question.questionText ?? "",
      correctAnswer:
        question.correctAnswer ?? "",
      explanation:
        question.explanation ?? "",
      points: question.points,

      imageUrl: question.imageUrl ?? "",
      audioUrl: question.audioUrl ?? "",

      imageSourceMode: "URL",
      audioSourceMode: "URL",

      selectedImageId: "",
      selectedAudioId: "",

      options: [
        ...texts,
        ...Array(
          Math.max(0, 4 - texts.length),
        ).fill(""),
      ],

      correctIndex: Math.max(
        0,
        options.findIndex(
          (option) => option.isCorrect,
        ),
      ),
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openMediaPicker(type: MediaKind) {
    setMediaPicker(type);

    setForm((old) => ({
      ...old,
      ...(type === "IMAGE"
        ? { imageSourceMode: "LIBRARY" as const }
        : { audioSourceMode: "LIBRARY" as const }),
    }));
  }

  function selectMedia(
    asset: MediaAsset,
    url: string,
  ) {
    setForm((old) => {
      if (asset.type === "IMAGE") {
        return {
          ...old,
          imageUrl: url,
          imageSourceMode: "LIBRARY",
          selectedImageId: asset.id,
        };
      }

      return {
        ...old,
        audioUrl: url,
        audioSourceMode: "LIBRARY",
        selectedAudioId: asset.id,
      };
    });

    setMediaPicker(null);
  }

  function removeMedia(type: MediaKind) {
    setForm((old) => ({
      ...old,
      ...(type === "IMAGE"
        ? {
            imageUrl: "",
            selectedImageId: "",
          }
        : {
            audioUrl: "",
            selectedAudioId: "",
          }),
    }));
  }

  async function saveQuestion(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canWrite) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const points = Number(form.points);

      if (
        !Number.isInteger(points) ||
        points < 1 ||
        points > 1000
      ) {
        throw new Error(
          "Points must be between 1 and 1000.",
        );
      }

      let options: QuizOption[] = [];

      if (hasChoices(form.questionType)) {
        const texts =
          form.questionType === "TRUE_FALSE"
            ? ["True", "False"]
            : form.options;

        const valid = texts
          .map((text, originalIndex) => ({
            text: text.trim(),
            originalIndex,
          }))
          .filter((item) => item.text);

        if (valid.length < 2) {
          throw new Error(
            "At least two answer options are required.",
          );
        }

        if (
          !valid.some(
            (item) =>
              item.originalIndex ===
              form.correctIndex,
          )
        ) {
          throw new Error(
            "Select a valid correct answer.",
          );
        }

        options = valid.map((item, index) => ({
          text: item.text,
          isCorrect:
            item.originalIndex ===
            form.correctIndex,
          sortOrder: index,
        }));
      } else if (!form.correctAnswer.trim()) {
        throw new Error(
          "Correct answer is required.",
        );
      }

      const imageUrl = form.imageUrl.trim();
      const audioUrl = form.audioUrl.trim();

      if (requiresImage(form.questionType)) {
        if (!isPermanentUrl(imageUrl)) {
          throw new Error(
            "Choose a permanent public image or paste a valid HTTPS image URL.",
          );
        }
      }

      if (requiresAudio(form.questionType)) {
        if (!isPermanentUrl(audioUrl)) {
          throw new Error(
            "Choose a permanent public audio or paste a valid HTTPS audio URL.",
          );
        }
      }

      const input = {
        questionType: form.questionType,
        questionText:
          form.questionText.trim() || null,

        correctAnswer:
          hasChoices(form.questionType)
            ? null
            : form.correctAnswer.trim(),

        explanation:
          form.explanation.trim() || null,

        imageUrl:
          requiresImage(form.questionType)
            ? imageUrl
            : null,

        audioUrl:
          requiresAudio(form.questionType)
            ? audioUrl
            : null,

        points,
        options,
      };

      if (editingId) {
        await updateQuestion(
          editingId,
          input,
        );
      } else {
        await createQuestion({
          ...input,
          quizId,
          sortOrder: questions.length,
        });
      }

      resetForm();
      setMessage("Question saved successfully.");
      await reload();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!canDelete) return;

    if (!window.confirm("Delete this question?")) {
      return;
    }

    try {
      await deleteQuestion(id);
      await reload();
      setMessage("Question deleted.");
    } catch (err) {
      setError(getError(err));
    }
  }

  const totalPages = Math.max(
    1,
    Math.ceil(questions.length / limit),
  );

  const safePage = Math.min(page, totalPages);

  const visibleQuestions = questions.slice(
    (safePage - 1) * limit,
    safePage * limit,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/quizzes"
        className="text-sm font-semibold text-indigo-600"
      >
        ← Back to Quizzes
      </Link>

      <header>
        <h1 className="text-2xl font-bold">
          {quiz?.title ?? "Quiz Questions"}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {quiz?.status ?? "Loading"} ·{" "}
          {questions.length} questions
        </p>
      </header>

      {quiz?.status === "PUBLISHED" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Unpublish this quiz before editing its questions.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      {canWrite && (
        <form
          onSubmit={(event) =>
            void saveQuestion(event)
          }
          className="space-y-5 rounded-xl border bg-white p-5"
        >
          <h2 className="text-lg font-semibold">
            {editingId
              ? "Edit Question"
              : "Add Question"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Question Type</span>

              <select
                value={form.questionType}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    questionType:
                      event.target.value as QuizType,
                    correctIndex: 0,
                  }))
                }
                className="w-full rounded-lg border p-2.5"
              >
                {QUESTION_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Points</span>

              <input
                type="number"
                min={1}
                max={1000}
                value={form.points}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    points: Number(
                      event.target.value,
                    ),
                  }))
                }
                className="w-full rounded-lg border p-2.5"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span>Question / Instruction</span>

            <textarea
              rows={3}
              value={form.questionText}
              onChange={(event) =>
                setForm((old) => ({
                  ...old,
                  questionText:
                    event.target.value,
                }))
              }
              placeholder="What is shown in the image?"
              className="w-full rounded-lg border p-2.5"
            />
          </label>

          {/* ANSWER OPTIONS */}

          {hasChoices(form.questionType) ? (
            <section className="space-y-3 rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold">
                Answer Choices
              </h3>

              {(
                form.questionType === "TRUE_FALSE"
                  ? ["True", "False"]
                  : form.options
              ).map((option, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={
                      form.correctIndex === index
                    }
                    onChange={() =>
                      setForm((old) => ({
                        ...old,
                        correctIndex: index,
                      }))
                    }
                  />

                  <input
                    disabled={
                      form.questionType ===
                      "TRUE_FALSE"
                    }
                    value={option}
                    onChange={(event) =>
                      setForm((old) => ({
                        ...old,
                        options: old.options.map(
                          (text, i) =>
                            i === index
                              ? event.target.value
                              : text,
                        ),
                      }))
                    }
                    placeholder={`Option ${index + 1}`}
                    className="w-full rounded-lg border bg-white p-2.5 text-sm"
                  />
                </div>
              ))}

              <p className="text-xs text-slate-500">
                Select the radio button beside the correct answer.
              </p>

              {form.questionType ===
                "MULTIPLE_CHOICE" && (
                <button
                  type="button"
                  disabled={
                    form.options.length >= 30
                  }
                  onClick={() =>
                    setForm((old) => ({
                      ...old,
                      options: [
                        ...old.options,
                        "",
                      ],
                    }))
                  }
                  className="rounded-lg border px-3 py-2 text-xs"
                >
                  + Add Option
                </button>
              )}
            </section>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>Correct Answer</span>

              <input
                required
                value={form.correctAnswer}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    correctAnswer:
                      event.target.value,
                  }))
                }
                placeholder="Expected answer"
                className="w-full rounded-lg border p-2.5"
              />
            </label>
          )}

          {/* IMAGE SOURCE */}

          {requiresImage(form.questionType) && (
            <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <ImageIcon className="h-4 w-4 text-indigo-600" />
                  Image Source
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Choose an image from Media Library
                  or paste a permanent HTTPS image URL.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="image-source"
                    checked={
                      form.imageSourceMode ===
                      "LIBRARY"
                    }
                    onChange={() =>
                      openMediaPicker("IMAGE")
                    }
                  />
                  Choose from Media Library
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="image-source"
                    checked={
                      form.imageSourceMode === "URL"
                    }
                    onChange={() =>
                      setForm((old) => ({
                        ...old,
                        imageSourceMode: "URL",
                        selectedImageId: "",
                      }))
                    }
                  />
                  Paste Image URL
                </label>
              </div>

              {form.imageSourceMode ===
                "LIBRARY" ? (
                <button
                  type="button"
                  onClick={() =>
                    openMediaPicker("IMAGE")
                  }
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Browse Image Library
                </button>
              ) : (
                <label className="block space-y-1 text-sm">
                  <span>HTTPS Image URL</span>

                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) =>
                      setForm((old) => ({
                        ...old,
                        imageUrl:
                          event.target.value,
                      }))
                    }
                    placeholder="https://example.com/apple.webp"
                    className="w-full rounded-lg border bg-white p-2.5"
                  />
                </label>
              )}

              {form.imageUrl && (
                <div className="space-y-3 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold">
                    Image Preview
                  </p>

                  {validHttpsUrl(form.imageUrl) ? (
                    // URL preview; protected content is
                    // not copied into the application.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="Quiz question preview"
                      className="max-h-64 w-full rounded-lg border object-contain"
                    />
                  ) : (
                    <p className="text-xs text-red-600">
                      Enter a valid HTTPS image URL.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      removeMedia("IMAGE")
                    }
                    className="text-xs font-semibold text-red-600"
                  >
                    Remove Image
                  </button>
                </div>
              )}

              <p className="text-xs text-amber-800">
                Do not use expiring private signed URLs.
              </p>
            </section>
          )}

          {/* AUDIO SOURCE */}

          {requiresAudio(form.questionType) && (
            <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <FileAudio className="h-4 w-4 text-indigo-600" />
                  Audio Source
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Choose from Media Library or paste
                  a permanent HTTPS audio URL.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="audio-source"
                    checked={
                      form.audioSourceMode ===
                      "LIBRARY"
                    }
                    onChange={() =>
                      openMediaPicker("AUDIO")
                    }
                  />
                  Choose from Media Library
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 text-sm">
                  <input
                    type="radio"
                    name="audio-source"
                    checked={
                      form.audioSourceMode === "URL"
                    }
                    onChange={() =>
                      setForm((old) => ({
                        ...old,
                        audioSourceMode: "URL",
                        selectedAudioId: "",
                      }))
                    }
                  />
                  Paste Audio URL
                </label>
              </div>

              {form.audioSourceMode ===
                "LIBRARY" ? (
                <button
                  type="button"
                  onClick={() =>
                    openMediaPicker("AUDIO")
                  }
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Browse Audio Library
                </button>
              ) : (
                <label className="block space-y-1 text-sm">
                  <span>HTTPS Audio URL</span>

                  <input
                    type="url"
                    value={form.audioUrl}
                    onChange={(event) =>
                      setForm((old) => ({
                        ...old,
                        audioUrl:
                          event.target.value,
                      }))
                    }
                    placeholder="https://example.com/audio.mp3"
                    className="w-full rounded-lg border bg-white p-2.5"
                  />
                </label>
              )}

              {form.audioUrl && (
                <div className="space-y-3 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold">
                    Audio Preview
                  </p>

                  {validHttpsUrl(form.audioUrl) ? (
                    <audio
                      controls
                      preload="none"
                      src={form.audioUrl}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-xs text-red-600">
                      Enter a valid HTTPS audio URL.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      removeMedia("AUDIO")
                    }
                    className="text-xs font-semibold text-red-600"
                  >
                    Remove Audio
                  </button>
                </div>
              )}

              <p className="text-xs text-amber-800">
                Audio must remain accessible to learners.
              </p>
            </section>
          )}

          {/* EXPLANATION */}

          <label className="block space-y-1 text-sm">
            <span>Explanation (optional)</span>

            <textarea
              rows={3}
              value={form.explanation}
              onChange={(event) =>
                setForm((old) => ({
                  ...old,
                  explanation:
                    event.target.value,
                }))
              }
              className="w-full rounded-lg border p-2.5"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Question"
                  : "Add Question"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* QUESTIONS LIST */}

      <section className="space-y-4 rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">
          Questions
        </h2>

        {loading && (
          <p className="text-sm text-slate-500">
            Loading...
          </p>
        )}

        {visibleQuestions.map((question, index) => (
          <div
            key={question.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
          >
            <div>
              <p className="text-xs text-slate-500">
                #{(safePage - 1) * limit + index + 1}
                {" · "}
                {question.questionType}
              </p>

              <p className="font-medium">
                {question.questionText ||
                  "(Media-based question)"}
              </p>

              <p className="text-xs text-slate-500">
                {question.points} point(s)
              </p>

              {question.imageUrl && (
                <p className="mt-1 text-xs text-indigo-600">
                  Image attached
                </p>
              )}

              {question.audioUrl && (
                <p className="mt-1 text-xs text-indigo-600">
                  Audio attached
                </p>
              )}
            </div>

            {canWrite && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    editQuestion(question)
                  }
                  className="rounded-lg border px-3 py-1.5 text-xs"
                >
                  Edit
                </button>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() =>
                      void removeQuestion(
                        question.id,
                      )
                    }
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {!loading &&
          questions.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              No questions yet.
            </p>
          )}

        <Pagination
          pagination={{
            page: safePage,
            limit,
            total: questions.length,
            totalPages,
          }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          isLoading={loading}
        />
      </section>

      {/* SHARED MEDIA PICKER */}

      {mediaPicker && (
        <QuizMediaPicker
          type={mediaPicker}
          selectedId={
            mediaPicker === "IMAGE"
              ? form.selectedImageId
              : form.selectedAudioId
          }
          onSelect={selectMedia}
          onClose={() =>
            setMediaPicker(null)
          }
        />
      )}
    </div>
  );
}
