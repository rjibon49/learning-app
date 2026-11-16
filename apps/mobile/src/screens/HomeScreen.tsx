
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLearnerAuth } from "../lib/auth-context";
import { apiClient } from "../api/client";

import CoursesScreen from "./CoursesScreen";
import LessonReaderScreen from "./LessonReaderScreen";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
import { COLORS } from "../styles/theme";
import { styles } from "../styles/HomeScreen.styles";

type LearnerSection =
  | "home"
  | "learn"
  | "vocabulary"
  | "practice"
  | "progress"
  | "courses"
  | "lessons"
  | "flashcards"
  | "quizzes"
  | "notifications"
  | "subscription"
  | "profile"
  | "settings"
  | "help"
  | "lessonReader";

type NavOption = {
  id: LearnerSection;
  label: string;
  icon: IconName;
  description?: string;
};

type HealthResponse = {
  status: string;
  database: string;
};

const BOTTOM_TABS: NavOption[] = [
  {
    id: "home",
    label: "Home",
    icon: "home-outline",
  },
  {
    id: "learn",
    label: "Learn",
    icon: "book-outline",
  },
  {
    id: "vocabulary",
    label: "Words",
    icon: "language-outline",
  },
  {
    id: "practice",
    label: "Practice",
    icon: "school-outline",
  },
  {
    id: "progress",
    label: "Progress",
    icon: "stats-chart-outline",
  },
];

const DRAWER_LEARNING: NavOption[] = [
  {
    id: "home",
    label: "Dashboard",
    icon: "grid-outline",
  },
  {
    id: "courses",
    label: "My Courses",
    icon: "library-outline",
  },
  {
    id: "lessons",
    label: "Lessons",
    icon: "reader-outline",
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    icon: "language-outline",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: "albums-outline",
  },
  {
    id: "quizzes",
    label: "Quizzes",
    icon: "help-circle-outline",
  },
  {
    id: "practice",
    label: "Practice",
    icon: "school-outline",
  },
  {
    id: "progress",
    label: "My Progress",
    icon: "stats-chart-outline",
  },
];

const DRAWER_ACCOUNT: NavOption[] = [
  {
    id: "notifications",
    label: "Notifications",
    icon: "notifications-outline",
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: "card-outline",
  },
  {
    id: "profile",
    label: "My Profile",
    icon: "person-circle-outline",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings-outline",
  },
  {
    id: "help",
    label: "Help & Support",
    icon: "information-circle-outline",
  },
];

const SECTION_TITLES: Record<LearnerSection, string> = {
  home: "Home",
  learn: "Learn",
  vocabulary: "Vocabulary",
  practice: "Practice",
  progress: "My Progress",
  courses: "My Courses",
  lessons: "Lessons",
  flashcards: "Flashcards",
  quizzes: "Quizzes",
  notifications: "Notifications",
  subscription: "Subscription",
  profile: "My Profile",
  settings: "Settings",
  help: "Help & Support",
  lessonReader: "Lesson Reader",
};

function MenuIcon({
  name,
  size = 21,
  color = COLORS.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

function SectionCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.featureIcon}>
        <MenuIcon name={icon} color={COLORS.primary} size={23} />
      </View>

      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>
        {description}
      </Text>

      <View style={styles.featureFooter}>
        <Text style={styles.featureLink}>Explore</Text>
        <MenuIcon
          name="arrow-forward"
          size={16}
          color={COLORS.primary}
        />
      </View>
    </Pressable>
  );
}

