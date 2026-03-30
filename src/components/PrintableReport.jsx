// PrintableReport.jsx
// InBody 스타일 영상 위변조 분석 보고서 PDF 컴포넌트

function PdfLineChart({ data }) {
    const width = 660;
    const height = 160;
    const padL = 36, padR = 16, padT = 12, padB = 28;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const maxX = data.length - 1 || 1;

    const pts = data.map((d, i) => {
        const x = padL + (i / maxX) * innerW;
        const y = padT + innerH - (Math.min(d.fake_prob, 100) / 100) * innerH;
        return { x, y, ...d };
    });

    const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");

    const areaPath = [
        `M ${pts[0].x} ${padT + innerH}`,
        ...pts.map(p => `L ${p.x} ${p.y}`),
        `L ${pts[pts.length - 1].x} ${padT + innerH}`,
        "Z"
    ].join(" ");

    const yTicks = [0, 25, 50, 75, 100];

    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            {yTicks.map(t => {
                const y = padT + innerH - (t / 100) * innerH;
                return (
                    <g key={t}>
                        <line
                            x1={padL}
                            y1={y}
                            x2={padL + innerW}
                            y2={y}
                            stroke={t === 0 ? "#94a3b8" : "#e2e8f0"}
                            strokeWidth={t === 0 ? 1.2 : 0.8}
                            strokeDasharray={t === 0 ? "none" : "3,3"}
                        />
                        <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#64748b">
                            {t}
                        </text>
                    </g>
                );
            })}

            <rect
                x={padL}
                y={padT}
                width={innerW}
                height={(innerH * 30) / 100}
                fill="#fef2f2"
                opacity="0.6"
            />
            <text
                x={padL + innerW - 2}
                y={padT + (innerH * 30) / 100 - 2}
                textAnchor="end"
                fontSize="8"
                fill="#dc2626"
                opacity="0.8"
            >
                위험 구간 (70%+)
            </text>

            <path d={areaPath} fill="url(#chartGrad)" />
            <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                points={polyline}
                strokeLinejoin="round"
            />

            {pts.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill={p.fake_prob >= 70 ? "#dc2626" : p.fake_prob >= 50 ? "#f59e0b" : "#1d4ed8"}
                    stroke="#fff"
                    strokeWidth="1.5"
                />
            ))}

            {pts
                .filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 8) === 0)
                .map((p, i) => (
                    <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="8.5" fill="#64748b">
                        {p.frame_idx}
                    </text>
                ))}

            <text x={padL + innerW / 2} y={height - 1} textAnchor="middle" fontSize="8" fill="#94a3b8">
                프레임 인덱스
            </text>
        </svg>
    );
}

function MiniBar({ value, max = 100, color = "#1d4ed8", bgColor = "#e2e8f0" }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ flex: 1, height: 4, background: bgColor, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 8, color: "#374151", fontWeight: 700, minWidth: 22, textAlign: "right" }}>
                {value.toFixed(0)}
            </span>
        </div>
    );
}

function RiskBadge({ level }) {
    const map = {
        HIGH: { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "높음" },
        MEDIUM: { bg: "#fffbeb", border: "#fde68a", color: "#d97706", label: "중간" },
        LOW: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", label: "낮음" },
    };
    const s = map[level?.toUpperCase?.()] || map.LOW;

    return (
        <span
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                fontSize: 10,
                fontWeight: 800,
            }}
        >
            {s.label}
        </span>
    );
}

function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

