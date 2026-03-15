// src/pages/GalleryPage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─────────────────────────────────────────────────────────────
// 임시 JSON 데이터 (실제 서비스에서는 API 응답으로 교체)
// ─────────────────────────────────────────────────────────────
const MOCK_ANALYSIS = {
    analysis_id: "H200_20260312170203",
    filename: "test_0006_(북한 실제영상) 평양의 아침 8시30분 풍경은 어떨까？.mp4",
    final_prediction: "REAL",   // "REAL" | "FAKE"
    overall_confidence_percent: 85.82,
    timeline_chart: [
        { frame_idx: 1, fake_prob: 57.16, risk: "중간", color: "yellow" },
        { frame_idx: 2, fake_prob: 64.24, risk: "중간", color: "yellow" },
        { frame_idx: 3, fake_prob: 50.40, risk: "중간", color: "yellow" },
        { frame_idx: 4, fake_prob: 53.07, risk: "중간", color: "yellow" },
        { frame_idx: 5, fake_prob: 66.79, risk: "중간", color: "yellow" },
        { frame_idx: 6, fake_prob: 55.19, risk: "중간", color: "yellow" },
        { frame_idx: 7, fake_prob: 41.95, risk: "낮음", color: "blue" },
        { frame_idx: 8, fake_prob: 18.14, risk: "낮음", color: "blue" },
        { frame_idx: 9, fake_prob: 7.09, risk: "낮음", color: "blue" },
        { frame_idx: 10, fake_prob: 5.78, risk: "낮음", color: "blue" },
        { frame_idx: 11, fake_prob: 2.43, risk: "낮음", color: "blue" },
        { frame_idx: 12, fake_prob: 3.12, risk: "낮음", color: "blue" },
        { frame_idx: 13, fake_prob: 4.50, risk: "낮음", color: "blue" },
        { frame_idx: 14, fake_prob: 6.78, risk: "낮음", color: "blue" },
        { frame_idx: 15, fake_prob: 9.21, risk: "낮음", color: "blue" },
        { frame_idx: 16, fake_prob: 13.89, risk: "낮음", color: "blue" },
    ],
    detailed_analysis: [
        {
            title: "프레임 전환 일관성 위험도",
            risk_level: "낮음",
            score_percent: 40.7,
            description: "프레임 전환 시 얼굴이나 배경의 미세한 떨림 및 시공간적 비일관성이 40.7% 수준으로 감지되었습니다.",
        },
        {
            title: "공간적 텍스처 및 화질 왜곡 위험도",
            risk_level: "낮음",
            score_percent: 28.7,
            description: "이미지 생성 과정에서 발생하는 인위적인 픽셀 뭉개짐이나 텍스처 이상 징후가 28.7% 확률로 감지되었습니다.",
        },
        // ── 아래 3개는 Pro 전용 (블러 처리) ──────────────────────
        {
            title: "얼굴 경계 왜곡 위험도",
            risk_level: "중간",
            score_percent: 74.0,
            description: "헤어라인/윤곽부 픽셀 불연속성 다수 발견되었습니다.",
            proOnly: true,
        },
        {
            title: "조명 일관성 위험도",
            risk_level: "중간",
            score_percent: 68.0,
            description: "얼굴 좌우 조명 방향 불일치(3.2s ~ 4.1s) 구간이 감지되었습니다.",
            proOnly: true,
        },
        {
            title: "텍스처 분석 위험도",
            risk_level: "낮음",
            score_percent: 61.0,
            description: "피부 질감 생성 패턴의 미세한 규칙성이 감지되었습니다.",
            proOnly: true,
        },
    ],
};

// ─────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────
function riskTag(level) {
    if (level === "높음") return "high";
    if (level === "중간") return "mid";
    return "low";
}

function pointColorFromProb(prob) {
    if (prob >= 70) return "#E24B4A";
    if (prob >= 50) return "#EF9F27";
    return "#378ADD";
}