function SectionPlaceholder({
  section,
  onBack,
}: {
  section: LearnerSection;
  onBack: () => void;
}) {
  const item = [...BOTTOM_TABS, ...DRAWER_LEARNING, ...DRAWER_ACCOUNT]
    .find((option) => option.id === section);

  return (
    <View style={styles.placeholder}>
      <View style={styles.placeholderIcon}>
        <MenuIcon
          name={item?.icon ?? "construct-outline"}
          color={COLORS.primary}
          size={32}
        />
      </View>

      <Text style={styles.placeholderTitle}>
        {SECTION_TITLES[section]}
      </Text>

      <Text style={styles.placeholderText}>
        This section is part of your learning workspace.
        The interface is ready for integration with your
        existing Learning API and CMS content.
      </Text>

      <Text style={styles.placeholderNote}>
        No sample progress or fictional course data is shown.
      </Text>

      <Pressable
        onPress={onBack}
        style={styles.primaryButton}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const { user, signOut, refreshProfile } = useLearnerAuth();

  const [section, setSection] =
    useState<LearnerSection>("home");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [health, setHealth] =
    useState<HealthResponse | null>(null);

  const [healthError, setHealthError] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [selectedLessonId, setSelectedLessonId] =
  useState<string | null>(null);

  function openLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setDrawerOpen(false);
    setSection("lessonReader");
  }

  function backToCourses() {
    setSelectedLessonId(null);
    setSection("courses");
  }

  const firstName = useMemo(() => {
    const value = user?.displayName?.trim();
    return value?.split(/\s+/)[0] || "Learner";
  }, [user?.displayName]);

  const loadHealth = useCallback(async () => {
    setCheckingHealth(true);
    setHealthError(false);

    try {
      const response = await apiClient.get<HealthResponse>(
        "/health"
      );

      setHealth(response.data);
    } catch {
      setHealth(null);
      setHealthError(true);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  useEffect(() => {
  const subscription = BackHandler.addEventListener(
    "hardwareBackPress",
    () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }

      if (section === "lessonReader") {
        setSelectedLessonId(null);
        setSection("courses");
        return true;
      }

      if (section !== "home") {
        setSection("home");
        return true;
      }

      return false;
    }
  );

  return () => subscription.remove();
}, [drawerOpen, section]);

  function navigateTo(next: LearnerSection) {
    setDrawerOpen(false);
    setSection(next);
  }

  function confirmSignOut() {
    setDrawerOpen(false);

    Alert.alert(
      "Sign Out",
      "Do you want to sign out of your learning account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            if (signingOut) return;

            setSigningOut(true);

            void signOut()
              .catch(() => {
                Alert.alert(
                  "Session Error",
                  "Unable to clear the stored session."
                );
              })
              .finally(() => {
                setSigningOut(false);
              });
          },
        },
      ]
    );
  }


  function renderHome() {
    return (
      <View style={styles.homeContent}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <MenuIcon
              name="sparkles-outline"
              size={14}
              color="#e0e7ff"
            />
            <Text style={styles.heroBadgeText}>
              YOUR LEARNING JOURNEY
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Hallo, {firstName}!
          </Text>

          <Text style={styles.heroSubtitle}>
            Welcome back to Global Learning.
            Your German language journey starts here.
          </Text>

          <Pressable
            style={styles.heroButton}
            onPress={() => navigateTo("courses")}
            accessibilityRole="button"
          >
            <Text style={styles.heroButtonText}>
              Explore Courses
            </Text>

            <MenuIcon
              name="arrow-forward"
              size={17}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.heading}>Learning Workspace</Text>
          <Text style={styles.caption}>
            Choose what you want to study.
          </Text>
        </View>

        <View style={styles.featureGrid}>
          <SectionCard
            icon="library-outline"
            title="Courses"
            description="Explore your German learning levels."
            onPress={() => navigateTo("courses")}
          />

          <SectionCard
            icon="reader-outline"
            title="Lessons"
            description="Read and practice lesson content."
            onPress={() => navigateTo("lessons")}
          />

          <SectionCard
            icon="language-outline"
            title="Vocabulary"
            description="Learn everyday German words."
            onPress={() => navigateTo("vocabulary")}
          />

          <SectionCard
            icon="albums-outline"
            title="Flashcards"
            description="Practice and review new words."
            onPress={() => navigateTo("flashcards")}
          />

          <SectionCard
            icon="help-circle-outline"
            title="Quizzes"
            description="Check what you have learned."
            onPress={() => navigateTo("quizzes")}
          />

          <SectionCard
            icon="stats-chart-outline"
            title="Progress"
            description="Review your learning activity."
            onPress={() => navigateTo("progress")}
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeading}>
            <MenuIcon
              name="server-outline"
              size={21}
              color={COLORS.primary}
            />

            <Text style={styles.infoTitle}>
              Learning Platform Status
            </Text>
          </View>

          {checkingHealth && !health ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.statusLoader}
            />
          ) : health ? (
            <View style={styles.statusRows}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>API</Text>
                <Text style={styles.statusGood}>
                  {health.status}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>
                  Database
                </Text>
                <Text style={styles.statusGood}>
                  {health.database}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.statusError}>
              {healthError
                ? "Unable to connect to the Learning API."
                : "Checking connection..."}
            </Text>
          )}

          <Pressable
            onPress={() => void loadHealth()}
            disabled={checkingHealth}
            style={styles.refreshLink}
            accessibilityRole="button"
          >
            <MenuIcon
              name="refresh-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.refreshText}>
              Refresh Status
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderProfile() {
    return (
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.profileName}>
          {user?.displayName || "Learner"}
        </Text>

        <Text style={styles.profileEmail}>
          {user?.email || ""}
        </Text>

        <View style={styles.profileDivider} />

        <Text style={styles.profileLabel}>
          Account ID
        </Text>

        <Text selectable style={styles.profileValue}>
          {user?.id || "Unavailable"}
        </Text>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            void refreshProfile().catch(() => {
              Alert.alert(
                "Unable to Refresh",
                "Please try again later."
              );
            });
          }}
          accessibilityRole="button"
        >
          <MenuIcon
            name="refresh-outline"
            size={17}
            color={COLORS.primary}
          />
          <Text style={styles.secondaryButtonText}>
            Refresh Profile
          </Text>
        </Pressable>

        <Pressable
          style={styles.logoutButton}
          onPress={confirmSignOut}
          accessibilityRole="button"
          disabled={signingOut}
        >
          <MenuIcon
            name="log-out-outline"
            size={19}
            color={COLORS.red}
          />
          <Text style={styles.logoutText}>
            {signingOut ? "Signing Out..." : "Sign Out"}
          </Text>
        </Pressable>
      </View>
    );
  }

  
