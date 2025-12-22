export const handler = async (event) => {
    // CORS 헤더 설정 (모든 도메인 허용 예시, 실제 운영시에는 특정 도메인으로 제한 권장)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    };

    // Preflight 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        const { animalA, animalB } = body;

        // 환경 변수에서 API 키 로드
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Server Misconfiguration: GEMINI_API_KEY is missing.");
        }

        const prompt = `
        두 동물의 가상 전투를 분석해주세요:
        1. ${animalA.name} (${animalA.desc})
        2. ${animalB.name} (${animalB.desc})
        
        다음 JSON 형식으로만 응답해주세요 (마크다운 없이 순수 JSON만 반환):
        {
            "winner": "${animalA.name}" 또는 "${animalB.name}",
            "winRateA": (첫번째 동물 승률 숫자 0~100),
            "reason": "한 문장으로 된 승리 요인 설명"
        }
        `;

        // Google Gemini API 호출
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            console.error("Gemini API Error:", JSON.stringify(data));
            throw new Error("Failed to generate content from AI.");
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonText);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error("Lambda Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                winner: 'error', 
                reason: "서버에서 AI 분석 중 오류가 발생했습니다.",
                details: error.message 
            })
        };
    }
};
