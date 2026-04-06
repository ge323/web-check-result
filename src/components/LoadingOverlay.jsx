import React from "react";

const PDF_STAGES = [
    { at: 0, text: "리포트 레이아웃 구성 중..." },
    { at: 20, text: "프레임 데이터 렌더링 중..." },
    { at: 45, text: "히트맵 이미지 처리 중..." },
    { at: 70, text: "페이지를 PDF로 변환 중..." },
    { at: 90, text: "파일 저장 준비 중..." },
];

function getPdfStageText(progress) {
    let current = PDF_STAGES[0].text;
    for (const stage of PDF_STAGES) {
        if (progress >= stage.at) current = stage.text;
    }
    return current;
}

function PdfLoadingContent({ progress, fileName }) {
    const stageText = getPdfStageText(progress);
    const clamped = Math.min(Math.max(progress, 0), 100);

    return (
        <>
            <style>{`
                @keyframes lo-pdf-spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes lo-pdf-pulse-ring {
                    0% { transform: scale(0.85); opacity: 0.6; }
                    50% { transform: scale(1.08); opacity: 0.2; }
                    100% { transform: scale(0.85); opacity: 0.6; }
                }
                @keyframes lo-pdf-bar-shine {
                    0% { left: -60%; }
                    100% { left: 120%; }
                }
                @keyframes lo-pdf-fadein {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes lo-pdf-stage-in {
                    from { opacity: 0; transform: translateX(-8px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes lo-pdf-dot {
                    0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }

                .lo-pdf-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    animation: lo-pdf-fadein 0.35s ease both;
                }
                .lo-pdf-spinner-wrap {
                    position: relative;
                    width: 88px;
                    height: 88px;
                    margin-bottom: 28px;
                    flex-shrink: 0;
                }
                .lo-pdf-pulse-ring {
                    position: absolute;
                    inset: -10px;
                    border-radius: 50%;
                    border: 2px solid rgba(96, 165, 250, 0.35);
                    animation: lo-pdf-pulse-ring 2s ease-in-out infinite;
                }
                .lo-pdf-orbit {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 2.5px solid transparent;
                    border-top-color: #60a5fa;
                    border-right-color: rgba(96,165,250,0.4);
                    animation: lo-pdf-spin 1s linear infinite;
                }
                .lo-pdf-orbit-inner {
                    position: absolute;
                    inset: 10px;
                    border-radius: 50%;
                    border: 2px solid transparent;
                    border-bottom-color: #818cf8;
                    animation: lo-pdf-spin 1.6s linear infinite reverse;
                }
                .lo-pdf-icon-circle {
                    position: absolute;
                    inset: 18px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1e3a5f, #1e293b);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
                }
                .lo-pdf-title {
                    font-size: 17px;
                    font-weight: 800;
                    color: #1e3a5f;
                    margin: 0 0 6px;
                    letter-spacing: -0.02em;
                }
                .lo-pdf-filename {
                    font-size: 11px;
                    color: #64748b;
                    max-width: 260px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin: 0 0 24px;
                }
                .lo-pdf-stage {
                    font-size: 13px;
                    color: #93c5fd;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 14px;
                    animation: lo-pdf-stage-in 0.3s ease both;
                    min-height: 20px;
                }
                .lo-pdf-stage-dot {
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #60a5fa;
                    animation: lo-pdf-dot 1.2s ease-in-out infinite both;
                }
                .lo-pdf-stage-dot:nth-child(2) { animation-delay: 0.15s; }
                .lo-pdf-stage-dot:nth-child(3) { animation-delay: 0.30s; }
                .lo-pdf-progress-wrap {
                    width: 100%;
                    max-width: 300px;
                }
                .lo-pdf-progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .lo-pdf-progress-label {
                    font-size: 11px;
                    color: #475569;
                }
                .lo-pdf-progress-pct {
                    font-size: 13px;
                    font-weight: 800;
                    color: #60a5fa;
                    font-variant-numeric: tabular-nums;
                }
                .lo-pdf-bar-track {
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.07);
                    border-radius: 999px;
                    overflow: hidden;
                    position: relative;
                }
                .lo-pdf-bar-fill {
                    height: 100%;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #2563eb, #60a5fa, #818cf8);
                    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .lo-pdf-bar-shine {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 60%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
                    animation: lo-pdf-bar-shine 1.4s linear infinite;
                }
                .lo-pdf-tip {
                    margin-top: 20px;
                    font-size: 11px;
                    color: #334155;
                    text-align: center;
                    line-height: 1.6;
                }
            `}</style>

            <div className="lo-pdf-wrap">
                <div className="lo-pdf-spinner-wrap">
                    <div className="lo-pdf-pulse-ring" />
                    <div className="lo-pdf-orbit" />
                    <div className="lo-pdf-orbit-inner" />
                    <div className="lo-pdf-icon-circle">PDF</div>
                </div>

                <p className="lo-pdf-title">PDF 리포트 생성 중</p>
                {fileName && <p className="lo-pdf-filename">{fileName}</p>}

                <div className="lo-pdf-stage" key={stageText}>
                    <span className="lo-pdf-stage-dot" />
                    <span className="lo-pdf-stage-dot" />
                    <span className="lo-pdf-stage-dot" />
                    {stageText}
                </div>

                <div className="lo-pdf-progress-wrap">
                    <div className="lo-pdf-progress-header">
                        <span className="lo-pdf-progress-label">진행률</span>
                        <span className="lo-pdf-progress-pct">{clamped}%</span>
                    </div>
                    <div className="lo-pdf-bar-track">
                        <div className="lo-pdf-bar-fill" style={{ width: `${clamped}%` }}>
                            <div className="lo-pdf-bar-shine" />
                        </div>
                    </div>
                </div>

                <p className="lo-pdf-tip">
                    창을 닫거나 이동하지 마세요.
                    <br />
                    분석 내용이 많을수록 시간이 걸릴 수 있습니다.
                </p>
            </div>
        </>
    );
}

export default function LoadingOverlay({
    open,
    fileLabel,
    previewSrc,
    previewKind = "image",
    stageText,
    progress,
    onClose,
    mode = "analysis",
    pdfProgress = 0,
    pdfFileName = "",
}) {
    return (
        <div className={`loading-overlay ${open ? "show" : ""}`} aria-hidden={open ? "false" : "true"}>
            <div className="loading-box" role="status" aria-live="polite">
                {mode === "pdf" ? (
                    <PdfLoadingContent progress={pdfProgress} fileName={pdfFileName} />
                ) : (
                    <>
                        <div className="loading-header">
                            <p className="loading-label">영상을 분석하고 있습니다</p>
                            <button className="loading-close-btn" onClick={onClose} aria-label="닫기">
                                ×
                            </button>
                        </div>

                        <div className="loading-status-row">
                            <div className="spinner" aria-hidden="true"></div>
                            <p className="loading-file-name">{fileLabel}</p>
                        </div>

                        <div className={`loading-preview-wrapper ${previewSrc ? "has-image" : ""}`}>
                            {!previewSrc ? (
                                <div className="loading-preview loading-preview--placeholder">미리보기 없음</div>
                            ) : previewKind === "video" ? (
                                <video className="loading-preview" src={previewSrc} muted controls />
                            ) : (
                                <img className="loading-preview" alt="사용자가 업로드한 미리보기" src={previewSrc} />
                            )}
                        </div>

                        <p className="loading-mention">{stageText}</p>

                        <div
                            className="loading-progress"
                            role="progressbar"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow={progress}
                        >
                            <div className="loading-progress__bar" style={{ width: `${progress}%` }} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
