
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { speakGerman } from "../lib/german-speech";

type Props = {
  text: string;
  label?: string;
};

export default function GermanSpeakButton({
  text,
  label,
}: Props) {
  const [playing, setPlaying] = useState(false);

  async function play() {
    if (playing) return;

    setPlaying(true);

    try {
      await speakGerman(text);
    } catch {
      Alert.alert(
        "Audio Unavailable",
        "German text-to-speech is not available on this device."
      );
    } finally {
      setPlaying(false);
    }
  }

  return (
    <Pressable
      onPress={() => void play()}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={`Listen to ${text}`}
    >
      <Ionicons
        name="volume-high-outline"
        size={19}
        color="#4f46e5"
      />
      {!!label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    color: "#4f46e5",
    marginLeft: 6,
    fontWeight: "700",
  },
});
