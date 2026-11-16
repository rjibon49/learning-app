
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getDeck,
  getDeckItemsPage,
  addDeckItems,
  removeDeckItem,
  type FlashcardDeck,
  type FlashcardDeckItem,
} from "@/lib/api/flashcards";

import {
  listGlobalVocabulary,
  type GlobalVocabularyItem,
} from "@/lib/api/global-vocabulary";

import type { PaginationMeta } from "@/lib/api/quizzes";

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export default function DeckItemsPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;
  const { admin } = useAuth();
  const { selectedApp } = useAppLevel();

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [items, setItems] = useState<FlashcardDeckItem[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [words, setWords] = useState<GlobalVocabularyItem[]>([]);
  const [wordPagination, setWordPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [wordPage, setWordPage] = useState(1);
  const [wordSearch, setWordSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = Boolean(admin) && deck?.isPublished === false;

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [deckData, result] = await Promise.all([
        getDeck(deckId),
        getDeckItemsPage(deckId, page, limit),
      ]);
      setDeck(deckData);
      setItems(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load deck",
      );
    } finally {
      setLoading(false);
    }
  }, [deckId, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadVocabulary = useCallback(async () => {
    if (!selectedApp || !pickerOpen) return;

    try {
      const result = await listGlobalVocabulary({
        languageId: selectedApp.languageId,
        search: wordSearch.trim() || undefined,
        page: wordPage,
        limit: 20,
      });

      setWords(result.data);
      setWordPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Vocabulary search failed",
      );
    }
  }, [selectedApp, pickerOpen, wordSearch, wordPage]);

  useEffect(() => {
    void loadVocabulary();
  }, [loadVocabulary]);

  async function addWords() {
    if (!canEdit || selectedIds.length === 0) return;

    setSaving(true);
    setError("");

    try {
      await addDeckItems(deckId, selectedIds);
      setSelectedIds([]);
      setPickerOpen(false);
      setMessage("Vocabulary added to deck.");
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to add vocabulary",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeWord(itemId: string) {
    if (!canEdit || !window.confirm("Remove this word from the deck?")) {
      return;
    }

    try {
      await removeDeckItem(deckId, itemId);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove word",
      );
    }
  }

  function toggleId(id: string) {
    setSelectedIds((old) =>
      old.includes(id)
        ? old.filter((item) => item !== id)
        : [...old, id],
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/flashcards"
        className="text-sm font-semibold text-indigo-600"
      >
        ← Back to Flashcard Decks
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {deck?.title ?? "Flashcard Deck"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {deck?.isPublished ? "Published" : "Draft"} · Vocabulary cards
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
          >
            + Add Vocabulary
          </button>
        )}
      </header>

      {deck?.isPublished && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          This deck is published. Unpublish it before adding or removing cards.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <section className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const vocab = item.vocabulary;
            const grammar = vocab.grammar ?? {};
            const article = typeof grammar.article === "string"
              ? grammar.article : "";

            return (
              <div key={item.id}
                className="space-y-2 rounded-xl border p-4">
                <p className="text-lg font-semibold">
                  {article} {vocab.term}
                </p>

                <p className="text-xs text-slate-500">
                  {vocab.pronunciation ?? vocab.partOfSpeech ?? ""}
                </p>

                <div className="space-y-1">
                  {vocab.translations?.slice(0, 3).map((translation) => (
                    <p key={translation.id} className="text-sm">
                      <span className="font-semibold">
                        {translation.language?.code?.toUpperCase() ?? "Translation"}:
                      </span>{" "}
                      {translation.meaning}
                    </p>
                  ))}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void removeWord(item.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!loading && items.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            This deck has no vocabulary cards yet.
          </p>
        )}

        <div className="mt-4">
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

      {pickerOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white">
            <header className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-bold">
                Select Vocabulary
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close vocabulary picker"
                className="rounded-lg border px-3 py-1.5"
              >
                Close
              </button>
            </header>

            <div className="border-b p-4">
              <input
                value={wordSearch}
                onChange={(event) => {
                  setWordPage(1);
                  setWordSearch(event.target.value);
                }}
                placeholder="Search terms..."
                className="w-full rounded-lg border p-2.5 text-sm"
              />
            </div>

            <div className="min-h-40 flex-1 space-y-2 overflow-y-auto p-4">
              {words.map((word) => {
                const selected = selectedIds.includes(word.id);

                return (
                  <label key={word.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleId(word.id)}
                    />

                    <div>
                      <p className="font-medium">{word.term}</p>
                      <p className="text-xs text-slate-500">
                        {word.translations?.[0]?.meaning ?? "No translation"}
                        {" · "}
                        {word.status}
                      </p>
                    </div>
                  </label>
                );
              })}

              {words.length === 0 && (
                <p className="p-5 text-center text-sm text-slate-500">
                  No matching vocabulary found.
                </p>
              )}
            </div>

            <div className="border-t p-4">
              <Pagination
                pagination={wordPagination}
                onPageChange={setWordPage}
                onPageSizeChange={() => setWordPage(1)}
              />
            </div>

            <footer className="flex items-center justify-between gap-2 border-t p-4">
              <span className="text-xs text-slate-500">
                {selectedIds.length} selected
              </span>

              <button
                type="button"
                onClick={() => void addWords()}
                disabled={saving || selectedIds.length === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Selected"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
