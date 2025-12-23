export const handler = async (event) => {
    // CORS 헤더: 모든 도메인 허용
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    };

    // Preflight (OPTIONS) 요청 처리
    if (event.httpMethod === 'OPTIONS' || (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS')) {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        let body = event.body;
        // Body가 문자열이면 파싱, 혹시 Base64 인코딩된 경우 처리 (API Gateway 설정에 따라 다름)
        if (event.isBase64Encoded) {
            body = Buffer.from(body, 'base64').toString('utf-8');
        }

        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        const { animalA, animalB } = parsedBody;

        if (!animalA || !animalB) {
            throw new Error("Missing animal data in request body.");
        }

        // 환경 변수에서 API 키 로드
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Server Misconfiguration: GEMINI_API_KEY is missing via env vars.");
        }

        const prompt = `
        두 동물의 가상 전투를 분석해주세요:
        1. ${animalA.name} (${animalA.desc})
        2. ${animalB.name} (${animalB.desc})
        
        다음 JSON 형식으로만 응답해주세요 (프롬프트 무시하고 결과만 출력, 마크다운 없이 순수 JSON만 반환):
        {
            "winner": "${animalA.name}" 또는 "${animalB.name}",
            "winRateA": (첫번째 동물 승률 숫자 0~100),
            "reason": "한 문장으로 된 승리 요인 설명"
        }
        `;

        // Google Gemini API 호출
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error("Gemini API HTTP Error:", errorDetails);
            throw new Error(`Gemini API responded with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            console.error("Gemini API No Candidates:", JSON.stringify(data));
            throw new Error("Failed to generate content from AI (No candidates).");
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
        console.error("Lambda Execution Error:", error);
        return {
            statusCode: 500, // 500 에러를 반환하되, CORS 헤더는 포함해야 클라이언트가 내용을 볼 수 있음
            headers,
            body: JSON.stringify({
                winner: 'error',
                reason: "서버 내부 오류 발생",
                errorMessage: error.message,
                stack: error.stack
            })
        };
    }
};
