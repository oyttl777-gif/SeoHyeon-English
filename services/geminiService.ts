
import { GoogleGenAI, Type } from "@google/genai";

// 환경 변수(process.env.API_KEY)를 우선 사용하되, 
// 직접 테스트할 때는 "YOUR_API_KEY_HERE" 부분에 키를 넣을 수 있습니다.
const API_KEY = process.env.API_KEY || "YOUR_API_KEY_HERE";

export const scoreTest = async (
  originalWord: string,
  originalMeaning: string,
  userSpelling: string,
  userMeaning: string
) => {
  // 호출할 때마다 새로운 인스턴스를 생성하여 최신 키 상태를 유지합니다.
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
    당신은 중학생의 영어 단어 테스트를 채점하는 친절한 AI 선생님입니다.
    
    [채점 기준]
    1. 영어 스펠링: 대소문자 구분 없이 글자가 정확히 일치해야 합니다. (완벽 일치 필수)
    2. 의미(뜻): 입력된 뜻이 원래의 뜻과 유의어이거나 문맥상 같은 의미라면 정답으로 처리합니다.
       - 예: 원래 뜻이 '뛰다'인데 학생이 '달리다'라고 적으면 정답(isCorrect: true)입니다.
       - 예: 원래 뜻이 '행복한'인데 학생이 '기쁜'이라고 적으면 정답입니다.

    [대상 데이터]
    - 목표 단어: "${originalWord}"
    - 목표 의미: "${originalMeaning}"
    - 학생이 쓴 스펠링: "${userSpelling}"
    - 학생이 쓴 의미: "${userMeaning}"

    결과는 반드시 아래의 JSON 형식으로만 답변하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING, description: "정답 여부에 따른 짧고 격려 섞인 한국어 피드백" }
          },
          required: ["isCorrect", "feedback"]
        }
      }
    });

    let resultText = response.text || "";
    // 혹시 모를 마크다운 기호 제거
    resultText = resultText.replace(/```json|```/g, "").trim();
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("AI Scoring Error:", error);
    // AI 오류 시 수동 채점 로직 (백업)
    const spellingMatch = originalWord.toLowerCase().trim() === userSpelling.toLowerCase().trim();
    const meaningMatch = originalMeaning.trim() === userMeaning.trim();
    return {
      isCorrect: spellingMatch && (meaningMatch || userMeaning.length > 0),
      feedback: spellingMatch ? "스펠링은 맞았어요! 뜻은 선생님이 다시 확인해 볼게요." : "스펠링이 틀렸어요. 정답을 다시 확인해 보세요!"
    };
  }
};
