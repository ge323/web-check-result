// src/pages/GalleryPage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function GalleryPage() {
    const navigate = useNavigate();

    const [aiScore] = useState(87);
    const [trustScore] = useState(94);

    const isAiGenerated = aiScore >= 50;

    const scoreLabel = useMemo(() => {
        if (aiScore >= 80) return "매우 높음";
        if (aiScore >= 60) return "높음";
        if (aiScore >= 40) return "중간";
        return "낮음";
    }, [aiScore]);

    // ✅ 차트 관련
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const reportRef = useRef(null);

    const frameData = {
        frames: [
            { time: "0:00", score: 12 }, { time: "0:05", score: 18 },
            { time: "0:10", score: 22 }, { time: "0:15", score: 45 },
            { time: "0:20", score: 67 }, { time: "0:25", score: 82 },
            { time: "0:30", score: 91 }, { time: "0:35", score: 88 },
            { time: "0:40", score: 75 }, { time: "0:45", score: 60 },
            { time: "0:50", score: 43 }, { time: "0:55", score: 55 },
            { time: "1:00", score: 72 }, { time: "1:05", score: 85 },
            { time: "1:10", score: 94 }, { time: "1:15", score: 78 },
            { time: "1:20", score: 52 }, { time: "1:25", score: 38 },
            { time: "1:30", score: 20 }, { time: "1:35", score: 15 },
            { time: "1:40", score: 30 }, { time: "1:45", score: 58 },
            { time: "1:50", score: 76 }, { time: "1:55", score: 89 },
            { time: "2:00", score: 95 }, { time: "2:05", score: 87 },
            { time: "2:10", score: 63 }, { time: "2:15", score: 41 },
            { time: "2:20", score: 25 }, { time: "2:25", score: 10 },
            { time: "2:30", score: 14 }, { time: "2:34", score: 8 },
        ]
    };

    const frameStats = useMemo(() => {
        const scores = frameData.frames.map(f => f.score);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const peak = Math.max(...scores);
        const peakTime = frameData.frames[scores.indexOf(peak)].time;
        const dangerCount = scores.filter(s => s >= 70).length;
        return { avg, peak, peakTime, dangerCount };
    }, []);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
        script.onload = () => {
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext("2d");
            const scores = frameData.frames.map(f => f.score);
            const labels = frameData.frames.map(f => f.time);
            const pointColors = scores.map(s =>
                s >= 70 ? "#E24B4A" : s >= 50 ? "#EF9F27" : "#378ADD"
            );
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, "rgba(55,138,221,0.18)");
            gradient.addColorStop(1, "rgba(55,138,221,0.01)");

            chartInstance.current = new window.Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        data: scores,
                        borderColor: "#378ADD",
                        borderWidth: 2,
                        pointBackgroundColor: pointColors,
                        pointBorderColor: pointColors,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.35,
                        fill: true,
                        backgroundColor: gradient,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` 의심도: ${ctx.parsed.y}%`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 11 }, color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
                            grid: { display: false }
                        },
                        y: {
                            min: 0, max: 100,
                            ticks: { font: { size: 11 }, color: "#888", callback: v => v + "%" },
                            grid: { color: "rgba(136,136,136,0.12)" }
                        }
                    }
                }
            });
        };
        document.body.appendChild(script);
        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, []);
    const onDownloadPdf = async () => {
        // ✅ PDF 버튼 숨기기
        const pdfArea = document.querySelector(".pdf-area");
        if (pdfArea) pdfArea.style.display = "none";

        // ✅ 머릿말 추가
        const now = new Date();
        const timeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const header = document.createElement("div");
        header.id = "pdf-header";
        header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0 14px;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 16px;
        font-size: 13px;
        color: #6b7280;
    `;
        header.innerHTML = `
        <span>${timeStr}</span>
        <span style="font-weight:700; color:#111;">분석 결과 PDF</span>
    `;
        reportRef.current.prepend(header);

        const canvas = await html2canvas(reportRef.current, {
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1200,
            windowHeight: reportRef.current.scrollHeight,
        });

        // ✅ 캡처 후 원상복구
        if (pdfArea) pdfArea.style.display = "";
        document.getElementById("pdf-header")?.remove();

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const margin = 12;
        const contentWidth = pdfWidth - margin * 2;
        const scale = contentWidth / canvas.width;
        const totalHeightMm = canvas.height * scale;

        const chartCard = chartRef.current?.closest(".section-card");
        const sectionTop = reportRef.current.getBoundingClientRect().top;
        const chartCardTopPx = chartCard
            ? (chartCard.getBoundingClientRect().top - sectionTop) * 2
            : null;
        const chartCardTopMm = chartCardTopPx ? chartCardTopPx * scale : null;
        const chartCardHeightMm = chartCard
            ? chartCard.offsetHeight * 2 * scale
            : null;

        const imgData = canvas.toDataURL("image/png");
        let pageStart = 0;
        let isFirst = true;

        while (pageStart < totalHeightMm) {
            if (!isFirst) pdf.addPage();

            let pageEnd = pageStart + pdfHeight;

            if (chartCardTopMm && chartCardHeightMm) {
                if (
                    chartCardTopMm > pageStart &&
                    chartCardTopMm < pageEnd &&
                    chartCardTopMm + chartCardHeightMm > pageEnd
                ) {
                    pageEnd = chartCardTopMm - 4;
                }
            }

            const sliceStartPx = pageStart / scale;
            const sliceHeightPx = (pageEnd - pageStart) / scale;

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - sliceStartPx);

            const sliceCtx = sliceCanvas.getContext("2d");
            sliceCtx.drawImage(
                canvas,
                0, sliceStartPx,
                canvas.width, sliceCanvas.height,
                0, 0,
                canvas.width, sliceCanvas.height
            );

            const sliceHeightMm = sliceCanvas.height * scale;
            pdf.addImage(
                sliceCanvas.toDataURL("image/png"),
                "PNG",
                margin, margin,
                contentWidth, sliceHeightMm
            );

            pageStart = pageEnd;
            isFirst = false;
        }

        pdf.save(`${timeStr.replace(/[.: ]/g, "_")}_분석결과.pdf`);
    };

    return (
        <div id="main">
            <style>{`
                .verdict-banner {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    border-radius: 14px;
                    padding: 18px 22px;
                    margin-top: 18px;
                    font-family: inherit;
                    position: relative;
                    overflow: hidden;
                    animation: verdictIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes verdictIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .verdict-banner.danger {
                    background: linear-gradient(135deg, #fff1f1 0%, #ffe4e4 100%);
                    border: 1.5px solid #f87171;
                    box-shadow: 0 4px 18px rgba(239, 68, 68, 0.12);
                }
                .verdict-banner.safe {
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border: 1.5px solid #4ade80;
                    box-shadow: 0 4px 18px rgba(74, 222, 128, 0.12);
                }
                .verdict-icon {
                    flex-shrink: 0;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                }
                .verdict-banner.danger .verdict-icon { background: #fee2e2; }
                .verdict-banner.safe .verdict-icon   { background: #bbf7d0; }
                .verdict-text { flex: 1; }
                .verdict-title {
                    font-size: 15px;
                    font-weight: 700;
                    line-height: 1.3;
                    margin-bottom: 3px;
                }
                .verdict-banner.danger .verdict-title { color: #b91c1c; }
                .verdict-banner.safe .verdict-title   { color: #15803d; }
                .verdict-desc { font-size: 12px; line-height: 1.5; color: #6b7280; }
                .verdict-pill {
                    flex-shrink: 0;
                    padding: 6px 13px;
                    border-radius: 999px;
                    font-size: 13px;
                    font-weight: 700;
                }
                .verdict-banner.danger .verdict-pill { background: #fecaca; color: #991b1b; }
                .verdict-banner.safe .verdict-pill   { background: #bbf7d0; color: #166534; }
                .verdict-banner::before {
                    content: "";
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    width: 5px;
                    border-radius: 14px 0 0 14px;
                }
                .verdict-banner.danger::before { background: #ef4444; }
                .verdict-banner.safe::before   { background: #22c55e; }

                /* ✅ 타임라인 그래프 카드 */
                .timeline-card { display: flex; flex-direction: column; gap: 16px; }
                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .timeline-legend {
                    display: flex;
                    gap: 14px;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .timeline-legend span {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 12px;
                    color: #6b7280;
                }
                .timeline-legend em {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                    font-style: normal;
                }
                .timeline-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-top: 4px;
                }
                .tstat-box {
                    background: #f9fafb;
                    border-radius: 10px;
                    padding: 12px;
                    text-align: center;
                }
                .tstat-label { font-size: 11px; color: #9ca3af; margin: 0 0 4px; }
                .tstat-value { font-size: 20px; font-weight: 600; color: #111827; margin: 0; }
                .tstat-value.danger { color: #E24B4A; }
            `}</style>

            <div className="wrap">
                <section id="resultPage" className="result-page" ref={reportRef}>

                    {/* 상단 헤더 */}
                    <div className="result-top">
                        <div className="rt-left">
                            <h2 className="rt-title">분석 결과 리포트</h2>
                            <p className="rt-sub">업로드한 영상의 위변조/AI 생성 의심 구간을 종합 분석했습니다.</p>
                        </div>
                        <div className="rt-right">
                            <button
                                type="button"
                                className="ghost-pill"
                                id="backToHomeBtn"
                                onClick={() => navigate("/")}
                            >
                                메인으로 돌아가기
                            </button>
                        </div>
                    </div>

                    {/* 1) 요약 + 정보 */}
                    <div className="result-grid">
                        <div className="card video-card">
                            <div className="card-head">
                                <h3>의심스러운 인물 영상</h3>
                                <span className="badge warn">주의 필요</span>
                            </div>
                            <div className="video-preview">
                                <div className="vp-dummy">영상 미리보기</div>
                            </div>
                            <div className={`verdict-banner ${isAiGenerated ? "danger" : "safe"}`}>
                                <div className="verdict-icon">{isAiGenerated ? "⚠️" : "✅"}</div>
                                <div className="verdict-text">
                                    <div className="verdict-title">
                                        {isAiGenerated ? "이 영상은 AI 영상입니다." : "이 영상은 AI 영상이 아닙니다."}
                                    </div>
                                    <div className="verdict-desc">
                                        {isAiGenerated
                                            ? `AI 생성·조작 가능성 ${aiScore}%로 위변조가 의심됩니다.`
                                            : `AI 생성·조작 가능성 ${aiScore}%로 정상 영상으로 판단됩니다.`}
                                    </div>
                                </div>
                                <div className="verdict-pill">{aiScore}%</div>
                            </div>
                        </div>

                        <div className="side-col">
                            <div className="card">
                                <h4 className="mini-title">분석 신뢰도</h4>
                                <div className="trust">
                                    <div className="trust-num">{trustScore}%</div>
                                    <div className="trust-sub">이 분석 결과의 신뢰도</div>
                                </div>
                            </div>
                            <div className="card">
                                <h4 className="mini-title">분석 정보</h4>
                                <ul className="info-list">
                                    <li><span>분석 시간</span><b>14.2초</b></li>
                                    <li><span>영상 길이</span><b>2분 34초</b></li>
                                    <li><span>해상도</span><b>1920×1080</b></li>
                                    <li><span>프레임 레이트</span><b>30fps</b></li>
                                    <li><span>파일 크기</span><b>245MB</b></li>
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

                    {/* 2) 기존 타임라인 */}
                    <div className="card section-card">
                        <h3 className="section-title">프레임별 위조 의심도 타임라인</h3>
                        <div className="timeline-dummy">
                            <div className="bar red" style={{ width: "22%" }} />
                            <div className="bar blue" style={{ width: "18%" }} />
                            <div className="bar red" style={{ width: "30%" }} />
                            <div className="bar blue" style={{ width: "15%" }} />
                            <div className="bar red" style={{ width: "15%" }} />
                        </div>
                        <p className="hint">빨강: 높음(70%+) · 노랑: 중간(50~69%) · 파랑: 낮음(50% 미만)</p>
                    </div>

                    {/* ✅ 3) 꺾은선 그래프 - 타임라인 바로 아래 */}
                    <div className="card section-card timeline-card">
                        <div className="timeline-header">
                            <div>
                                <h3 className="section-title" style={{ marginBottom: 4 }}>프레임별 위조 의심도 그래프</h3>
                                <p className="hint" style={{ marginTop: 0 }}>총 {frameData.frames.length}개 프레임 · 30fps</p>
                            </div>
                            <div className="timeline-legend">
                                <span><em style={{ background: "#E24B4A" }} />높음 (70%+)</span>
                                <span><em style={{ background: "#EF9F27" }} />중간 (50–69%)</span>
                                <span><em style={{ background: "#378ADD" }} />낮음 (50% 미만)</span>
                            </div>
                        </div>
                        <div style={{ position: "relative", width: "100%", height: 220 }}>
                            <canvas ref={chartRef} />
                        </div>
                        <div className="timeline-stats">
                            <div className="tstat-box">
                                <p className="tstat-label">평균 의심도</p>
                                <p className="tstat-value">{frameStats.avg}%</p>
                            </div>
                            <div className="tstat-box">
                                <p className="tstat-label">최고 의심 구간</p>
                                <p className="tstat-value danger">{frameStats.peakTime}</p>
                            </div>
                            <div className="tstat-box">
                                <p className="tstat-label">위험 구간 수</p>
                                <p className="tstat-value danger">{frameStats.dangerCount}구간</p>
                            </div>
                        </div>
                    </div>

                    {/* 4) 상세 분석 */}
                    <div className="card section-card">
                        <h3 className="section-title">상세 분석 결과</h3>
                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">눈 깜빡임 패턴 <span className="tag high">위험도: 높음</span></div>
                                <div className="d-desc">0.8~1.2초 구간에서 비정상적으로 높은 깜빡임 빈도 감지</div>
                            </div>
                            <div className="d-right"><div className="d-percent">92%</div><div className="d-sub">신뢰도</div></div>
                            <div className="d-bar"><span style={{ width: "92%" }} /></div>
                        </div>
                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">입 모양·음성 동기화 <span className="tag high">위험도: 높음</span></div>
                                <div className="d-desc">음성과 입 모양 간 평균 0.18초 지연 발생</div>
                            </div>
                            <div className="d-right"><div className="d-percent">87%</div><div className="d-sub">신뢰도</div></div>
                            <div className="d-bar"><span style={{ width: "87%" }} /></div>
                        </div>
                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">얼굴 경계 왜곡 <span className="tag mid">위험도: 중간</span></div>
                                <div className="d-desc">헤어라인/윤곽부 픽셀 불연속성 다수 발견</div>
                            </div>
                            <div className="d-right"><div className="d-percent">74%</div><div className="d-sub">신뢰도</div></div>
                            <div className="d-bar mid"><span style={{ width: "74%" }} /></div>
                        </div>
                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">조명 일관성 <span className="tag mid">위험도: 중간</span></div>
                                <div className="d-desc">얼굴 좌우 조명 방향 불일치(3.2s ~ 4.1s)</div>
                            </div>
                            <div className="d-right"><div className="d-percent">68%</div><div className="d-sub">신뢰도</div></div>
                            <div className="d-bar mid"><span style={{ width: "68%" }} /></div>
                        </div>
                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">텍스처 분석 <span className="tag low">위험도: 낮음</span></div>
                                <div className="d-desc">피부 질감 생성 패턴의 미세한 규칙성 감지</div>
                            </div>
                            <div className="d-right"><div className="d-percent">61%</div><div className="d-sub">신뢰도</div></div>
                            <div className="d-bar low"><span style={{ width: "61%" }} /></div>
                        </div>
                    </div>

                    {/* 5) PDF 다운로드 */}
                    <div className="pdf-area">
                        <button className="pdf-btn" onClick={onDownloadPdf}>
                            분석 리포트 PDF 다운로드
                        </button>
                    </div>

                </section>
            </div>
        </div>
    );
}