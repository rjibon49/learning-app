
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from "react-native";

import {
  parseSpeechLink,
  speakGerman,
  stopGermanSpeech,
} from "../lib/german-speech";

import { Alert } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import GermanSpeakButton from "../components/GermanSpeakButton";
import { cleanMarkdownForSpeech } from "../lib/german-speech";

import { COLORS } from "../styles/theme";
import { styles, markdownStyles } from "../styles/LessonReader.styles";

import {
  fetchLesson,
  type LessonDetail,
} from "../api/courses";

import { getApiError } from "../api/client";

type ContentLanguage = "de" | "en" | "bn";

type Props = {
  lessonId: string;
  onBack: () => void;
};

const LANGUAGES: {
  code: ContentLanguage;
  label: string;
}[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
];

export default function LessonReaderScreen({
  lessonId,
  onBack,
}: Props) {
  const [lesson, setLesson] =
    useState<LessonDetail | null>(null);

  const [language, setLanguage] =
    useState<ContentLanguage>("en");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  function changeLanguage(nextLanguage: ContentLanguage) {
  // Stop the current German pronunciation.
  void stopGermanSpeech();

  // Change the explanation language.
  setLanguage(nextLanguage);
}

  const loadLesson = useCallback(async () => {
    try {
      setError("");

      const result = await fetchLesson(lessonId);
      setLesson(result);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lessonId]);

  useEffect(() => {
    return () => {
        void stopGermanSpeech();
    };
    }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLesson(null);
    setError("");

    void fetchLesson(lessonId)
      .then((result) => {
        if (active) setLesson(result);
      })
      .catch((err: unknown) => {
        if (active) setError(getApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lessonId]);

  const translation = useMemo(
    () =>
      lesson?.translations.find(
        (item) =>
          item.language.code.toLowerCase() === language
      ),
    [lesson, language]
  );

  const availableLanguages = useMemo(
    () =>
      new Set(
        lesson?.translations
          .filter((item) => item.content?.trim())
          .map((item) =>
            item.language.code.toLowerCase()
          ) ?? []
      ),
    [lesson]
  );

  async function openResource(url: string | null) {
    if (!url) return;

    try {
      const parsed = new URL(url);

      if (
        parsed.protocol !== "https:" &&
        parsed.protocol !== "http:"
      ) {
        return;
      }

      await Linking.openURL(url);
    } catch {
      // Unavailable or invalid resource URLs are ignored.
    }
  }


async function handleMarkdownLink(url: string) {
  const germanText = parseSpeechLink(url);

  if (germanText !== null) {
    try {
      await speakGerman(germanText);
    } catch {
      // A device may not have a German TTS voice installed.
      Alert.alert(
        "Pronunciation Unavailable",
        "Please check your device's text-to-speech settings."
      );
    }
    return;
  }

  // Only allow ordinary HTTPS links to open externally.
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "https:") {
      await Linking.openURL(url);
    }
  } catch {
    // Ignore invalid or unsupported URLs.
  }
}


  const title =
    translation?.title?.trim() ||
    lesson?.title ||
    "Lesson";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadLesson();
          }}
        />
      }
    >
      <Pressable
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
      >
        <Ionicons
          name="arrow-back"
          size={20}
          color={COLORS.primary}
        />

        <Text style={styles.backText}>
          Back to Courses
        </Text>
      </Pressable>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading lesson...
          </Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              void loadLesson();
            }}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      )}

      {!loading && lesson && (
        <>
          <View style={styles.hero}>
            <View style={styles.heroLabel}>
              <Ionicons
                name="book-outline"
                size={15}
                color="#c7d2fe"
              />

              <Text style={styles.heroEyebrow}>
                GERMAN LEARNING
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              {title}
            </Text>
            <GermanSpeakButton
                text={title}
                label="Listen"
            />

            <View style={styles.durationRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color="#e0e7ff"
              />

              <Text style={styles.durationText}>
                {lesson.estimatedMinutes
                  ? `${lesson.estimatedMinutes} minutes`
                  : "Self-paced lesson"}
              </Text>
            </View>
          </View>

          <View style={styles.languageCard}>
            <Text style={styles.languageHeading}>
              Explanation Language
            </Text>

            <Text style={styles.languageHint}>
              German examples remain in German.
              Change the explanation language below.
            </Text>

            <View style={styles.languageRow}>
              {LANGUAGES.map((item) => {
                const selected =
                  language === item.code;

                const available =
                  availableLanguages.has(item.code);

                return (
                  <Pressable
                    key={item.code}
                    style={[
                        styles.languageButton,
                        selected && styles.languageButtonActive,
                        !available && styles.languageButtonDisabled,
                    ]}
                    onPress={() => changeLanguage(item.code)}
                    disabled={!available}
                    accessibilityRole="button"
                    accessibilityState={{
                        selected,
                        disabled: !available,
                    }}
                    >
                    <Text
                      style={[
                        styles.languageButtonText,
                        selected &&
                          styles.languageButtonTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.readerCard}>
            {translation?.content?.trim() ? (
              <>
              {language === "de" && (
                <GermanSpeakButton
                    text={cleanMarkdownForSpeech(
                    translation.content
                    ).slice(0, 450)}
                    label="Listen Slowly"
                />
                )}
                <Markdown
                    style={markdownStyles}
                    onLinkPress={(url) => {
                        void handleMarkdownLink(url);
                        return false;
                    }}
                    >
                    {translation.content}
                </Markdown>
              </>
            ) : (
              <View style={styles.unavailable}>
                <Ionicons
                  name="document-text-outline"
                  color={COLORS.muted}
                  size={32}
                />

                <Text style={styles.unavailableTitle}>
                  Translation not available
                </Text>

                <Text style={styles.unavailableText}>
                  This lesson does not have published
                  content in the selected explanation
                  language yet. Try another language.
                </Text>
              </View>
            )}
          </View>

          {lesson.resources.length > 0 && (
            <View style={styles.resourcesCard}>
              <Text style={styles.resourcesTitle}>
                Lesson Resources
              </Text>

              {lesson.resources.map((resource) => (
                <Pressable
                  key={resource.id}
                  style={styles.resourceRow}
                  disabled={!resource.asset?.publicUrl}
                  onPress={() =>
                    void openResource(
                      resource.asset?.publicUrl ?? null
                    )
                  }
                >
                  <Ionicons
                    name="document-attach-outline"
                    size={20}
                    color={COLORS.primary}
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.resourceName}>
                      {resource.title}
                    </Text>

                    <Text style={styles.resourceType}>
                      {resource.type}
                    </Text>
                  </View>

                  <Ionicons
                    name="open-outline"
                    size={18}
                    color={COLORS.muted}
                  />
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.finishButton}
            onPress={onBack}
          >
            <Text style={styles.finishButtonText}>
              Back to Course Lessons
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#fff"
            />
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}