function renderCurrentSection() {
  if (section === "home") {
    return renderHome();
  }

  if (section === "profile") {
    return renderProfile();
  }

  if (
    section === "courses" ||
    section === "learn" ||
    section === "lessons"
  ) {
    return (
      <CoursesScreen
        onOpenLesson={openLesson}
      />
    );
  }

  if (
    section === "lessonReader" &&
    selectedLessonId
  ) {
    return (
      <LessonReaderScreen
        lessonId={selectedLessonId}
        onBack={backToCourses}
      />
    );
  }

  return (
    <SectionPlaceholder
      section={section}
      onBack={() => navigateTo("home")}
    />
  );
}


  function renderDrawerOption(item: NavOption) {
    const active = section === item.id;

    return (
      <Pressable
        key={item.id}
        onPress={() => navigateTo(item.id)}
        style={[
          styles.drawerItem,
          active && styles.drawerItemActive,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <MenuIcon
          name={item.icon}
          size={20}
          color={
            active ? COLORS.primary : "#475569"
          }
        />

        <Text
          style={[
            styles.drawerItemText,
            active && styles.drawerItemTextActive,
          ]}
        >
          {item.label}
        </Text>

        {active && (
          <MenuIcon
            name="chevron-forward"
            size={16}
            color={COLORS.primary}
          />
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      {/* TOP HEADER */}

      <View
        style={[
          styles.topHeader,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <Pressable
          style={styles.iconButton}
          onPress={() => setDrawerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <MenuIcon name="menu-outline" size={26} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {SECTION_TITLES[section]}
          </Text>

          <Text style={styles.headerSubtitle}>
            Global Learning
          </Text>
        </View>

        <Pressable
          style={styles.headerAvatar}
          onPress={() => navigateTo("profile")}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.headerAvatarText}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      {/* MAIN CONTENT */}

      {section === "courses" ||
        section === "learn" ||
        section === "lessons" ||
        section === "lessonReader" ? (
          <View style={styles.scroll}>
            {renderCurrentSection()}
          </View>
        ) : (
          <ScrollView
            key={section}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderCurrentSection()}
          </ScrollView>
        )}

      {/* BOTTOM NAVIGATION */}

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 9) },
        ]}
      >
        {BOTTOM_TABS.map((tab) => {
          const active =
            section === tab.id ||
            ((
              section === "courses" ||
              section === "lessons" ||
              section === "lessonReader"
            ) &&
              tab.id === "learn") ||
            (section === "flashcards" &&
              tab.id === "practice") ||
            (section === "quizzes" &&
              tab.id === "practice");

          return (
            <Pressable
              key={tab.id}
              style={styles.tabButton}
              onPress={() => navigateTo(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View
                style={[
                  styles.tabIconBox,
                  active && styles.tabIconBoxActive,
                ]}
              >
                <MenuIcon
                  name={tab.icon}
                  size={22}
                  color={
                    active ? COLORS.primary : "#94a3b8"
                  }
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* DRAWER + BACKDROP */}

      {drawerOpen && (
        <View style={styles.drawerOverlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setDrawerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          />

          <View
            style={[
              styles.drawer,
              {
                paddingTop:
                  Math.max(insets.top, 12) + 10,
                paddingBottom:
                  Math.max(insets.bottom, 12),
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerLogo}>
                <Text style={styles.drawerLogoText}>
                  GL
                </Text>
              </View>

              <View style={styles.drawerHeaderText}>
                <Text style={styles.drawerBrand}>
                  Global Learning
                </Text>
                <Text style={styles.drawerSubBrand}>
                  Learner Workspace
                </Text>
              </View>

              <Pressable
                onPress={() => setDrawerOpen(false)}
                style={styles.drawerClose}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <MenuIcon
                  name="close-outline"
                  size={24}
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.drawerUser}
              onPress={() => navigateTo("profile")}
            >
              <View style={styles.drawerUserAvatar}>
                <Text style={styles.drawerUserAvatarText}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.drawerUserDetails}>
                <Text
                  numberOfLines={1}
                  style={styles.drawerUserName}
                >
                  {user?.displayName || "Learner"}
                </Text>

                <Text
                  numberOfLines={1}
                  style={styles.drawerUserEmail}
                >
                  {user?.email}
                </Text>
              </View>

              <MenuIcon
                name="chevron-forward"
                size={18}
                color={COLORS.muted}
              />
            </Pressable>

            <ScrollView
              style={styles.drawerScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerGroupLabel}>
                LEARNING
              </Text>

              {DRAWER_LEARNING.map(renderDrawerOption)}

              <View style={styles.drawerDivider} />

              <Text style={styles.drawerGroupLabel}>
                ACCOUNT & SUPPORT
              </Text>

              {DRAWER_ACCOUNT.map(renderDrawerOption)}
            </ScrollView>

            <Pressable
              style={styles.drawerLogout}
              onPress={confirmSignOut}
              accessibilityRole="button"
            >
              <MenuIcon
                name="log-out-outline"
                size={20}
                color={COLORS.red}
              />

              <Text style={styles.drawerLogoutText}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}