// ─────────────────────────────────────────────────────────────
// FrameGraphPage — 서브페이지 (햄버거 메뉴에서 진입)
// ─────────────────────────────────────────────────────────────
function FrameGraphPage({ onBack, analysisData }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const { timeline_chart } = analysisData;

    const frameStats = useMemo(() => {
        const probs = timeline_chart.map(f => f.fake_prob);
        const avg = Math.round(probs.reduce((a, b) => a + b, 0) / probs.length * 10) / 10;
        const peak = Math.max(...probs);
        const peakIdx = probs.indexOf(peak) + 1;
        const dangerCount = probs.filter(p => p >= 70).length;
        return { avg, peak, peakIdx, dangerCount };
    }, [timeline_chart]);

    useEffect(() => {
        const init = () => {
            if (!chartRef.current || !window.Chart) return;
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext("2d");
            const scores = timeline_chart.map(f => f.fake_prob);
            const labels = timeline_chart.map(f => `Frame ${f.frame_idx}`);
            const pointColors = scores.map(pointColorFromProb);

            const gradient = ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");

            chartInstance.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        data: scores,
                        borderColor: "#378ADD",
                        borderWidth: 2.5,
                        pointBackgroundColor: pointColors,
                        pointBorderColor: pointColors,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.35,
                        fill: true,
                        backgroundColor: gradient,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` 위조 확률: ${c.parsed.y.toFixed(2)}%` } },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                            grid: { display: false },
                        },
                        y: {
                            min: 0, max: 100,
                            ticks: { font: { size: 11 }, color: "#888", callback: v => v + "%" },
                            grid: { color: "rgba(136,136,136,0.12)" },
                        },
                    },
                },
            });
        };

        if (window.Chart) { init(); }
        else {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            s.onload = init;
            document.body.appendChild(s);
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [timeline_chart]);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit" }}>
            <style>{`
                .fg-header { background:#fff; border-bottom:1px solid #e5e7eb; padding:16px 32px; display:flex; align-items:center; gap:16px; position:sticky; top:0; z-index:10; }
                .fg-back-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; border:1.5px solid #e5e7eb; border-radius:8px; background:#fff; font-size:13px; color:#374151; cursor:pointer; font-weight:500; transition:all .15s; }
                .fg-back-btn:hover { background:#f3f4f6; border-color:#d1d5db; }
                .fg-body { max-width:1100px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px; }
                .fg-card { background:#fff; border-radius:16px; border:1px solid #e5e7eb; padding:28px; box-shadow:0 1px 6px rgba(0,0,0,.05); }
                .fg-card-title { font-size:16px; font-weight:700; color:#111827; margin:0 0 6px; }
                .fg-legend { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
                .fg-legend span { display:flex; align-items:center; gap:6px; font-size:12px; color:#6b7280; }
                .fg-legend em { display:inline-block; width:10px; height:10px; border-radius:2px; font-style:normal; }
                .fg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:20px; }
                .fg-stat-box { background:#f9fafb; border-radius:12px; padding:16px; text-align:center; }
                .fg-stat-label { font-size:11px; color:#9ca3af; margin:0 0 6px; }
                .fg-stat-value { font-size:22px; font-weight:700; color:#111827; margin:0; }
                .fg-stat-value.danger { color:#E24B4A; }
                .fg-heatmap-area { min-height:260px; background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; border:2px dashed #334155; }
                .fg-heatmap-icon { width:56px; height:56px; background:rgba(55,138,221,.12); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; }
                .fg-heatmap-label { color:#94a3b8; font-size:13px; font-weight:500; }
                .fg-heatmap-sub { color:#475569; font-size:12px; margin-top:-4px; }
            `}</style>

            <div className="fg-header">
                <button className="fg-back-btn" onClick={onBack}>← 결과 리포트로 돌아가기</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>프레임별 위조 의심도 분석</div>
            </div>

            <div className="fg-body">
                {/* 그래프 카드 */}
                <div className="fg-card">
                    <h3 className="fg-card-title">프레임별 위조 의심도 그래프</h3>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>
                        총 {timeline_chart.length}개 프레임 분석
                    </p>
                    <div className="fg-legend">
                        <span><em style={{ background: "#E24B4A" }} />높음 (70%+)</span>
                        <span><em style={{ background: "#EF9F27" }} />중간 (50–69%)</span>
                        <span><em style={{ background: "#378ADD" }} />낮음 (50% 미만)</span>
                    </div>
                    <div style={{ position: "relative", width: "100%", height: 280 }}>
                        <canvas ref={chartRef} />
                    </div>
                    <div className="fg-stats">
                        <div className="fg-stat-box">
                            <p className="fg-stat-label">평균 위조 확률</p>
                            <p className="fg-stat-value">{frameStats.avg}%</p>
                        </div>
                        <div className="fg-stat-box">
                            <p className="fg-stat-label">최고 의심 프레임</p>
                            <p className="fg-stat-value danger">Frame {frameStats.peakIdx}</p>
                        </div>
                        <div className="fg-stat-box">
                            <p className="fg-stat-label">위험 구간 수</p>
                            <p className="fg-stat-value danger">{frameStats.dangerCount}구간</p>
                        </div>
                    </div>
                </div>

                {/* 히트맵 카드 */}
                <div className="fg-card">
                    <h3 className="fg-card-title" style={{ marginBottom: 6 }}>히트맵 영상</h3>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>
                        위변조 의심 구간이 시각화된 히트맵 오버레이 영상입니다.
                    </p>
                    <div className="fg-heatmap-area">
                        <div className="fg-heatmap-icon">🎞️</div>
                        <div className="fg-heatmap-label">히트맵 영상 영역</div>
                        <div className="fg-heatmap-sub">분석 완료 후 히트맵 오버레이 영상이 표시됩니다.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main GalleryPage
