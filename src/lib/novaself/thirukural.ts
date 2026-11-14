export interface Thirukural {
  number: number;
  sectionTa: string;
  chapterTa: string;
  line1: string;
  line2: string;
  meaningTa: string;
  detailedMeaningTa: string;
  meaningEn: string;
  detailedMeaningEn: string;
}

export const THIRUKURALS: Thirukural[] = [
  {
    number: 1,
    sectionTa: "அறத்துப்பால்",
    chapterTa: "கடவுள் வாழ்த்து",
    line1: "அகர முதல எழுத்தெல்லாம் ஆதி",
    line2: "பகவன் முதற்றே உலகு.",
    meaningTa: "எழுத்துக்கள் எல்லாம் அகரத்தை அடிப்படையாகக் கொண்டிருக்கின்றன; அதுபோல உலகம் கடவுளை அடிப்படையாகக் கொண்டுள்ளது.",
    detailedMeaningTa: "எப்படி பிரபஞ்சத்தின் அனைத்து எழுத்துக்களுக்கும் தொடக்கமாய் 'அ' என்ற எழுத்து இருக்கிறதோ, அதேபோல் இந்த பரந்த உலகத்திற்கும் முதற்கடவுளே அடிப்படையான ஆதாரமாக இருக்கிறான்.",
    meaningEn: "As 'A' is the first of all letters, so the eternal God is first in the world.",
    detailedMeaningEn: "Just as the letter 'A' is the origin and base of all letters in the alphabet, the supreme Creator is the primal origin of the entire universe.",
  },
  {
    number: 31,
    sectionTa: "அறத்துப்பால்",
    chapterTa: "சிறப்பு நீத்தார்",
    line1: "செயற்கரிய செய்வார் பெரியர் சிறியர்",
    line2: "செயற்கரிய செய்கலா தார்.",
    meaningTa: "செய்ய முடியாதரிய செயல்களைச் செய்து முடிப்பவரே பெரியோர்; செய்ய முடியாதவர்கள் சிறியோர்.",
    detailedMeaningTa: "மற்றவர்களால் நினைத்துக் பார்க்க முடியாத கடினமான, உயர்ந்த செயல்களை முயன்று சாதிப்பவரே பெரிய மனிதர்கள் ஆவர். அத்தகைய முயற்சியும் திறனும் இல்லாதவர் சிறியோர்.",
    meaningEn: "The great are those who can achieve the impossible; the mean are those who cannot.",
    detailedMeaningEn: "Those who possess the steadfast willpower and capability to accomplish extraordinarily difficult tasks are great souls. Those who lack this resolve remain small-minded.",
  },
  {
    number: 391,
    sectionTa: "பொருட்பால்",
    chapterTa: "கல்வி",
    line1: "கற்க கசடறக் கற்பவை கற்றபின்",
    line2: "நிற்க அதற்குத் தக.",
    meaningTa: "கல்விகளைக் குற்றம்றக் கற்க வேண்டும்; கற்றபின் கற்ற கல்விக்கேற்ப நடந்து கொள்ள வேண்டும்.",
    detailedMeaningTa: "கற்க வேண்டிய நூல்களைத் தவறு இல்லாமல் குற்றமறக் கற்க வேண்டும். அப்படி முழுமையாகக் கற்றபின், அக்கல்விக்கு ஏற்ப நற்பண்புகளுடன் வாழ வேண்டும்.",
    meaningEn: "Learn thoroughly what ought to be learned, and then live up to what you have learned.",
    detailedMeaningEn: "Acquire knowledge flawlessly without any ambiguity. Once learned, conduct your life with the dignity and wisdom imparted by that education.",
  },
  {
    number: 591,
    sectionTa: "பொருட்பால்",
    chapterTa: "ஊக்கம் உடைமை",
    line1: "உள்ளம் உடைமை உடைமை பொருளுடைமை",
    line2: "நில்லாது நீங்கி விடும்.",
    meaningTa: "ஊக்கமே உண்மையான செல்வம்; மற்றப் பொருட்கள் எல்லாம் நிலையாமல் நீங்கிப் போய்விடும்.",
    meaningEn: "Willpower is true wealth; all other material possessions will vanish and pass away.",
    detailedMeaningEn: "Having an unfaltering, enthusiastic mindset (willpower) is true wealth. All other material possessions are transient and will eventually leave you.",
  },
  {
    number: 1021,
    sectionTa: "பொருட்பால்",
    chapterTa: "ஒப்புரவறிதல்",
    line1: "கைம்மாறு வேண்டா கடப்பாடு மாரிமா",
    line2: "மண்மாற்று என்னு உலகு.",
    meaningTa: "எவ்வித கைம்மாறும் எதிர்பாராமல் உதவி செய்வதே சால்புடையாரின் கடமையாகும்.",
    detailedMeaningTa: "உலகிற்கு மழையானது எவ்வித கைம்மாறும் எதிர்பாராமல் நீரை வழங்குவது போல, உயர்ந்த மனிதர்கள் பிறருக்குச் செய்யும் உதவியும் எந்த எதிர்பார்ப்பும் அற்றது.",
    meaningEn: "What does the world give in return to the rain cloud? Duty demands goodness without expecting return.",
    detailedMeaningEn: "True benevolence seeks no reward. Like the rain cloud that nourishes the earth unconditionally, noble individuals serve humanity without expecting anything in return.",
  },
];

export function getDailyThirukural(): Thirukural {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return THIRUKURALS[dayIndex % THIRUKURALS.length];
}

export async function fetchAIThirukural(provider: string, apiKey: string, model: string, ollamaUrl: string): Promise<Thirukural> {
  const todayKey = `novaself.thirukural.${new Date().toISOString().slice(0, 10)}`;
  const cached = localStorage.getItem(todayKey);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const prompt = "Give me 1 classic Thirukural in Tamil script (number, sectionTa, chapterTa, line1, line2, meaningTa, detailedMeaningTa, meaningEn, detailedMeaningEn). Return ONLY valid JSON format with keys: number, sectionTa, chapterTa, line1, line2, meaningTa, detailedMeaningTa, meaningEn, detailedMeaningEn.";

  try {
    let text = "";
    if (provider === "gemini" && apiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey.trim()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === "openai" && apiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || "";
    } else if (ollamaUrl) {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3", prompt, stream: false }),
      });
      const data = await res.json();
      text = data.response || "";
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result: Thirukural = {
        number: Number(parsed.number) || 1,
        sectionTa: String(parsed.sectionTa || "அறத்துப்பால்"),
        chapterTa: String(parsed.chapterTa || "அதிகாரம்"),
        line1: String(parsed.line1 || ""),
        line2: String(parsed.line2 || ""),
        meaningTa: String(parsed.meaningTa || ""),
        detailedMeaningTa: String(parsed.detailedMeaningTa || parsed.meaningTa || ""),
        meaningEn: String(parsed.meaningEn || ""),
        detailedMeaningEn: String(parsed.detailedMeaningEn || parsed.meaningEn || ""),
      };
      localStorage.setItem(todayKey, JSON.stringify(result));
      return result;
    }
  } catch (e) {
    console.error("[thirukural ai fetch error]", e);
  }

  return getDailyThirukural();
}
