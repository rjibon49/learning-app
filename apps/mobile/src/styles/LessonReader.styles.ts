import { StyleSheet } from "react-native";
import { COLORS } from "./theme";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 3,
    paddingBottom: 30,
    gap: 15,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 10,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  centered: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 14,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 13,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 21,
    padding: 22,
  },
  heroLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroEyebrow: {
    color: "#c7d2fe",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 33,
    marginTop: 14,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 15,
  },
  durationText: {
    color: "#e0e7ff",
    fontSize: 12,
    fontWeight: "600",
  },
  languageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  languageHeading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  languageHint: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  languageRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 14,
  },
  languageButton: {
    flex: 1,
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  languageButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageButtonDisabled: {
    opacity: 0.55,
  },
  languageButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  languageButtonTextActive: {
    color: "#fff",
  },
  readerCard: {
    backgroundColor: "#fff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
  },
  unavailable: {
    alignItems: "center",
    paddingVertical: 30,
  },
  unavailableTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 13,
  },
  unavailableText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
  },
  resourcesCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resourcesTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  resourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resourceName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  resourceType: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  finishButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  finishButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});

export const markdownStyles = StyleSheet.create({
  body: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 26,
  },
  heading1: {
    color: COLORS.text,
    fontSize: 23,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 15,
    marginBottom: 14,
  },
  heading2: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 27,
    marginTop: 23,
    marginBottom: 12,
  },
  heading3: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 17,
    marginBottom: 10,
  },
  paragraph: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 25,
    marginBottom: 13,
  },
  strong: {
    color: COLORS.text,
    fontWeight: "800",
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  blockquote: {
    backgroundColor: COLORS.pale,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    marginVertical: 12,
  },
  code_inline: {
    backgroundColor: "#f1f5f9",
    color: "#4338ca",
    borderRadius: 4,
  },
  fence: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 14,
  },
  th: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.pale,
    padding: 7,
  },
  td: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 7,
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  hr: {
    backgroundColor: COLORS.border,
    height: 1,
    marginVertical: 18,
  },
});