// ─────────────────────────────────────────────────────────────
export default function GalleryPage() {
    const navigate = useNavigate();

    // ── 실제 서비스: props 또는 useEffect + fetch 로 교체 ──
    const analysisData = MOCK_ANALYSIS;

    const isPro = false; // true 로 바꾸면 Pro 잠금 해제

    const isAiGenerated = analysisData.final_prediction === "FAKE";
    const trustScore = analysisData.overall_confidence_percent.toFixed(1);

    // 영상 메타 정보 (실제 서비스에서는 API로 수신)
    const videoMeta = {
        nickname: "장관상받고 싶은 5인",
        date: "2026.03.15",
        link: "URL 어쩌구 저쩌구",
        views: "1234567890",
    };

    const [showFrameGraph, setShowFrameGraph] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const reportRef = useRef(null);
    const inlineChartRef = useRef(null);
    const inlineChartInst = useRef(null);

    // 인라인 그래프 통계
    const inlineFrameStats = useMemo(() => {
        const probs = analysisData.timeline_chart.map(f => f.fake_prob);
        const avg = Math.round(probs.reduce((a, b) => a + b, 0) / probs.length * 10) / 10;
        const peak = Math.max(...probs);
        const peakIdx = probs.indexOf(peak) + 1;
        const dangerCount = probs.filter(p => p >= 70).length;
        return { avg, peak, peakIdx, dangerCount };
    }, [analysisData.timeline_chart]);

    // 메뉴 외부 클릭 닫기
    useEffect(() => {
        const h = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // 인라인 차트 초기화
    useEffect(() => {
        const init = () => {
            if (!inlineChartRef.current || !window.Chart) return;
            if (inlineChartInst.current) inlineChartInst.current.destroy();
            const ctx = inlineChartRef.current.getContext("2d");
            const scores = analysisData.timeline_chart.map(f => f.fake_prob);
            const labels = analysisData.timeline_chart.map(f => `Frame ${f.frame_idx}`);
            const pointColors = scores.map(pointColorFromProb);
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, "rgba(55,138,221,0.20)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");
            inlineChartInst.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        data: scores,
                        borderColor: "#378ADD",
                        borderWidth: 2.5,
                        pointBackgroundColor: pointColors,
                        pointBorderColor: pointColors,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.35,
                        fill: true,
                        backgroundColor: gradient,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` 위조 확률: ${c.parsed.y.toFixed(2)}%` } },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                            grid: { display: false },
                        },
                        y: {
                            min: 0, max: 100,
                            ticks: { font: { size: 11 }, color: "#888", callback: v => v + "%" },
                            grid: { color: "rgba(136,136,136,0.12)" },
                        },
                    },
                },
            });
        };

        if (window.Chart) { init(); }
        else {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
            s.onload = init;
            document.body.appendChild(s);
        }
        return () => { if (inlineChartInst.current) inlineChartInst.current.destroy(); };
    }, [analysisData.timeline_chart]);

    // ── PDF 다운로드 ──
    const onDownloadPdf = async () => {
        const pdfArea = document.querySelector(".pdf-area");
        if (pdfArea) pdfArea.style.display = "none";

        const now = new Date();
        const timeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const header = document.createElement("div");
        header.id = "pdf-header";
        header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 0 14px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;font-size:13px;color:#6b7280;";
        header.innerHTML = `<span>${timeStr}</span><span style="font-weight:700;color:#111;">분석 결과 PDF</span>`;
        reportRef.current.prepend(header);

        const canvas = await html2canvas(reportRef.current, {
            scale: 2, useCORS: true, scrollX: 0, scrollY: 0,
            windowWidth: 1200, windowHeight: reportRef.current.scrollHeight,
        });
        if (pdfArea) pdfArea.style.display = "";
        document.getElementById("pdf-header")?.remove();

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 12;
        const contentWidth = pdfWidth - margin * 2;
        const scale = contentWidth / canvas.width;
        const totalHeightMm = canvas.height * scale;
        let pageStart = 0, isFirst = true;

        while (pageStart < totalHeightMm) {
            if (!isFirst) pdf.addPage();
            const pageEnd = Math.min(pageStart + pdfHeight, totalHeightMm);
            const sliceStartPx = pageStart / scale;
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.min((pageEnd - pageStart) / scale, canvas.height - sliceStartPx);
            const sliceCtx = sliceCanvas.getContext("2d");
            sliceCtx.drawImage(canvas, 0, sliceStartPx, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, sliceCanvas.height * scale);
            pageStart = pageEnd;
            isFirst = false;
        }
        pdf.save(`${timeStr.replace(/[.: ]/g, "_")}_분석결과.pdf`);
    };

    // ── 서브페이지로 전환 ──
    if (showFrameGraph) {
        return <FrameGraphPage onBack={() => setShowFrameGraph(false)} analysisData={analysisData} />;
    }

    // ── 상세 분석 항목 분리 ──
    const publicItems = analysisData.detailed_analysis.filter(d => !d.proOnly);
    const proItems = analysisData.detailed_analysis.filter(d => d.proOnly);

    return (
        <div id="main">
            <style>{`
                /* ── 버딕트 배너 ── */
                .verdict-banner { display:flex; align-items:center; gap:14px; border-radius:14px; padding:18px 22px; margin-top:18px; font-family:inherit; position:relative; overflow:hidden; animation:verdictIn .5s cubic-bezier(.22,1,.36,1) both; }
                @keyframes verdictIn { from{opacity:0;transform:translateY(8px) scale(.98)} to{opacity:1;transform:none} }
                .verdict-banner.danger { background:linear-gradient(135deg,#fff1f1,#ffe4e4); border:1.5px solid #f87171; box-shadow:0 4px 18px rgba(239,68,68,.12); }
                .verdict-banner.safe   { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1.5px solid #4ade80; box-shadow:0 4px 18px rgba(74,222,128,.12); }
                .verdict-icon { flex-shrink:0; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; }
                .verdict-banner.danger .verdict-icon { background:#fee2e2; }
                .verdict-banner.safe   .verdict-icon { background:#bbf7d0; }
                .verdict-text { flex:1; }
                .verdict-title { font-size:15px; font-weight:700; line-height:1.3; margin-bottom:3px; }
                .verdict-banner.danger .verdict-title { color:#b91c1c; }
                .verdict-banner.safe   .verdict-title { color:#15803d; }
                .verdict-desc { font-size:12px; line-height:1.5; color:#6b7280; }
                .verdict-pill { flex-shrink:0; padding:6px 13px; border-radius:999px; font-size:13px; font-weight:700; }
                .verdict-banner.danger .verdict-pill { background:#fecaca; color:#991b1b; }
                .verdict-banner.safe   .verdict-pill { background:#bbf7d0; color:#166534; }
                .verdict-banner::before { content:""; position:absolute; left:0;top:0;bottom:0; width:5px; border-radius:14px 0 0 14px; }
                .verdict-banner.danger::before { background:#ef4444; }
                .verdict-banner.safe::before   { background:#22c55e; }

                /* ── 영상 메타 정보 ── */
                .video-meta-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px 16px; margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:6px 16px; }
                .meta-row { display:flex; gap:6px; align-items:flex-start; }
                .meta-label { color:#9ca3af; font-size:11px; white-space:nowrap; padding-top:1px; }
                .meta-val { color:#111827; font-size:12px; font-weight:600; word-break:break-all; }

                /* ── 상단 액션 버튼 ── */
                .rt-header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
                .btn-deep-analysis { padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700; border:2px solid #2563eb; background:#fff; color:#2563eb; cursor:pointer; transition:all .15s; }
                .btn-deep-analysis:hover { background:#eff6ff; }
                .btn-pdf  { padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700; border:none; background:#2563eb; color:#fff; cursor:pointer; transition:background .15s; }
                .btn-pdf:hover { background:#1d4ed8; }
                .btn-back { padding:9px 16px; border-radius:8px; font-size:13px; font-weight:500; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; transition:all .15s; }
                .btn-back:hover { background:#f3f4f6; }

                /* ── 햄버거 메뉴 ── */
                .hamburger-wrap { position:relative; }
                .hamburger-btn { width:40px; height:40px; border-radius:8px; border:1.5px solid #e5e7eb; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; cursor:pointer; transition:all .15s; padding:0; }
                .hamburger-btn:hover { background:#f3f4f6; border-color:#d1d5db; }
                .hamburger-btn span { display:block; width:18px; height:2px; background:#374151; border-radius:2px; transition:all .2s; }
                .hamburger-btn.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
                .hamburger-btn.open span:nth-child(2) { opacity:0; }
                .hamburger-btn.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
                .hamburger-dropdown { position:absolute; right:0; top:calc(100% + 8px); background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.12); min-width:230px; z-index:100; overflow:hidden; animation:dropIn .18s cubic-bezier(.22,1,.36,1) both; }
                @keyframes dropIn { from{opacity:0;transform:translateY(-6px) scale(.97)} to{opacity:1;transform:none} }
                .hamburger-dropdown-header { padding:12px 16px 8px; font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid #f3f4f6; }
                .menu-item { display:flex; align-items:center; gap:10px; padding:12px 16px; font-size:13px; font-weight:500; color:#374151; cursor:pointer; transition:background .1s; }
                .menu-item:hover { background:#f9fafb; }
                .menu-icon { width:30px; height:30px; border-radius:8px; background:#eff6ff; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
                .menu-label-blue { font-size:13px; font-weight:600; color:#1d4ed8; }
                .menu-label-gray { font-size:13px; font-weight:600; color:#374151; }
                .menu-sub { font-size:11px; color:#9ca3af; margin-top:1px; }
                .menu-divider { height:1px; background:#f3f4f6; margin:0 16px; }

                /* ── Pro 잠금 오버레이 ── */
                .pro-items-wrapper { position:relative; border-radius:12px; overflow:hidden; margin-top:8px; }
                .pro-items-blur { filter:blur(4px) brightness(0.88); pointer-events:none; user-select:none; }
                .pro-lock-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:rgba(15,23,42,.52); backdrop-filter:blur(2px); border-radius:12px; z-index:5; }
                .pro-lock-icon { font-size:32px; }
                .pro-lock-title { font-size:15px; font-weight:800; color:#fff; }
                .pro-lock-desc { font-size:12px; color:#cbd5e1; text-align:center; max-width:200px; line-height:1.5; }
                .pro-lock-btn { padding:10px 24px; border-radius:8px; font-size:13px; font-weight:700; background:linear-gradient(135deg,#6366f1,#2563eb); color:#fff; border:none; cursor:pointer; margin-top:4px; transition:opacity .15s; }
                .pro-lock-btn:hover { opacity:.9; }
            `}</style>

            <div className="wrap">
                <section id="resultPage" className="result-page" ref={reportRef}>

                    {/* ── 상단 헤더 ── */}
                    <div className="result-top" style={{ alignItems: "flex-start" }}>
                        <div className="rt-left">
                            <h2 className="rt-title">분석 결과 리포트</h2>
                            <p className="rt-sub">업로드한 영상의 위변조/AI 생성 의심 구간을 종합 분석했습니다.</p>
                        </div>
                        <div className="rt-right">
                            <div className="rt-header-actions">
                                {/* 심층 분석 (Pro 전용) */}
                                <button
                                    type="button"
                                    className="btn-deep-analysis"
                                    onClick={() => !isPro && alert("Pro 구독 후 이용 가능한 기능입니다.")}
                                    title={isPro ? "심층 분석 실행" : "Pro 기능 — 업그레이드 필요"}
                                >
                                    {isPro ? "심층 분석" : "🔒 심층 분석"}
                                </button>

                                {/* PDF 다운로드
                                <button type="button" className="btn-pdf" onClick={onDownloadPdf}>
                                    분석 리포트 PDF 다운로드
                                </button> */}

                                {/* 메인으로 */}
                                <button type="button" className="btn-back" onClick={() => navigate("/")}>
                                    메인으로 돌아가기
                                </button>

                                {/* 햄버거 메뉴 */}
                                <div className="hamburger-wrap" ref={menuRef}>
                                    <button
                                        className={`hamburger-btn${menuOpen ? " open" : ""}`}
                                        onClick={() => setMenuOpen(v => !v)}
                                        aria-label="메뉴 열기"
                                    >
                                        <span /><span /><span />
                                    </button>
                                    {menuOpen && (
                                        <div className="hamburger-dropdown">
                                            <div className="hamburger-dropdown-header">분석 도구</div>
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); setShowFrameGraph(true); }}>
                                                <div className="menu-icon">📈</div>
                                                <div>
                                                    <div className="menu-label-blue">프레임별 위조 의심도 그래프</div>
                                                    <div className="menu-sub">타임라인 & 히트맵 영상 보기</div>
                                                </div>
                                            </div>
                                            <div className="menu-divider" />
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); navigate("/history"); }}>
                                                <div className="menu-icon" style={{ background: "#f0fdf4" }}>🕑</div>
                                                <div>
                                                    <div className="menu-label-gray">분석 히스토리</div>
                                                    <div className="menu-sub">이전 분석 결과 보기</div>
                                                </div>
                                            </div>
                                            <div className="menu-divider" />
                                            <div className="menu-item" onClick={() => { setMenuOpen(false); onDownloadPdf(); }}>
                                                <div className="menu-icon" style={{ background: "#fef9ec" }}>📄</div>
                                                <div>
                                                    <div className="menu-label-gray">PDF 다운로드</div>
                                                    <div className="menu-sub">리포트를 PDF로 저장</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 1) 요약 + 정보 그리드 ── */}
                    <div className="result-grid">
                        <div className="card video-card">
                            <div className="card-head">
                                <h3>의심스러운 인물 영상</h3>
                                <span className="badge warn">주의 필요</span>
                            </div>
                            <div className="video-preview">
                                <div className="vp-dummy">영상 미리보기</div>
                            </div>

                            {/* 영상 메타 정보 */}
                            {/* <div className="video-meta-box">
                                <div className="meta-row">
                                    <span className="meta-label">닉네임</span>
                                    <span className="meta-val">{videoMeta.nickname}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">날짜</span>
                                    <span className="meta-val">{videoMeta.date}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">링크</span>
                                    <span className="meta-val">{videoMeta.link}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">열람</span>
                                    <span className="meta-val">{Number(videoMeta.views).toLocaleString()}회</span>
                                </div>
                            </div> */}

                            {/* AI 판정 배너 */}
                            <div className={`verdict-banner ${isAiGenerated ? "danger" : "safe"}`}>
                                <div className="verdict-icon">{isAiGenerated ? "⚠️" : "✅"}</div>
                                <div className="verdict-text">
                                    <div className="verdict-title">
                                        {isAiGenerated ? "이 영상은 AI 영상입니다." : "이 영상은 AI 영상이 아닙니다."}
                                    </div>
                                    <div className="verdict-desc">
                                        {isAiGenerated
                                            ? `AI 생성·조작 가능성이 높아 위변조가 의심됩니다.`
                                            : `판별 정확도 ${trustScore}%로 정상 영상으로 판단됩니다.`}
                                    </div>
                                </div>
                                <div className="verdict-pill">{trustScore}%</div>
                            </div>
                        </div>

                        <div className="side-col">
                            <div className="card">
                                <h4 className="mini-title">판별 정확도</h4>
                                <div className="trust">
                                    <div className="trust-num">{trustScore}%</div>
                                    <div className="trust-sub">이 분석 결과의 신뢰도</div>
                                </div>
                            </div>
                            <div className="card">
                                <h4 className="mini-title">영상 정보</h4>
                                <ul className="info-list">
                                    <li><span>분석 시간</span><b>{analysisData.analysis_time ?? "14.2초"}</b></li>
                                    <li><span>영상 길이</span><b>{analysisData.video_duration ?? "2분 34초"}</b></li>
                                    <li><span>해상도</span><b>{analysisData.resolution ?? "1920×1080"}</b></li>
                                    <li><span>프레임 레이트</span><b>{analysisData.frame_rate ?? "30fps"}</b></li>
                                    <li><span>파일 크기</span><b>{analysisData.file_size ?? "245MB"}</b></li>
                                </ul>
                            </div>
                            <div className="card">
                                <h4 className="mini-title">사용된 모델</h4>
                                <div className="chips">
                                    <span className="chip">Vision Transformer</span>
                                    <span className="chip">ResNet-50</span>
                                    <span className="chip">XceptionNet</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 2) 프레임별 위조 의심도 그래프 (인라인) ── */}
                    <div className="card section-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                            <div>
                                <h3 className="section-title" style={{ marginBottom: 4 }}>프레임별 위조 의심도 그래프</h3>
                                <p className="hint" style={{ marginTop: 0 }}>총 {analysisData.timeline_chart.length}개 프레임 분석</p>
                            </div>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                                    <em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#E24B4A", fontStyle: "normal" }} />높음 (70%+)
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                                    <em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#EF9F27", fontStyle: "normal" }} />중간 (50–69%)
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                                    <em style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#378ADD", fontStyle: "normal" }} />낮음 (50% 미만)
                                </span>
                            </div>
                        </div>
                        <div style={{ position: "relative", width: "100%", height: 220 }}>
                            <canvas ref={inlineChartRef} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>평균 위조 확률</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: 0 }}>{inlineFrameStats.avg}%</p>
                            </div>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>최고 의심 프레임</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: "#E24B4A", margin: 0 }}>Frame {inlineFrameStats.peakIdx}</p>
                            </div>
                            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px" }}>위험 구간 수</p>
                                <p style={{ fontSize: 20, fontWeight: 600, color: "#E24B4A", margin: 0 }}>{inlineFrameStats.dangerCount}구간</p>
                            </div>
                        </div>
                    </div>

                    {/* ── 3) 상세 분석 결과 (JSON detailed_analysis 기반) ── */}
                    <div className="card section-card">
                        <h3 className="section-title">상세 분석 결과</h3>

                        {/* 공개 항목 */}
                        {publicItems.map((item, i) => (
                            <div className="detail-item" key={`pub-${i}`}>
                                <div className="d-left">
                                    <div className="d-title">
                                        {item.title}{" "}
                                        <span className={`tag ${riskTag(item.risk_level)}`}>위험도: {item.risk_level}</span>
                                    </div>
                                    <div className="d-desc">{item.description}</div>
                                </div>
                                <div className="d-right">
                                    <div className="d-percent">{item.score_percent}%</div>
                                    <div className="d-sub">신뢰도</div>
                                </div>
                                <div className={`d-bar ${riskTag(item.risk_level)}`}>
                                    <span style={{ width: `${item.score_percent}%` }} />
                                </div>
                            </div>
                        ))}

                        {/* Pro 전용 항목 — 블러 + 잠금 오버레이 */}
                        {proItems.length > 0 && (
                            <div className="pro-items-wrapper">
                                <div className={isPro ? "" : "pro-items-blur"}>
                                    {proItems.map((item, i) => (
                                        <div className="detail-item" key={`pro-${i}`}>
                                            <div className="d-left">
                                                <div className="d-title">
                                                    {item.title}{" "}
                                                    <span className={`tag ${riskTag(item.risk_level)}`}>위험도: {item.risk_level}</span>
                                                </div>
                                                <div className="d-desc">{item.description}</div>
                                            </div>
                                            <div className="d-right">
                                                <div className="d-percent">{item.score_percent}%</div>
                                                <div className="d-sub">신뢰도</div>
                                            </div>
                                            <div className={`d-bar ${riskTag(item.risk_level)}`}>
                                                <span style={{ width: `${item.score_percent}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {!isPro && (
                                    <div className="pro-lock-overlay">
                                        <div className="pro-lock-icon">🔒</div>
                                        <div className="pro-lock-title">Pro 전용 분석 항목</div>
                                        <div className="pro-lock-desc">
                                            얼굴 경계 왜곡, 조명 일관성, 텍스처 분석 결과는<br />Pro 구독 후 확인 가능합니다.
                                        </div>
                                        <button
                                            className="pro-lock-btn"
                                            onClick={() => alert("Pro 업그레이드 페이지로 이동합니다.")}
                                        >
                                            Pro 구독하기
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* PDF 다운로드 영역 (인쇄 숨김용) */}
                    <div className="pdf-area" />

                </section>
            </div>
        </div>
    );
}
