const normalizeBaseUrl = (base) => {
    if (!base) return "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
};

const resolveBaseUrl = () => {
    const envBase = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
    if (envBase) return envBase;
    if (typeof window !== "undefined" && window.location?.origin) {
        return normalizeBaseUrl(window.location.origin);
    }
    return "";
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const parseJson = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const request = async (path, options = {}) => {
    const response = await fetch(buildUrl(path), options);
    const payload = await parseJson(response);

    if (!response.ok) {
        const message = payload?.message || `요청이 실패했습니다. (HTTP ${response.status})`;
        throw new Error(message);
    }

    if (payload && payload.success === false) {
        throw new Error(payload.message || "요청을 처리하지 못했습니다.");
    }

    return payload;
};

export const fetchYoutubeInfo = async (url) => {
    const trimmed = url?.trim();
    if (!trimmed) {
        throw new Error("URL을 입력해주세요.");
    }

    const payload = await request("/youtube/info", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmed }),
    });

    if (!payload?.data) {
        throw new Error("유효한 데이터를 받지 못했습니다.");
    }

    return payload.data;
};

export const checkApiKey = async () => {
    const payload = await request("/test-key", { method: "GET" });
    return payload?.message;
};
