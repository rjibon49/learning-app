
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  fetchCourse,
  fetchCourses,
  type CourseDetail,
  type CourseSummary,
} from "../api/courses";

import { getApiError } from "../api/client";

type Props = {
  onOpenLesson: (lessonId: string) => void;
};

const C = {
  primary: "#4f46e5",
  pale: "#eef2ff",
  background: "#f8fafc",
  white: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  error: "#b91c1c",
};

export default function CoursesScreen({
  onOpenLesson,
}: Props) {
  const [courses, setCourses] =
    useState<CourseSummary[]>([]);

  const [selected, setSelected] =
    useState<CourseDetail | null>(null);

  const [expandedModule, setExpandedModule] =
    useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetail, setLoadingDetail] =
    useState(false);

  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadCourses = useCallback(
    async (
      nextPage: number,
      append = false,
      search = ""
    ) => {
      if (append && loadingDetail) return;

      try {
        setError("");

        const result = await fetchCourses(
          nextPage,
          search
        );

        setCourses((previous) =>
          append
            ? [
                ...previous.filter(
                  (item) =>
                    !result.data.some(
                      (next) => next.id === item.id
                    )
                ),
                ...result.data,
              ]
            : result.data
        );

        setPage(nextPage);
        setHasMore(
          nextPage < result.pagination.totalPages
        );
      } catch (err) {
        setError(getApiError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadingDetail]
  );

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const result = await fetchCourses(1);

        if (!active) return;

        setCourses(result.data);
        setPage(1);
        setHasMore(
          result.pagination.totalPages > 1
        );
      } catch (err) {
        if (active) setError(getApiError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialLoad();

    return () => {
      active = false;
    };
  }, []);

  async function openCourse(courseId: string) {
    if (loadingDetail) return;

    setLoadingDetail(true);
    setError("");

    try {
      const result = await fetchCourse(courseId);

      setSelected(result);

      setExpandedModule(
        result.modules.find(
          (module) => module.lessons.length > 0
        )?.id ?? result.modules[0]?.id ?? null
      );
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  async function refresh() {
    if (refreshing) return;

    setRefreshing(true);

    if (selected) {
      try {
        const result = await fetchCourse(selected.id);
        setSelected(result);
        setError("");
      } catch (err) {
        setError(getApiError(err));
      } finally {
        setRefreshing(false);
      }

      return;
    }

    await loadCourses(1, false, query);
  }

  async function searchCourses() {
    setLoading(true);
    setSelected(null);

    await loadCourses(1, false, query);
  }

  function renderCourseList() {
    return (
      <>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            GERMAN LANGUAGE
          </Text>

          <Text style={styles.heroTitle}>
            Explore Courses
          </Text>

          <Text style={styles.heroText}>
            Learn German step by step with
            structured courses and lessons.
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() =>
              void searchCourses()
            }
            placeholder="Search German courses"
            returnKeyType="search"
            placeholderTextColor="#94a3b8"
          />

          <Pressable
            style={styles.searchButton}
            onPress={() => void searchCourses()}
          >
            <Ionicons
              name="search"
              color="#fff"
              size={20}
            />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Available Courses
        </Text>

        {loading && (
          <ActivityIndicator
            size="large"
            color={C.primary}
          />
        )}

        {!loading &&
          courses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.courseCard}
              onPress={() =>
                void openCourse(course.id)
              }
            >
              <View style={styles.courseTop}>
                <View style={styles.courseIcon}>
                  <Ionicons
                    name="school-outline"
                    size={26}
                    color={C.primary}
                  />
                </View>

                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>
                    {course.level?.code ?? "German"}
                  </Text>
                </View>
              </View>

              <Text style={styles.courseTitle}>
                {course.title}
              </Text>

              <Text
                style={styles.courseDescription}
                numberOfLines={3}
              >
                {course.description ||
                  "Start your German learning journey."}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.courseLanguage}>
                  {course.language.name}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.openText}>
                    View Modules
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={C.primary}
                  />
                </View>
              </View>
            </Pressable>
          ))}

        {!loading &&
          courses.length === 0 &&
          !error && (
            <Text style={styles.emptyText}>
              No published German courses found.
              Check the course status in Admin CMS.
            </Text>
          )}

        {loadingDetail && (
          <ActivityIndicator
            color={C.primary}
            style={{ marginVertical: 12 }}
          />
        )}

        {hasMore && !loadingDetail && (
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              void loadCourses(page + 1, true, query)
            }
          >
            <Text style={styles.secondaryText}>
              Load More Courses
            </Text>
          </Pressable>
        )}
      </>
    );
  }

  function renderModules() {
    if (!selected) return null;

    const totalLessons = selected.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );

    return (
      <>
        <Pressable
          style={styles.backRow}
          onPress={() => {
            setSelected(null);
            setExpandedModule(null);
            setError("");
          }}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={C.primary}
          />

          <Text style={styles.backText}>
            All Courses
          </Text>
        </Pressable>

        <View style={styles.detailHero}>
          <Text style={styles.eyebrow}>
            {selected.level?.code ?? "GERMAN COURSE"}
          </Text>

          <Text style={styles.detailTitle}>
            {selected.title}
          </Text>

          {!!selected.description && (
            <Text style={styles.detailDescription}>
              {selected.description}
            </Text>
          )}

          <View style={styles.statsRow}>
            <Ionicons
              name="layers-outline"
              size={17}
              color="#c7d2fe"
            />

            <Text style={styles.statsText}>
              {selected.modules.length} Modules
            </Text>

            <Ionicons
              name="book-outline"
              size={17}
              color="#c7d2fe"
            />

            <Text style={styles.statsText}>
              {totalLessons} Lessons
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Course Modules
        </Text>

        {selected.modules.length === 0 && (
          <Text style={styles.emptyText}>
            No published modules are available.
          </Text>
        )}

        {selected.modules.map((module, index) => {
          const expanded =
            expandedModule === module.id;

          return (
            <View
              key={module.id}
              style={styles.moduleCard}
            >
              <Pressable
                style={styles.moduleHeader}
                onPress={() =>
                  setExpandedModule(
                    expanded ? null : module.id
                  )
                }
              >
                <View style={styles.moduleNumber}>
                  <Text style={styles.moduleNumberText}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>
                    {module.title}
                  </Text>

                  <Text style={styles.moduleMeta}>
                    {module.lessons.length} lessons
                  </Text>
                </View>

                <Ionicons
                  name={
                    expanded
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={20}
                  color={C.muted}
                />
              </Pressable>

              {expanded && (
                <View style={styles.lessonContainer}>
                  {!!module.description && (
                    <Text style={styles.moduleDescription}>
                      {module.description}
                    </Text>
                  )}

                  {module.lessons.length === 0 && (
                    <Text style={styles.emptyText}>
                      Lessons are not published yet.
                    </Text>
                  )}

                  {module.lessons.map(
                    (lesson, lessonIndex) => (
                      <Pressable
                        key={lesson.id}
                        style={styles.lessonRow}
                        onPress={() =>
                          onOpenLesson(lesson.id)
                        }
                      >
                        <View style={styles.lessonNumber}>
                          <Text style={styles.lessonNumberText}>
                            {lessonIndex + 1}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.lessonTitle}>
                            {lesson.title}
                          </Text>

                          <Text style={styles.lessonMeta}>
                            {lesson.estimatedMinutes
                              ? `${lesson.estimatedMinutes} min`
                              : "Self-paced"}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={19}
                          color={C.primary}
                        />
                      </Pressable>
                    )
                  )}
                </View>
              )}
            </View>
          );
        })}
      </>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
      }
    >
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={() => void refresh()}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {selected
        ? renderModules()
        : renderCourseList()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 2,
    paddingBottom: 32,
    gap: 16,
  },
  hero: {
    backgroundColor: C.primary,
    borderRadius: 22,
    padding: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#c7d2fe",
  },
  heroTitle: {
    fontSize: 27,
    color: "#fff",
    fontWeight: "900",
    marginTop: 10,
  },
  heroText: {
    fontSize: 13,
    color: "#e0e7ff",
    lineHeight: 21,
    marginTop: 9,
  },
  searchRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    height: 49,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 14,
  },
  searchButton: {
    width: 49,
    height: 49,
    borderRadius: 12,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 6,
  },
  courseCard: {
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 2,
  },
  courseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  courseIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.pale,
  },
  levelBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  levelText: {
    color: "#047857",
    fontWeight: "800",
    fontSize: 12,
  },
  courseTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  courseDescription: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  courseLanguage: {
    fontSize: 12,
    color: C.muted,
  },
  openText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.primary,
  },
  emptyText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    paddingVertical: 14,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 8,
  },
  backText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  detailHero: {
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 22,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 10,
  },
  detailDescription: {
    color: "#e0e7ff",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
  },
  statsText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginRight: 10,
  },
  moduleCard: {
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  moduleHeader: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moduleNumber: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.pale,
    justifyContent: "center",
    alignItems: "center",
  },
  moduleNumberText: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  moduleMeta: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  lessonContainer: {
    borderTopWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  moduleDescription: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    paddingVertical: 13,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 15,
  },
  lessonNumber: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: C.pale,
    justifyContent: "center",
    alignItems: "center",
  },
  lessonNumberText: {
    color: C.primary,
    fontWeight: "800",
  },
  lessonTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    lineHeight: 19,
  },
  lessonMeta: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  errorBox: {
    padding: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
  },
  errorText: {
    color: C.error,
    fontSize: 13,
  },
  retryText: {
    color: C.primary,
    fontWeight: "800",
    marginTop: 9,
  },
  secondaryButton: {
    padding: 13,
    backgroundColor: C.pale,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
