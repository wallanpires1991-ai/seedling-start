// Female pt-BR voice for Rebeca's WhatsApp replies. Server-only.
const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICE = "Kore"; // female prebuilt voice

export async function synthesizeVoice(text: string): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || !text.trim()) return null;
  const spoken = text.replace(/[*_~`]/g, "").replace(/\p{Extended_Pictographic}/gu, "").slice(0, 1200);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: `Fale em português do Brasil, com voz feminina, simpática, calorosa e natural, como uma atendente de restaurante no WhatsApp: ${spoken}` }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      stream_format: "audio",
    }),
  });
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(bin)}`;
}
