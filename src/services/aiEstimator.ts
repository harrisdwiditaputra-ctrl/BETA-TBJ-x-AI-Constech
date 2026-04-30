import { AIEstimateResponse } from "../types";

export async function getAIEstimation(userProblem: string, category: string, masterData?: any[], userRole: string = 'user', globalMarkup: number = 20): Promise<AIEstimateResponse> {
  try {
    const response = await fetch("/api/ai-estimation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userProblem,
        category,
        masterData,
        userRole,
        globalMarkup,
      }),
    });

    if (!response.ok) {
      let errorMsg = "Gagal menghubungi server AI";
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        errorMsg = await response.text() || errorMsg;
      }
      throw new Error(errorMsg);
    }

    try {
      return await response.json();
    } catch (e) {
      const text = await response.text();
      console.error("Failed to parse AI estimation response as JSON:", text);
      throw new Error("Hasil analisa AI tidak valid. Silakan coba lagi.");
    }
  } catch (error: any) {
    console.error("AI Estimation Service Error:", error);
    throw new Error(error.message || "Gagal melakukan Analisa AI (Server Error)");
  }
}
