// src/pages/GalleryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchGalleryMockDetails } from "../services/api";

export default function GalleryPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [analysis] = useState(location.state?.analysis || null);
    const [details, setDetails] = useState([]);
    const [previewSrc] = useState(location.state?.previewSrc || location.state?.analysis?.thumbnail || "");

    const aiScore = Math.round(analysis?.confidenceScore ?? 87);
    const trustScore = 94;

    useEffect(() => {
        let active = true;

        const loadMockDetails = async () => {
            try {
                const nextDetails = await fetchGalleryMockDetails();
                if (!active) return;
                setDetails(nextDetails);
            } catch (error) {
                if (!active) return;
                setDetails([]);
            }
        };

        loadMockDetails();

        return () => {
            active = false;
        };
    }, []);

    const scoreLabel = useMemo(() => {
        if (aiScore >= 80) return "매우 높음";
        if (aiScore >= 60) return "높음";
        if (aiScore >= 40) return "중간";
        return "낮음";
    }, [aiScore]);

    const videoTitle = location.state?.displayTitle || analysis?.title || "의심스러운 인물 영상";
    const visibleDetails = details.slice(0, 4);

    return (
        <div id="main">
            <div className="wrap">
                <section id="resultPage" className="result-page">
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
                                <h3>{videoTitle}</h3>
                                <span className="badge warn">주의 필요</span>
                            </div>

                            <div className="video-preview">
                                {previewSrc ? (
                                    <img className="gallery-preview-image" alt="업로드한 미리보기" src={previewSrc} />
                                ) : (
                                    <div className="vp-dummy">영상 미리보기</div>
                                )}
                            </div>

                            <div className="score-row">
                                <div>
                                    <div className="score-label">AI 생성 가능성</div>
                                    <div className="score-bar">
                                        <div className="score-fill" style={{ width: `${aiScore}%` }} />
                                    </div>
                                    <div className="score-desc">AI 생성/조작 가능성이 높게 감지되었습니다.</div>
                                </div>
                                <div className="score-num">
                                    <div className="big">{aiScore}%</div>
                                    <div className="small">{scoreLabel}</div>
                                </div>
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
                                    <li>
                                        <span>분석 시간</span>
                                        <b>14.2초</b>
                                    </li>
                                    <li>
                                        <span>영상 길이</span>
                                        <b>{analysis?.duration || "2분 34초"}</b>
                                    </li>
                                    <li>
                                        <span>해상도</span>
                                        <b>1920×1080</b>
                                    </li>
                                    <li>
                                        <span>프레임 레이트</span>
                                        <b>30fps</b>
                                    </li>
                                    <li>
                                        <span>파일 크기</span>
                                        <b>245MB</b>
                                    </li>
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

                    {/* 3) 타임라인 */}
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

                    {/* 4) 상세 분석 */}
                    <div className="card section-card">
                        <h3 className="section-title">상세 분석 결과</h3>

                        {visibleDetails.map((detail) => (
                            <div className="detail-item" key={detail.key}>
                                <div className="d-left">
                                    <div className="d-title">
                                        {detail.title} <span className={`tag ${detail.tag.className}`}>{detail.tag.label}</span>
                                    </div>
                                    <div className="d-desc">{detail.description}</div>
                                </div>
                                <div className="d-right">
                                    <div className="d-percent">{Math.round(detail.score)}%</div>
                                    <div className="d-sub">신뢰도</div>
                                </div>
                                <div
                                    className={`d-bar ${detail.tag.className === "mid" ? "mid" : detail.tag.className === "low" ? "low" : ""}`}
                                >
                                    <span style={{ width: `${Math.round(detail.score)}%` }} />
                                </div>
                            </div>
                        ))}

                        <div className="detail-item">
                            <div className="d-left">
                                <div className="d-title">
                                    텍스처 분석 <span className="tag low">위험도: 낮음</span>
                                </div>
                                <div className="d-desc">피부 질감 생성 패턴의 미세한 규칙성 감지</div>
                            </div>
                            <div className="d-right">
                                <div className="d-percent">61%</div>
                                <div className="d-sub">신뢰도</div>
                            </div>
                            <div className="d-bar low">
                                <span style={{ width: "61%" }} />
                            </div>
                        </div>
                    </div>

                    {/* 5) PDF 다운로드 */}
                    <div className="pdf-area">
                        <a className="pdf-btn" href="/report.pdf" download>
                            분석 리포트 PDF 다운로드
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}
