export async function testAIConnection(provider: string, apiKey: string, model: string): Promise<{ success: boolean; message: string }> {
  const key = apiKey.trim();
  if (!key) return { success: false, message: "API key is empty." };

  if (provider === "gemini") {
    try {
      if (key.startsWith("AQ.")) {
        const projectId = "19346249448";
        const location = "us-central1";
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-flash-latest:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Hello" }] }] }),
        });
        const data = await res.json();
        if (res.ok) {
          return { success: true, message: "Success! Vertex AI OAuth token is valid and working." };
        } else {
          return {
            success: false,
            message: data.error?.message || `Vertex AI Auth Error (Status ${res.status}). Note: gcloud OAuth tokens expire every 60 minutes. Please generate a fresh token using 'gcloud auth print-access-token' or use a free Gemini API key (AIzaSy...) from aistudio.google.com`,
          };
        }
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] }),
        });
        const data = await res.json();
        if (res.ok) {
          return { success: true, message: "Success! Gemini API key is valid and working." };
        } else {
          return { success: false, message: data.error?.message || `Gemini API Error (Status ${res.status})` };
        }
      }
    } catch (e) {
      return { success: false, message: `Network/CORS error: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  if (provider === "openai") {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { success: true, message: "Success! OpenAI API key is valid." };
      } else {
        const data = await res.json();
        return { success: false, message: data.error?.message || `OpenAI Error (Status ${res.status})` };
      }
    } catch (e) {
      return { success: false, message: `Error: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  return { success: false, message: "Unknown provider." };
}
