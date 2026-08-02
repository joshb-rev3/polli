import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { Content } from "./Content";
import { NavBar } from "./NavBar";
import { SiteHead } from "./SiteHead";

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "hr" }
  | { type: "note"; text: string };

function stripMd(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .trim();
}

function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === "---") {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const noteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        noteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "note", text: stripMd(noteLines.join(" ")) });
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: stripMd(trimmed.slice(2)) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: stripMd(trimmed.slice(3)) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h2", text: stripMd(trimmed.slice(4)) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        blocks.push({ type: "li", text: stripMd(lines[i].trim().slice(2)) });
        i += 1;
      }
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith(">") &&
      lines[i].trim() !== "---"
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    if (para.length) blocks.push({ type: "p", text: stripMd(para.join(" ")) });
  }

  return blocks;
}

interface Props {
  title: string;
  path: string;
  markdown: string;
}

export function LegalDocument({ title, path, markdown }: Props) {
  const router = useRouter();
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <View style={styles.screen}>
      <SiteHead title={title} path={path} />
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Content pad={20} padBottom={48} padTop={12}>
          {blocks.map((block, idx) => {
            if (block.type === "h1") {
              return (
                <Text key={idx} style={styles.h1}>
                  {block.text}
                </Text>
              );
            }
            if (block.type === "h2") {
              return (
                <Text key={idx} style={styles.h2}>
                  {block.text}
                </Text>
              );
            }
            if (block.type === "note") {
              return (
                <View key={idx} style={styles.note}>
                  <Text style={styles.noteText}>{block.text}</Text>
                </View>
              );
            }
            if (block.type === "hr") {
              return <View key={idx} style={styles.hr} />;
            }
            if (block.type === "li") {
              return (
                <Text key={idx} style={styles.li}>
                  •  {block.text}
                </Text>
              );
            }
            return (
              <Text key={idx} style={styles.p}>
                {block.text}
              </Text>
            );
          })}
        </Content>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    flexGrow: 1,
  },
  h1: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.green,
    marginBottom: 12,
    marginTop: 8,
  },
  h2: {
    fontFamily: fonts.serifSemi,
    fontSize: 20,
    lineHeight: 26,
    color: colors.green,
    marginTop: 28,
    marginBottom: 10,
  },
  p: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: 12,
  },
  li: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: 6,
    paddingLeft: 4,
  },
  hr: {
    height: 1,
    backgroundColor: colors.line2,
    marginVertical: 18,
  },
  note: {
    backgroundColor: "rgba(242,85,61,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(242,85,61,0.18)",
    padding: 14,
    marginBottom: 18,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink2,
  },
});
