import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Image,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";

const PRIMARY = "rgb(73, 105, 219)";

export default function HomeScreen() {
  // 탭 상태
  const [tab, setTab] = useState<"file" | "url">("file");

  // 파일/미리보기
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [previewUri, setPreviewUri] = useState<string>("");

  // URL 입력
  const [urlValue, setUrlValue] = useState("");

  // 로딩 오버레이
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState("분석을 위한 데이터 전처리를 진행 중입니다");

  const stages = useMemo(
    () => [
      { threshold: 0, text: "분석을 위한 데이터 전처리를 진행 중입니다" },
      { threshold: 35, text: "프레임 및 음성 구간별 정밀 분석을 진행 중입니다" },
      { threshold: 70, text: "최종 분석 리포트를 생성하고 있습니다" },
    ],
    []
  );

  const canAnalyze = tab === "file" ? Boolean(selectedFileName) : Boolean(urlValue.trim());

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "video/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;

    const asset = res.assets?.[0];
    if (!asset) return;

    setSelectedFileName(asset.name ?? "선택된 파일");
    if (asset.mimeType?.startsWith("image/")) {
      setPreviewUri(asset.uri);
    } else {
      setPreviewUri(""); // 영상 미리보기는 추후 expo-av로 확장 가능
    }
  };

  const onAnalyzeClick = () => {
    if (!canAnalyze) return;
    setLoadingOpen(true);
  };

  const loadingLabel =
    tab === "file"
      ? selectedFileName || "파일을 선택해 주세요"
      : urlValue.trim() || "URL을 입력해 주세요";

  // 진행바 시뮬레이션 + 완료 시 result 이동(+ params 전달)
  useEffect(() => {
    if (!loadingOpen) return;

    setProgress(0);
    setStageText(stages[0].text);

    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(p + 5, 100);
      setProgress(p);

      for (let i = stages.length - 1; i >= 0; i--) {
        if (p >= stages[i].threshold) {
          setStageText(stages[i].text);
          break;
        }
      }

      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setLoadingOpen(false);

          // ✅ 임시 결과(나중에 API 응답으로 교체)
          const aiScore = "87";
          const trustScore = "94";

          router.push({
            pathname: "/result",
            params: {
              tab,
              fileName: selectedFileName || "",
              previewUri: previewUri || "",
              url: urlValue.trim() || "",
              aiScore,
              trustScore,
            },
          });
        }, 200);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [loadingOpen, stages, tab, selectedFileName, previewUri, urlValue]);

  return (
    <View style={styles.screen}>
      <View style={styles.box}>
        {/* LEFT -> 모바일에서는 상단 */}
        <View style={styles.left}>
          <View style={styles.title}>
            <Text style={styles.h1}>
              당신이 보고있는 영상,{"\n"}
              <Text style={styles.h1Accent}>진짜인지</Text> 확인하세요
            </Text>
            <Text style={styles.p}>
              딥러닝 기술로 영상의 위변조 여부를 분석하고,{"\n"}의심 구간과 근거를 명확하게 제시합니다.
            </Text>
          </View>
        </View>

        {/* RIGHT -> 모바일에서는 아래 */}
        <View style={styles.right}>
          {/* Tabs + Analyze */}
          <View style={styles.tabsWrap}>
            <View style={styles.tabRow}>
              <Pressable
                onPress={() => {
                  setTab("file");
                  setTimeout(() => pickFile(), 0);
                }}
                style={[styles.tabBtn, tab === "file" && styles.tabBtnActive]}
              >
                <Text style={styles.tabText}>파일 업로드</Text>
              </Pressable>

              <Pressable
                onPress={() => setTab("url")}
                style={[styles.tabBtn, tab === "url" && styles.tabBtnActive]}
              >
                <Text style={styles.tabText}>url 입력</Text>
              </Pressable>
            </View>

            <View style={styles.analyzeRow}>
              <Pressable
                onPress={onAnalyzeClick}
                style={[styles.analyzeBtn, !canAnalyze && styles.analyzeBtnDisabled]}
              >
                <Text style={styles.analyzeBtnText}>분석하기</Text>
              </Pressable>
            </View>
          </View>

          {/* Content */}
          {tab === "file" ? (
            <Pressable onPress={pickFile} style={styles.dropzone} accessibilityRole="button">
              {!previewUri ? (
                <View style={styles.dropzoneTextWrap}>
                  <Text style={styles.dropzoneTitle}>파일을 선택해 주세요</Text>
                  <Text style={styles.dropzoneSub}>이미지/영상 파일 선택 후 분석할 수 있어요.</Text>
                  <Text style={styles.fileStatus}>
                    {selectedFileName ? selectedFileName : "선택된 파일 없음"}
                  </Text>
                </View>
              ) : (
                <Image source={{ uri: previewUri }} style={styles.dzPreview} resizeMode="contain" />
              )}
            </Pressable>
          ) : (
            <View style={styles.urlPanel}>
              <View style={styles.urlHead}>
                <Text style={styles.urlTitle}>URL 붙여넣기</Text>
                <Text style={styles.urlSub}>유튜브/트위터 등 영상 링크를 입력하면 분석을 시작할 수 있어요.</Text>
              </View>

              <View style={styles.urlField}>
                <TextInput
                  value={urlValue}
                  onChangeText={setUrlValue}
                  placeholder="https://..."
                  style={styles.urlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={Platform.OS === "ios" ? "url" : "default"}
                />
                {!!urlValue && (
                  <Pressable
                    onPress={() => setUrlValue("")}
                    style={styles.urlClear}
                    accessibilityLabel="clear"
                  >
                    <Text style={styles.urlClearText}>×</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.urlHint}>예: https://www.youtube.com/watch?v=...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Loading Overlay */}
      <Modal visible={loadingOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingLabel}>분석 중</Text>

            <View style={styles.loadingStatusRow}>
              <View style={styles.spinner} />
              <Text style={styles.loadingFileName}>{loadingLabel}</Text>
            </View>

            <View style={[styles.previewWrapper, !!previewUri && styles.previewWrapperHasImage]}>
              {!!previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.loadingPreview} resizeMode="contain" />
              ) : (
                <Text style={styles.previewPlaceholder}>미리보기 없음</Text>
              )}
            </View>

            <Text style={styles.loadingMention}>{stageText}</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 140,
    paddingHorizontal: 16,
  },

  box: {
    flexDirection: "column",
    gap: 18,
    alignItems: "stretch",
    paddingTop: 20,
  },

  left: {},
  right: {},

  title: {},
  h1: { fontSize: 38, lineHeight: 44, fontWeight: "900", color: "#111" },
  h1Accent: { color: PRIMARY, fontWeight: "900" },
  p: { lineHeight: 22, marginTop: 20, paddingLeft: 5, fontSize: 15, color: "#555" },

  tabsWrap: { gap: 10, marginBottom: 14 },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 5, backgroundColor: "#ccc", alignItems: "center" },
  tabBtnActive: { backgroundColor: PRIMARY },
  tabText: { color: "#fff", fontWeight: "800" },

  analyzeRow: { flexDirection: "row", justifyContent: "flex-end" },
  analyzeBtn: {
    width: 160,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: PRIMARY,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: PRIMARY, fontWeight: "900", fontSize: 16 },

  dropzone: {
    width: "100%",
    height: 240,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cfcfcf",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dropzoneTextWrap: { alignItems: "center", gap: 8 },
  dropzoneTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  dropzoneSub: { fontSize: 13, color: "#777" },
  fileStatus: { marginTop: 8, fontSize: 13, color: "#555" },
  dzPreview: { width: "80%", height: "80%", borderRadius: 14, backgroundColor: "#fff" },

  urlPanel: {
    width: "100%",
    height: 240,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cfcfcf",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 18,
    flexDirection: "column",
    justifyContent: "center",
    gap: 14,
  },
  urlHead: { alignItems: "center", gap: 8 },
  urlTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  urlSub: { fontSize: 13, color: "#777", lineHeight: 18, textAlign: "center" },
  urlField: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderColor: "#dcdcdc",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  urlInput: { flex: 1, height: "100%", fontSize: 14, backgroundColor: "transparent" },
  urlClear: { width: 30, height: 30, borderRadius: 999, backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  urlClearText: { fontSize: 18, color: "#666", lineHeight: 18 },
  urlHint: { textAlign: "center", fontSize: 12, color: "#9a9a9a" },

  overlay: { flex: 1, backgroundColor: "rgba(8, 10, 30, 0.7)", justifyContent: "center", alignItems: "center", padding: 16 },
  loadingBox: { width: 420, maxWidth: "100%", borderRadius: 28, backgroundColor: "#fff", padding: 32, gap: 18, borderWidth: 1, borderColor: "#e2e7ff" },
  loadingLabel: { fontSize: 20, fontWeight: "700", color: "#11142d" },
  loadingStatusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  spinner: { width: 28, height: 28, borderRadius: 999, borderWidth: 3, borderColor: "rgba(73, 105, 219, 0.25)", borderTopColor: PRIMARY },
  loadingFileName: { fontWeight: "600", color: "#4a4f6c" },
  previewWrapper: { borderWidth: 1, borderStyle: "dashed", borderColor: "#dbe1ff", borderRadius: 18, padding: 24, minHeight: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f9ff" },
  previewWrapperHasImage: { backgroundColor: "#fff" },
  loadingPreview: { width: "100%", height: 220, borderRadius: 12 },
  previewPlaceholder: { fontSize: 18, color: "#9aa0c8" },
  loadingMention: { color: "#5d6389" },
  progressTrack: { width: "100%", height: 10, borderRadius: 999, backgroundColor: "#eef1ff", overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 999, backgroundColor: PRIMARY },
  progressValue: { textAlign: "right", fontSize: 14, fontWeight: "700", color: "#34406c" },
});
