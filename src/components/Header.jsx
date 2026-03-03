import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // 드로어 열리면 스크롤 잠금 + ESC 닫기
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

        const onKeyDown = (e) => {
            if (e.key === "Escape") setMobileMenuOpen(false);
        };

        if (mobileMenuOpen) window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileMenuOpen]);

    // NavLink active 클래스 커스텀(선택)
    const navClass = ({ isActive }) => (isActive ? "menu-link active" : "menu-link");

    return (
        <header id="header">
            <div className="wrap">
                <div className="header-top">
                    <div className="logo">
                        <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>
                            <img src="" alt="no image" />
                        </NavLink>
                    </div>

                    {/* ✅ 데스크탑 상단 메뉴(기존 유지) */}
                    <ul className="menus">
                        <li>
                            <NavLink to="/" className={navClass}>홈</NavLink>
                        </li>
                        <li>
                            <NavLink to="/intro" className={navClass}>소개</NavLink>
                        </li>
                        <li>
                            <NavLink to="/gallery" className={navClass}>AI 갤러리</NavLink>
                        </li>
                        <li>
                            <NavLink to="/history" className={navClass}>히스토리</NavLink>
                        </li>
                        <li>
                            <NavLink to="/login" className={navClass}>로그인</NavLink>
                        </li>
                        <li>
                            <NavLink to="/join" className={navClass}>회원가입</NavLink>
                        </li>
                    </ul>

                    {/* ✅ 오른쪽 영역: 언어 + 모바일 햄버거 */}
                    <div className="right">
                        <select name="language" id="language">
                            <option value="한국어">한국어</option>
                            <option value="영어">영어</option>
                            <option value="일본어">일본어</option>
                        </select>

                        {/* ✅ 모바일에서만 보이게 CSS로 제어 */}
                        <button
                            type="button"
                            className="hamburger"
                            aria-label="메뉴 열기"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ dim overlay (메뉴 열렸을 때만 클릭 가능) */}
            <div
                className={`mobile-dim ${mobileMenuOpen ? "show" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* ✅ 우측 드로어 */}
            <nav className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`} aria-label="모바일 메뉴">
                <div className="drawer-head">
                    <p className="drawer-title">메뉴</p>
                    <button
                        type="button"
                        className="drawer-close"
                        aria-label="메뉴 닫기"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <ul className="drawer-menus">
                    <li>
                        <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            홈
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/intro" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            소개
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/gallery" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            AI 갤러리
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/history" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            히스토리
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            로그인
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/join" onClick={() => setMobileMenuOpen(false)} className={navClass}>
                            회원가입
                        </NavLink>
                    </li>
                </ul>

                {/* ✅ 드로어 안에서 언어 선택도 가능하게(원하면 제거 가능) */}
                <div className="drawer-lang">
                    <p className="drawer-lang-title">언어</p>
                    <select name="language_mobile" id="language_mobile">
                        <option value="한국어">한국어</option>
                        <option value="영어">영어</option>
                        <option value="일본어">일본어</option>
                    </select>
                </div>
            </nav>
        </header>
    );
}