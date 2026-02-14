import React, { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";

const PRIMARY = "rgb(73, 105, 219)";

function scoreLabel(aiScore: number) {
    if (aiScore >= 80) return "매우 높음";
    if (aiScore >= 60) return "높음";
    if (aiScore >= 40) return "중간";
    return "낮음";
}

function levelBadge(aiScore: number) {
    if (aiScore >= 70) return { text: "주의 필요", bg: "#ffe5e5", fg: "#d93025" };
    if (aiScore >= 50) return { text: "관찰 필요", bg: "#fff4cc", fg: "#b26a00" };
    return { text: "양호", bg: "#e6fff1", fg: "#1f7a4a" };
}

export default function ResultScreen() {
    const params = useLocalSearchParams<{
        tab?: string;
        fileName?: string;
        previewUri?: string;
        url?: string;
        aiScore?: string;
        trustScore?: string;
    }>();

    const aiScore = Number(params.aiScore) || 0;
    const trustScore = Number(params.trustScore) || 0;

    const label = useMemo(() => scoreLabel(aiScore), [aiScore]);
    const warn = useMemo(() => levelBadge(aiScore), [aiScore]);

    const previewUri = params.previewUri ?? "";
    const fileName = params.fileName ?? "";
    const url = params.url ?? "";

    const onDownloadPdf = async () => {
        const pdfUrl = "https://example.com/report.pdf";
        await WebBrowser.openBrowserAsync(pdfUrl);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {/* 상단 헤더 */}
            <View style={styles.top}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.rtTitle}>분석 결과 리포트</Text>
                    <Text style={styles.rtSub}>업로드한 영상의 위변조/AI 생성 의심 구간을 종합 분석했습니다.</Text>
                </View>

                <Pressable onPress={() => router.replace("/")} style={styles.ghostPill}>
                    <Text style={styles.ghostPillText}>메인으로</Text>
                </Pressable>
            </View>

            {/* 요약 */}
            <View style={{ gap: 16 }}>
                <View style={[styles.card, styles.videoCard]}>
                    <View style={styles.cardHead}>
                        <Text style={styles.h3}>의심스러운 인물 영상</Text>
                        <View style={[styles.badge, { backgroundColor: warn.bg }]}>
                            <Text style={[styles.badgeText, { color: warn.fg }]}>{warn.text}</Text>
                        </View>
                    </View>

                    <View style={styles.videoPreview}>
                        {previewUri ? (
                            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
                        ) : (
                            <View style={styles.vpDummy}>
                                <Text style={styles.vpDummyText}>{url ? "URL 분석 결과" : "미리보기 없음"}</Text>
                                {!!fileName && <Text style={styles.vpSubText}>{fileName}</Text>}
                                {!!url && <Text style={styles.vpSubText}>{url}</Text>}
                            </View>
                        )}
                    </View>

                    <View style={styles.scoreRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.scoreLabel}>AI 생성 가능성</Text>
                            <View style={styles.scoreBar}>
                                <View style={[styles.scoreFill, { width: `${aiScore}%` }]} />
                            </View>
                            <Text style={styles.scoreDesc}>AI 생성/조작 가능성이 높게 감지되었습니다.</Text>
                        </View>

                        <View style={styles.scoreNum}>
                            <Text style={styles.big}>{aiScore}%</Text>
                            <Text style={styles.small}>{label}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ gap: 16 }}>
                    <View style={styles.card}>
                        <Text style={styles.miniTitle}>분석 신뢰도</Text>
                        <View style={styles.trust}>
                            <Text style={styles.trustNum}>{trustScore}%</Text>
                            <Text style={styles.trustSub}>이 분석 결과의 신뢰도</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.miniTitle}>분석 정보</Text>
                        <View style={styles.infoList}>
                            <InfoRow label="분석 시간" value="14.2초" />
                            <InfoRow label="영상 길이" value="2분 34초" />
                            <InfoRow label="해상도" value="1920×1080" />
                            <InfoRow label="프레임 레이트" value="30fps" />
                            <InfoRow label="파일 크기" value="245MB" />
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.miniTitle}>사용된 모델</Text>
                        <View style={styles.chips}>
                            <Chip text="Vision Transformer" />
                            <Chip text="ResNet-50" />
                            <Chip text="XceptionNet" />
                        </View>
                    </View>
                </View>
            </View>

            {/* 타임라인 */}
            <View style={[styles.card, styles.sectionCard]}>
                <Text style={styles.sectionTitle}>프레임별 위조 의심도 타임라인</Text>

                <View style={styles.timeline}>
                    <View style={[styles.timelineBar, styles.barRed, { width: "22%" }]} />
                    <View style={[styles.timelineBar, styles.barBlue, { width: "18%" }]} />
                    <View style={[styles.timelineBar, styles.barRed, { width: "30%" }]} />
                    <View style={[styles.timelineBar, styles.barBlue, { width: "15%" }]} />
                    <View style={[styles.timelineBar, styles.barRed, { width: "15%" }]} />
                </View>

                <Text style={styles.hint}>빨강: 높음(70%+) · 노랑: 중간(50~69%) · 파랑: 낮음(50% 미만)</Text>
            </View>

            {/* 상세 분석 */}
            <View style={[styles.card, styles.sectionCard]}>
                <Text style={styles.sectionTitle}>상세 분석 결과</Text>

                <DetailItem title="눈 깜빡임 패턴" risk="높음" riskLevel="high" desc="0.8~1.2초 구간에서 비정상적으로 높은 깜빡임 빈도 감지" percent={92} />
                <DetailItem title="입 모양·음성 동기화" risk="높음" riskLevel="high" desc="음성과 입 모양 간 평균 0.18초 지연 발생" percent={87} />
                <DetailItem title="얼굴 경계 왜곡" risk="중간" riskLevel="mid" desc="헤어라인/윤곽부 픽셀 불연속성 다수 발견" percent={74} />
                <DetailItem title="조명 일관성" risk="중간" riskLevel="mid" desc="얼굴 좌우 조명 방향 불일치(3.2s ~ 4.1s)" percent={68} />
                <DetailItem title="텍스처 분석" risk="낮음" riskLevel="low" desc="피부 질감 생성 패턴의 미세한 규칙성 감지" percent={61} />
            </View>

            {/* PDF 다운로드 */}
            <View style={styles.pdfArea}>
                <Pressable onPress={onDownloadPdf} style={styles.pdfBtn}>
                    <Text style={styles.pdfBtnText}>분석 리포트 PDF 다운로드</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