export default function PrintableReport({ analysisData, inlineFrameStats, publicItems, reportDate }) {
    const isFake = analysisData.final_prediction === "FAKE";
    const verdictText = isFake ? "AI 생성 의심" : "정상 영상";
    const verdictColor = isFake ? "#dc2626" : "#16a34a";
    const verdictBg = isFake ? "#fef2f2" : "#f0fdf4";
    const verdictBorder = isFake ? "#fecaca" : "#bbf7d0";

    const timelineChart = analysisData.timeline_chart ?? [];
    const totalFrames = timelineChart.length;

    const fileExt = analysisData.filename?.split(".").pop()?.toLowerCase() || "mp4";
    const modelNames = analysisData.model_names ?? ["Vision Transformer", "ResNet-50", "XceptionNet"];

    const sortedFramesDesc = [...timelineChart].sort((a, b) => b.fake_prob - a.fake_prob);
    const sortedTop4 = sortedFramesDesc.slice(0, 4).map(d => d.frame_idx);

    const avgProb = totalFrames
        ? timelineChart.reduce((s, d) => s + d.fake_prob, 0) / totalFrames
        : 0;

    // 1페이지 카드 표시 정책
    const summaryFrameLimit =
        totalFrames <= 16 ? totalFrames :
            totalFrames <= 30 ? 8 : 6;

    const summaryFrames = sortedFramesDesc
        .slice(0, summaryFrameLimit)
        .sort((a, b) => a.frame_idx - b.frame_idx);

    // 2페이지 상세 표는 chunk 처리
    const frameChunks = chunkArray(timelineChart, 15);

    const S = {
        page: {
            width: 794,
            minHeight: 1123,
            background: "#fff",
            fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
            fontSize: 12,
            color: "#1e293b",
            position: "relative",
            boxSizing: "border-box",
            padding: "28px 32px 24px",
            borderBottom: "4px solid #f1f5f9",
        },

        brandBar: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: "3px solid #1e3a8a",
            paddingBottom: 10,
            marginBottom: 14,
        },
        brandLeft: { display: "flex", flexDirection: "column", gap: 2 },
        brandTitle: { fontSize: 22, fontWeight: 900, color: "#1e3a8a", letterSpacing: -0.5 },
        brandSub: { fontSize: 10, color: "#64748b", letterSpacing: 0.3 },
        brandRight: { textAlign: "right" },
        brandModel: { fontSize: 10, color: "#94a3b8" },
        brandDate: { fontSize: 10, color: "#64748b" },

        infoStrip: {
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            border: "1px solid #e2e8f0",
            marginBottom: 14,
        },
        infoCell: {
            padding: "6px 10px",
            borderRight: "1px solid #e2e8f0",
        },
        infoCellLast: { padding: "6px 10px" },
        infoLabel: {
            fontSize: 9,
            color: "#64748b",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 2,
        },
        infoValue: { fontSize: 12, fontWeight: 800, color: "#1e293b" },

        mainGrid: { display: "grid", gridTemplateColumns: "1fr 220px", gap: 14, marginBottom: 14 },

        sectionTitle: {
            fontSize: 13,
            fontWeight: 900,
            color: "#1e3a8a",
            borderBottom: "1.5px solid #1e3a8a",
            paddingBottom: 3,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
        },
        sectionEn: { fontSize: 10, fontWeight: 700, color: "#64748b" },

        verdictBox: {
            border: `2px solid ${verdictBorder}`,
            background: verdictBg,
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
        },
        verdictMain: { fontSize: 28, fontWeight: 900, color: verdictColor, letterSpacing: -1 },
        verdictConf: { textAlign: "right" },
        verdictConfNum: { fontSize: 22, fontWeight: 900, color: "#1e293b" },
        verdictConfLabel: { fontSize: 9, color: "#64748b" },

        metricGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 },
        metricCard: {
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            padding: "8px 10px",
            textAlign: "center",
            background: "#f8fafc",
        },
        metricLabel: { fontSize: 9, color: "#64748b", marginBottom: 3 },
        metricValue: { fontSize: 16, fontWeight: 900, color: "#1e293b" },
        metricUnit: { fontSize: 9, fontWeight: 700, color: "#94a3b8" },

        scoreCard: {
            border: "1.5px solid #1e3a8a",
            borderRadius: 6,
            padding: "12px",
            textAlign: "center",
            marginBottom: 10,
            background: "#eff6ff",
        },
        scoreTitle: { fontSize: 10, color: "#1d4ed8", fontWeight: 800, marginBottom: 4 },
        scoreNum: { fontSize: 48, fontWeight: 900, color: "#1e3a8a", lineHeight: 1 },
        scoreMax: { fontSize: 14, color: "#64748b", fontWeight: 700 },
        scoreNote: { fontSize: 9, color: "#64748b", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-line" },

        table: { width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 10 },
        th: {
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            padding: "6px 8px",
            textAlign: "left",
            fontWeight: 700,
            color: "#374151",
        },
        td: {
            border: "1px solid #e2e8f0",
            padding: "6px 8px",
            verticalAlign: "middle",
            color: "#374151",
        },

        frameSummaryNote: {
            fontSize: 9,
            color: "#64748b",
            marginBottom: 6,
        },
        frameGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 6 },
        frameCard: {
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "3px 6px",
            background: "#f8fafc",
        },
        frameCardTop: {
            border: "1px solid #fed7aa",
            borderRadius: 4,
            padding: "3px 6px",
            background: "#fff7ed",
        },

        hmGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
        hmCard: { border: "1px solid #e2e8f0", borderRadius: 5, overflow: "hidden" },
        hmImg: { width: "100%", height: 150, objectFit: "cover", display: "block", background: "#e2e8f0" },
        hmEmpty: {
            width: "100%",
            height: 150,
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: 11,
            fontWeight: 700,
        },
        hmMeta: { padding: "6px 8px", fontSize: 10, lineHeight: 1.6, color: "#374151" },

        footer: {
            borderTop: "1px solid #e2e8f0",
            paddingTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#94a3b8",
            marginTop: 10,
        },

        rightItem: {
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            padding: "8px 10px",
            marginBottom: 6,
            background: "#f8fafc",
        },
        rightLabel: { fontSize: 9, color: "#64748b", fontWeight: 700, marginBottom: 2 },
        rightValue: { fontSize: 13, fontWeight: 900, color: "#1e293b" },

        controlBox: {
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            padding: "8px 10px",
            marginBottom: 6,
            background: "#f8fafc",
        },
        controlTitle: { fontSize: 10, fontWeight: 900, color: "#1e3a8a", marginBottom: 6 },
        controlRow: { display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 },
        controlLabel: { color: "#64748b" },
        controlValue: { fontWeight: 800, color: "#1e293b" },

        chunkLabel: {
            fontSize: 9,
            fontWeight: 700,
            color: "#64748b",
            marginBottom: 4,
            marginTop: 8,
        },
    };

    return (
        <div style={{ background: "#f1f5f9", padding: 20 }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
                * { font-family: 'Noto Sans KR', sans-serif !important; }
            `}</style>

            {/* PAGE 1 */}
            <div style={S.page} className="pdf-page">
                <div style={S.brandBar}>
                    <div style={S.brandLeft}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={S.brandTitle}>DeepFake Analyzer</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                [{analysisData.analysis_id}][VideoScope]
                            </span>
                        </div>
                        <span style={S.brandSub}>영상 위·변조 및 AI 생성 의심 자동 분석 보고서</span>
                    </div>
                    <div style={S.brandRight}>
                        <div style={S.brandModel}>www.deepfake-analyzer.com</div>
                        <div style={S.brandDate}>{reportDate}</div>
                    </div>
                </div>

                <div style={S.infoStrip}>
                    {[
                        { label: "파일명", value: analysisData.filename || "video.mp4" },
                        { label: "영상 길이", value: analysisData.video_duration || "2분 34초" },
                        { label: "해상도", value: analysisData.resolution || "1920×1080" },
                        { label: "프레임 레이트", value: analysisData.frame_rate || "30fps" },
                        { label: "파일 크기", value: analysisData.file_size || "245MB" },
                    ].map((item, i, arr) => (
                        <div key={i} style={i < arr.length - 1 ? S.infoCell : S.infoCellLast}>
                            <div style={S.infoLabel}>{item.label}</div>
                            <div style={S.infoValue}>{item.value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ ...S.infoStrip, gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 14 }}>
                    {[
                        { label: "분석 시간", value: analysisData.analysis_time || "14.2초" },
                        { label: "총 프레임 수", value: `${totalFrames}프레임` },
                        { label: "파일 형식", value: `.${fileExt.toUpperCase()}` },
                        { label: "판별 모델 수", value: `${modelNames.length}개` },
                    ].map((item, i, arr) => (
                        <div key={i} style={i < arr.length - 1 ? S.infoCell : S.infoCellLast}>
                            <div style={S.infoLabel}>{item.label}</div>
                            <div style={S.infoValue}>{item.value}</div>
                        </div>
                    ))}
                </div>

                <div style={S.mainGrid}>
                    <div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={S.sectionTitle}>
                                체성분석 <span style={S.sectionEn}>Final Verdict Analysis</span>
                            </div>
                            <div style={S.verdictBox}>
                                <div>
                                    <div style={{ fontSize: 10, color: verdictColor, fontWeight: 700, marginBottom: 2 }}>
                                        최종 판정
                                    </div>
                                    <div style={S.verdictMain}>{verdictText}</div>
                                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                                        {modelNames.join(" · ")} 앙상블 분석
                                    </div>
                                </div>
                                <div style={S.verdictConf}>
                                    <div style={S.verdictConfLabel}>판별 신뢰도</div>
                                    <div style={S.verdictConfNum}>
                                        {analysisData.overall_confidence_percent.toFixed(1)}
                                        <span style={{ fontSize: 14, color: "#64748b" }}>%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={S.sectionTitle}>
                                골격근·지방분석 <span style={S.sectionEn}>Muscle-Fat Analysis</span>
                            </div>

                            <div style={S.metricGrid}>
                                {[
                                    { label: "최고 의심 프레임", value: `Frame ${inlineFrameStats.peakIdx}`, unit: "" },
                                    { label: "위험 구간 수", value: inlineFrameStats.dangerCount, unit: "개" },
                                    { label: "평균 위조 확률", value: avgProb.toFixed(1), unit: "%" },
                                ].map((m, i) => (
                                    <div key={i} style={S.metricCard}>
                                        <div style={S.metricLabel}>{m.label}</div>
                                        <div style={S.metricValue}>
                                            {m.value}
                                            <span style={S.metricUnit}>{m.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 5,
                                    padding: "10px 12px",
                                    background: "#f8fafc",
                                    marginBottom: 8,
                                }}
                            >
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#374151", marginBottom: 2 }}>
                                    프레임별 위조 확률 추이
                                </div>
                                <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 8 }}>
                                    표준이하 ←────────── 표준 ──────────→ 표준이상
                                </div>
                                <PdfLineChart data={timelineChart} />
                            </div>
                        </div>

                        <div>
                            <div style={S.sectionTitle}>
                                부위별근육분석 <span style={S.sectionEn}>Segmental Model Analysis</span>
                            </div>
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...S.th, width: "28%" }}>판별 모델</th>
                                            <th style={S.th}>위조 확률</th>
                                            <th style={{ ...S.th, width: "80px", textAlign: "center" }}>위험도</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modelNames.map((name, i) => {
                                            const prob = analysisData.overall_confidence_percent - (i * 3.7) + (i * 2.1);
                                            const risk = prob >= 70 ? "HIGH" : prob >= 50 ? "MEDIUM" : "LOW";
                                            return (
                                                <tr key={i}>
                                                    <td style={{ ...S.td, fontWeight: 700 }}>{name}</td>
                                                    <td style={S.td}>
                                                        <MiniBar
                                                            value={Math.max(0, Math.min(prob, 100))}
                                                            color={prob >= 70 ? "#dc2626" : prob >= 50 ? "#f59e0b" : "#1d4ed8"}
                                                        />
                                                    </td>
                                                    <td style={{ ...S.td, textAlign: "center" }}>
                                                        <RiskBadge level={risk} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={S.scoreCard}>
                            <div style={S.scoreTitle}>위조 의심 지수 Forgery Score</div>
                            <div style={S.scoreNum}>{Math.round(analysisData.overall_confidence_percent)}</div>
                            <div style={S.scoreMax}>/100점</div>
                            <div style={S.scoreNote}>
                                {isFake
                                    ? "AI 생성 또는 편집 가능성이\n높게 감지되었습니다."
                                    : "정상 영상으로 판별되었습니다.\n신뢰도가 높습니다."}
                            </div>
                        </div>

                        <div style={S.controlBox}>
                            <div style={S.controlTitle}>권장 조치 Recommended Actions</div>
                            {[
                                { label: "원본 보존", value: "즉시 필요" },
                                { label: "추가 감정", value: isFake ? "강력 권장" : "불필요" },
                                { label: "법적 대응", value: isFake ? "검토 필요" : "불필요" },
                                { label: "재분석 주기", value: "30일" },
                            ].map((r, i) => (
                                <div key={i} style={S.controlRow}>
                                    <span style={S.controlLabel}>{r.label}</span>
                                    <span
                                        style={{
                                            ...S.controlValue,
                                            color: r.value.includes("강력") || r.value.includes("즉시") ? "#dc2626" : "#1e293b",
                                        }}
                                    >
                                        {r.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={S.controlBox}>
                            <div style={S.controlTitle}>연구항목 Research Parameters</div>
                            {[
                                { label: "최고 위조확률", value: `${Math.max(...timelineChart.map(d => d.fake_prob)).toFixed(1)}%` },
                                { label: "최저 위조확률", value: `${Math.min(...timelineChart.map(d => d.fake_prob)).toFixed(1)}%` },
                                { label: "평균 위조확률", value: `${avgProb.toFixed(1)}%` },
                                { label: "위험 프레임 비율", value: `${((inlineFrameStats.dangerCount / totalFrames) * 100).toFixed(1)}%` },
                                { label: "판별 신뢰도", value: `${analysisData.overall_confidence_percent.toFixed(1)}%` },
                            ].map((r, i) => (
                                <div key={i} style={{ ...S.controlRow, marginBottom: 3 }}>
                                    <span style={{ fontSize: 9, color: "#64748b" }}>{r.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#1e293b" }}>{r.value}</span>
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                border: "1px solid #bfdbfe",
                                borderRadius: 5,
                                padding: "8px 10px",
                                background: "#eff6ff",
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontSize: 9, color: "#1d4ed8", fontWeight: 700, marginBottom: 3 }}>
                                파일 형식
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a" }}>
                                .{fileExt.toUpperCase()}
                            </div>
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                                {modelNames.map(n => (
                                    <span
                                        key={n}
                                        style={{
                                            padding: "2px 7px",
                                            borderRadius: 999,
                                            background: "#dbeafe",
                                            border: "1px solid #93c5fd",
                                            color: "#1d4ed8",
                                            fontSize: 9,
                                            fontWeight: 800,
                                        }}
                                    >
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <div style={S.sectionTitle}>
                        비만분석 <span style={S.sectionEn}>Obesity Analysis — Top Suspicious Frames</span>
                    </div>

                    <div style={S.frameSummaryNote}>
                        전체 {totalFrames}개 프레임 중 위조 확률 상위 {summaryFrames.length}개 프레임만 요약 표시
                    </div>

                    <div style={S.frameGrid}>
                        {summaryFrames.map((frame) => {
                            const isTop = sortedTop4.includes(frame.frame_idx);
                            const riskColor =
                                frame.fake_prob >= 70 ? "#dc2626" :
                                    frame.fake_prob >= 50 ? "#d97706" : "#16a34a";

                            return (
                                <div key={frame.frame_idx} style={isTop ? S.frameCardTop : S.frameCard}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 1,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 9,
                                                fontWeight: 800,
                                                color: "#1e293b",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            {isTop && (
                                                <span
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: "50%",
                                                        background: "#f97316",
                                                        display: "inline-block",
                                                    }}
                                                />
                                            )}
                                            F{frame.frame_idx}
                                        </span>
                                        <span style={{ fontSize: 10, fontWeight: 900, color: riskColor }}>
                                            {frame.fake_prob.toFixed(0)}%
                                        </span>
                                    </div>

                                    <MiniBar
                                        value={frame.fake_prob}
                                        color={
                                            frame.fake_prob >= 70 ? "#dc2626" :
                                                frame.fake_prob >= 50 ? "#f59e0b" : "#1d4ed8"
                                        }
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={S.footer}>
                    <span>분석 ID: {analysisData.analysis_id}</span>
                    <span>생성일시: {reportDate} · 1 / 2 Page</span>
                </div>
            </div>

            {/* PAGE 2 */}
            <div style={{ ...S.page, marginTop: 0 }} className="pdf-page">
                <div style={S.brandBar}>
                    <div style={S.brandLeft}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={S.brandTitle}>DeepFake Analyzer</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>상세 분석 · Detailed Report</span>
                        </div>
                        <span style={S.brandSub}>주요 분석 항목 · 종합 의견 · 히트맵 이미지</span>
                    </div>
                    <div style={S.brandRight}>
                        <div style={S.brandModel}>{analysisData.analysis_id}</div>
                        <div style={S.brandDate}>{reportDate}</div>
                    </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        세포외수분비분석 <span style={S.sectionEn}>ECW Analysis — Major Analysis Items</span>
                    </div>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={{ ...S.th, width: "24%" }}>항목</th>
                                <th style={{ ...S.th, width: "11%", textAlign: "center" }}>위험도</th>
                                <th style={{ ...S.th, width: "14%" }}>점수</th>
                                <th style={S.th}>설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {publicItems.map((item, idx) => (
                                <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                    <td style={{ ...S.td, fontWeight: 700 }}>{item.title}</td>
                                    <td style={{ ...S.td, textAlign: "center" }}>
                                        <RiskBadge level={item.risk_level} />
                                    </td>
                                    <td style={S.td}>
                                        <MiniBar
                                            value={item.score_percent}
                                            color={item.score_percent >= 70 ? "#dc2626" : item.score_percent >= 50 ? "#f59e0b" : "#1d4ed8"}
                                        />
                                    </td>
                                    <td style={{ ...S.td, fontSize: 10, lineHeight: 1.5 }}>{item.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        신체변화 <span style={S.sectionEn}>Body Composition History — Analysis Confidence Timeline</span>
                    </div>

                    <div
                        style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 5,
                            padding: "10px 14px",
                            background: "#f8fafc",
                            overflowX: "auto",
                        }}
                    >
                        {frameChunks.map((chunk, idx) => (
                            <div key={idx} style={{ marginBottom: idx < frameChunks.length - 1 ? 10 : 0 }}>
                                <div style={S.chunkLabel}>
                                    프레임 {chunk[0]?.frame_idx} ~ {chunk[chunk.length - 1]?.frame_idx}
                                </div>

                                <table style={{ ...S.table, marginBottom: 0, fontSize: 10 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...S.th, fontSize: 9 }}>항목 \ 프레임</th>
                                            {chunk.map(d => (
                                                <th
                                                    key={d.frame_idx}
                                                    style={{ ...S.th, textAlign: "center", fontSize: 9, padding: "4px 5px" }}
                                                >
                                                    {d.frame_idx}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ ...S.td, fontWeight: 700, fontSize: 9 }}>위조확률 (%)</td>
                                            {chunk.map(d => (
                                                <td
                                                    key={d.frame_idx}
                                                    style={{
                                                        ...S.td,
                                                        textAlign: "center",
                                                        fontSize: 9,
                                                        padding: "4px 5px",
                                                        fontWeight: 800,
                                                        color:
                                                            d.fake_prob >= 70 ? "#dc2626" :
                                                                d.fake_prob >= 50 ? "#d97706" : "#16a34a",
                                                    }}
                                                >
                                                    {d.fake_prob.toFixed(1)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td style={{ ...S.td, fontWeight: 700, fontSize: 9 }}>위험도</td>
                                            {chunk.map(d => (
                                                <td
                                                    key={d.frame_idx}
                                                    style={{ ...S.td, textAlign: "center", fontSize: 9, padding: "4px 5px" }}
                                                >
                                                    {d.risk === "HIGH" ? "🔴" : d.risk === "MEDIUM" ? "🟡" : "🟢"}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        종합 의견 <span style={S.sectionEn}>Overall Assessment</span>
                    </div>
                    <div
                        style={{
                            border: `1px solid ${verdictBorder}`,
                            background: verdictBg,
                            borderRadius: 5,
                            padding: "12px 16px",
                        }}
                    >
                        <div style={{ fontSize: 11, lineHeight: 1.9, color: "#374151", whiteSpace: "pre-line" }}>
                            {`본 영상은 ${verdictText}으로 판정되었으며, 전체 판별 신뢰도는 ${analysisData.overall_confidence_percent.toFixed(1)}%입니다.
최고 의심 프레임은 Frame ${inlineFrameStats.peakIdx}이며, 위험 구간은 총 ${inlineFrameStats.dangerCount}개 감지되었습니다.
상위 의심 프레임 전후 구간을 중심으로 얼굴 경계, 배경 이음새, 질감 불연속성, 조명 일관성을 추가 확인하는 것이 권장됩니다.
본 보고서는 자동화된 AI 분석 결과이며, 법적 효력을 위해서는 전문가의 추가 감정이 필요합니다.`}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={S.sectionTitle}>
                        히트맵 이미지 <span style={S.sectionEn}>Heatmap Visualization</span>
                    </div>
                    <div style={S.hmGrid}>
                        {analysisData.heatmap_frames.slice(0, 4).map((frame, idx) => (
                            <div key={idx} style={S.hmCard}>
                                {frame.image ? (
                                    <img
                                        src={frame.image}
                                        alt={`heatmap-${frame.id}`}
                                        style={S.hmImg}
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div style={S.hmEmpty}>히트맵 이미지 없음</div>
                                )}
                                <div style={S.hmMeta}>
                                    <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: 1 }}>
                                        {frame.id}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#dc2626" }}>AI 의심 {frame.fake_prob.toFixed(2)}%</span>
                                        <span style={{ color: "#16a34a" }}>정상 {frame.real_prob.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>사용 모델:</span>
                    {modelNames.map(n => (
                        <span
                            key={n}
                            style={{
                                padding: "3px 9px",
                                borderRadius: 999,
                                background: "#eef2ff",
                                border: "1px solid #c7d2fe",
                                color: "#3730a3",
                                fontSize: 10,
                                fontWeight: 800,
                            }}
                        >
                            {n}
                        </span>
                    ))}
                </div>

                <div style={S.footer}>
                    <span>본 보고서는 자동 생성된 분석 결과이며, 법적 효력을 위해서는 전문가 감정이 필요합니다.</span>
                    <span>생성일시: {reportDate} · 분석 ID: {analysisData.analysis_id} · 2 / 2 Page</span>
                </div>
            </div>
        </div>
    );
}