function Chip({ text }: { text: string }) {
    return (
        <View style={styles.chip}>
            <Text style={styles.chipText}>{text}</Text>
        </View>
    );
}

function riskTagStyle(level: "high" | "mid" | "low") {
    if (level === "high") return { bg: "#ffe5e5", fg: "#d93025" };
    if (level === "mid") return { bg: "#fff4cc", fg: "#b26a00" };
    return { bg: "#e6fff1", fg: "#1f7a4a" };
}

function barColor(level: "high" | "mid" | "low") {
    if (level === "high") return "#e74c3c";
    if (level === "mid") return "#f59e0b";
    return "#3b82f6";
}

function DetailItem(props: {
    title: string;
    risk: string;
    riskLevel: "high" | "mid" | "low";
    desc: string;
    percent: number;
}) {
    const tag = riskTagStyle(props.riskLevel);
    const fill = barColor(props.riskLevel);

    return (
        <View style={styles.detailItem}>
            <View style={styles.detailTop}>
                <View style={{ flex: 1 }}>
                    <View style={styles.dTitleRow}>
                        <Text style={styles.dTitle}>{props.title}</Text>
                        <View style={[styles.tag, { backgroundColor: tag.bg }]}>
                            <Text style={[styles.tagText, { color: tag.fg }]}>위험도: {props.risk}</Text>
                        </View>
                    </View>
                    <Text style={styles.dDesc}>{props.desc}</Text>
                </View>

                <View style={styles.dRight}>
                    <Text style={styles.dPercent}>{props.percent}%</Text>
                    <Text style={styles.dSub}>신뢰도</Text>
                </View>
            </View>

            <View style={styles.dBar}>
                <View style={[styles.dBarFill, { width: `${props.percent}%`, backgroundColor: fill }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#fff" },
    content: { padding: 16, paddingBottom: 28, gap: 16 },

    top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 8 },
    rtTitle: { fontSize: 22, fontWeight: "900" },
    rtSub: { marginTop: 6, color: "#666" },

    ghostPill: { height: 42, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: "#dcdcdc", justifyContent: "center" },
    ghostPillText: { fontWeight: "800" },

    card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e9e9e9", borderRadius: 18, padding: 18, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
    videoCard: { gap: 12 },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    h3: { fontSize: 16, fontWeight: "900" },

    badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
    badgeText: { fontSize: 12, fontWeight: "900" },

    videoPreview: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#eee" },
    previewImage: { width: "100%", height: 200, backgroundColor: "#000" },
    vpDummy: { height: 200, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0b", paddingHorizontal: 10 },
    vpDummyText: { color: "#fff", fontWeight: "900" },
    vpSubText: { marginTop: 8, color: "#ddd", fontSize: 12, textAlign: "center" },

    scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginTop: 14 },
    scoreLabel: { fontWeight: "900", marginBottom: 6 },
    scoreBar: { height: 10, borderRadius: 999, backgroundColor: "#f0f0f0", overflow: "hidden" },
    scoreFill: { height: "100%", backgroundColor: "#ff4d4d" },
    scoreDesc: { marginTop: 8, color: "#666", fontSize: 13 },

    scoreNum: { alignItems: "flex-end" },
    big: { fontSize: 34, fontWeight: "900", color: "#d93025" },
    small: { color: "#666", fontSize: 12 },

    miniTitle: { marginBottom: 12, fontWeight: "900" },
    trust: { alignItems: "center", paddingVertical: 6, gap: 4 },
    trustNum: { fontSize: 42, fontWeight: "900", color: PRIMARY },
    trustSub: { color: "#666", fontSize: 13 },

    infoList: { gap: 10 },
    infoRow: { flexDirection: "row", justifyContent: "space-between" },
    infoLabel: { color: "#555" },
    infoValue: { color: "#111", fontWeight: "900" },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#f5f7ff", borderWidth: 1, borderColor: "rgba(73, 105, 219, 0.18)" },
    chipText: { color: PRIMARY, fontWeight: "900", fontSize: 12 },

    sectionCard: { marginTop: 0 },
    sectionTitle: { marginBottom: 12, fontSize: 18, fontWeight: "900" },

    timeline: { height: 120, borderRadius: 14, borderWidth: 1, borderColor: "#eee", padding: 14, flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: "#fff" },
    timelineBar: { height: "80%", borderRadius: 8 },
    barRed: { backgroundColor: "#e74c3c" },
    barBlue: { backgroundColor: "#3b82f6" },

    hint: { marginTop: 10, fontSize: 12, color: "#777" },

    detailItem: { borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 14, marginTop: 12 },
    detailTop: { flexDirection: "row", gap: 12 },
    dTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    dTitle: { fontWeight: "900" },
    dDesc: { color: "#666", fontSize: 13, marginTop: 4 },
    tag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
    tagText: { fontSize: 11, fontWeight: "900" },

    dRight: { alignItems: "flex-end" },
    dPercent: { fontWeight: "900", fontSize: 20 },
    dSub: { fontSize: 12, color: "#777" },

    dBar: { height: 10, backgroundColor: "#f0f0f0", borderRadius: 999, overflow: "hidden", marginTop: 12 },
    dBarFill: { height: "100%" },

    pdfArea: { alignItems: "center", marginTop: 6 },
    pdfBtn: { height: 54, paddingHorizontal: 26, borderRadius: 16, backgroundColor: PRIMARY, justifyContent: "center", alignItems: "center" },
    pdfBtnText: { color: "#fff", fontWeight: "900" },
});
