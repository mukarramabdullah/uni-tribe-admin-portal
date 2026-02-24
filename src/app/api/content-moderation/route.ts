import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
);

interface ContentModerationRequest {
  topic: string; // e.g., "lostnfound", "event", "academic", etc.
  content: string;
  title?: string;
  imageUrl?: string;
}

interface ModerationResponse {
  isAuthentic: boolean;
  confidenceScore: number;
  reason: string;
  flags?: string[];
  hateSpeechDetected?: boolean;
  hateSpeechReason?: string;
  imageAnalysis?: {
    isAppropriate: boolean;
    isRelevant: boolean;
    description: string;
    confidence: number;
  };
}

/**
 * Rule-based hate speech detection (fallback when API is unavailable)
 * Checks for common hate speech patterns and inappropriate content
 * Supports multiple languages including Hindi, Spanish, Arabic, etc.
 */
function detectHateSpeechRuleBased(
  content: string,
  title?: string,
): { isHateSpeech: boolean; reason?: string; flags: string[] } {
  const fullText = (title ? `${title} ${content}` : content).toLowerCase();
  const flags: string[] = [];

  // Comprehensive profanity list (including variations and leetspeak)
  const profanityWords = [
    // English - Strong profanity
    "fuck",
    "fucking",
    "fucked",
    "fucker",
    "fucks",
    "shit",
    "shitting",
    "shitted",
    "shits",
    "bitch",
    "bitches",
    "bitching",
    "ass",
    "asses",
    "asshole",
    "assholes",
    "damn",
    "damned",
    "dammit",
    "hell",
    "hells",
    "crap",
    "craps",

    // English - Sexual/explicit
    "cock",
    "cocks",
    "dick",
    "dicks",
    "penis",
    "penises",
    "pussy",
    "pussies",
    "vagina",
    "vaginas",
    "cunt",
    "cunts",
    "whore",
    "whores",
    "slut",
    "sluts",
    "prostitute",
    "sex",
    "sexual",
    "porn",
    "porno",
    "pornography",
    "masturbat",
    "orgasm",
    "ejaculat",

    // Hindi/Urdu abuse words (transliterated)
    "madarchod",
    "madarchod",
    "maderchod",
    "madarchodh",
    "behenchod",
    "behenchhod",
    "behenchot",
    "behenchodh",
    "bhosdike",
    "bhosdike",
    "bhosdika",
    "bhosdikey",
    "chutiya",
    "chutia",
    "chutiye",
    "chutiyaa",
    "lund",
    "loda",
    "lode",
    "loda",
    "gandu",
    "gand",
    "gandu",
    "randi",
    "rand",
    "randi",
    "kutte",
    "kutta",
    "kuttey",
    "harami",
    "haramzada",
    "haramzade",
    "sale",
    "saale",
    "saala",
    "chakke",
    "chakka",
    "chakkey",
    "hijra",
    "hijre",
    "bhenchod",
    "bhenchhod",
    "maa ki",
    "maa ka",
    "maa ke",
    "teri maa",
    "teri maa ki",
    "bhosdi",
    "bhosdike",
    "bhosdika",
    "chut",
    "choot",
    "chootiya",
    "gaand",
    "gand",
    "gaandu",
    "lund",
    "loda",
    "lode",

    // Spanish abuse words
    "puta",
    "puto",
    "putas",
    "putos",
    "joder",
    "jodido",
    "jodida",
    "coño",
    "coño",
    "coños",
    "cabron",
    "cabrón",
    "cabrones",
    "maricon",
    "maricón",
    "maricones",
    "hijo de puta",
    "hijos de puta",
    "chinga",
    "chingado",
    "chingada",
    "pinche",
    "pinches",
    "mamada",
    "mamadas",
    "verga",
    "vergas",

    // Arabic abuse words (transliterated)
    "ibn",
    "ibn al",
    "ibn el",
    "kos",
    "kos omak",
    "kos omak",
    "sharmoota",
    "sharmuta",
    "sharmoot",
    "ahbal",
    "ahbalah",
    "kelb",
    "kalb",
    "kalb",
    "harami",
    "haram",
    "ya ibn",
    "ya kalb",

    // French abuse words
    "putain",
    "putain de",
    "putains",
    "merde",
    "merdes",
    "salope",
    "salopes",
    "connard",
    "connards",
    "connasse",
    "enculé",
    "enculer",
    "enculés",
    "bite",
    "bites",
    "foutre",
    "foutre",

    // German abuse words
    "scheisse",
    "scheiße",
    "scheiss",
    "arschloch",
    "arsch",
    "arschlöcher",
    "fotze",
    "fotzen",
    "hurensohn",
    "hure",
    "huren",
    "schwuchtel",
    "schwul",
    "verpiss",
    "verpiss dich",

    // Russian abuse words (transliterated)
    "blyat",
    "blat",
    "blyad",
    "blyat",
    "suka",
    "suka",
    "suki",
    "pizda",
    "pizdec",
    "pizdet",
    "ebat",
    "ebat",
    "ebat",
    "hui",
    "huy",
    "huilo",
    "mudak",
    "mudaki",
    "gandon",
    "gandon",

    // Chinese abuse words (transliterated)
    "cao",
    "cao ni ma",
    "cao",
    "sb",
    "sha bi",
    "shabi",
    "ma de",
    "made",
    "ri",
    "ri ni ma",

    // Japanese abuse words (transliterated)
    "kuso",
    "kuso",
    "baka",
    "bakayaro",
    "chikusho",
    "chikushou",
    "yarou",
    "yaro",

    // Portuguese abuse words
    "puta",
    "puto",
    "putas",
    "putos",
    "caralho",
    "caralhos",
    "foder",
    "fodido",
    "fodida",
    "filho da puta",
    "filhos da puta",
    "vai se foder",
    "vai tomar no cu",
    "porra",
    "porras",
    "merda",
    "merdas",

    // Italian abuse words
    "puttana",
    "puttane",
    "puttaniere",
    "cazzo",
    "cazzi",
    "merda",
    "merde",
    "frocio",
    "froci",
    "stronzo",
    "stronzi",
    "vaffanculo",
    "vaffanculo",

    // Turkish abuse words (transliterated)
    "orospu",
    "orospu çocuğu",
    "sik",
    "sikmek",
    "sikik",
    "amk",
    "amk",
    "piç",
    "piçler",
    "göt",
    "götler",

    // Leetspeak variations (English)
    "f[u@]ck",
    "f[u@]cking",
    "sh[i1]t",
    "b[i1]tch",
    "c[o0]ck",
    "d[i1]ck",
    "p[u@]ssy",
    "c[u@]nt",
    "wh[o0]re",
    "sl[u@]t",
    "f*ck",
    "f**k",
    "sh*t",
    "b*tch",
    "a**",
    "a**hole",

    // Offensive slurs (English)
    "nigger",
    "nigga",
    "n[i1]gg[ae]r",
    "n[i1]gga",
    "faggot",
    "fag",
    "f[a@]gg[o0]t",
    "retard",
    "retarded",
    "r[e3]t[a@]rd",
    "kike",
    "k[i1]ke",
    "chink",
    "ch[i1]nk",
    "spic",
    "sp[i1]c",
    "wetback",
    "w[e3]tback",
    "terrorist",
    "t[e3]rror[i1]st",
    "jihad",
    "j[i1]h[a@]d",
  ];

  // Hate speech patterns
  const hateSpeechPatterns = [
    /\b(kill\s+(all|everyone|them|you)|die\s+(all|everyone|them|you)|exterminate|genocide|ethnic\s+cleansing)\b/gi,
    /\b(you\s+should\s+die|you\s+deserve\s+to\s+die|death\s+to|kill\s+yourself|kys)\b/gi,
  ];

  // Threat patterns
  const threatPatterns = [
    /\b(i\s+will\s+(kill|hurt|attack|destroy|harm|beat|punch|stab|shoot)|i\s+(will|am\s+going\s+to)\s+get\s+you|i\s+hope\s+you\s+die)\b/gi,
    /\b(threat|threatening|violence|violent|attack|assault|murder|kill)\b/gi,
  ];

  // Check for profanity first (most common)
  for (const word of profanityWords) {
    // Create pattern that matches word boundaries and common variations
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedWord}\\w*\\b`, "gi");

    if (pattern.test(fullText)) {
      flags.push("profanity");
      return {
        isHateSpeech: true,
        reason: `Contains profanity or inappropriate language (detected: ${word})`,
        flags: ["profanity", "inappropriate_content"],
      };
    }
  }

  // Check for hate speech
  for (const pattern of hateSpeechPatterns) {
    if (pattern.test(fullText)) {
      flags.push("hate_speech");
      return {
        isHateSpeech: true,
        reason: "Contains hate speech or discriminatory language",
        flags: ["hate_speech", "abusive_content"],
      };
    }
  }

  // Check for threats
  for (const pattern of threatPatterns) {
    if (pattern.test(fullText)) {
      flags.push("threats");
      return {
        isHateSpeech: true,
        reason: "Contains threats or violent language",
        flags: ["threats", "violent_content"],
      };
    }
  }

  return {
    isHateSpeech: false,
    flags,
  };
}

/**
 * Use Gemini AI for image analysis
 */
async function analyzeImageWithGemini(
  imageUrl: string,
  title: string,
  content: string,
  topic: string,
): Promise<{
  isAppropriate: boolean;
  isRelevant: boolean;
  description: string;
  confidence: number;
  reason?: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare image for Gemini (assuming base64)
    // base64 strings come as "data:image/png;base64,XXXXX"
    const base64Data = imageUrl.split(",")[1] || imageUrl;
    const mimeType = imageUrl.split(";")[0].split(":")[1] || "image/jpeg";

    const prompt = `
      Analyze this image for a university portal post.
      Post Title: ${title}
      Post Content: ${content}
      Post Category: ${topic}

      Please evaluate the image with a lenient, inclusive approach:
      1. Is it appropriate for a university environment? Only flag clear gore, violence, or explicit content.
      2. Is it relevant to the post title and content? Allow reasonable interpretation; only flag when clearly unrelated.
      3. Does it look authentic/real for its context? When in doubt, prefer isAppropriate and isRelevant as true.

      Respond in the following JSON format:
      {
        "isAppropriate": boolean,
        "isRelevant": boolean,
        "description": "brief description of what's in the image",
        "confidence": number (0-100),
        "reason": "explanation for the rating"
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (Gemini sometimes wraps in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("Failed to parse Gemini response");
  } catch (error) {
    console.error("Gemini image analysis error:", error);
    return {
      isAppropriate: true, // Fallback to true if AI fails
      isRelevant: true,
      description: "Image analysis unavailable",
      confidence: 50,
      reason: "Could not perform AI image analysis",
    };
  }
}

/**
 * Use Hugging Face Inference API (free tier) for content moderation
 * Falls back to rule-based detection if API fails
 * ALWAYS runs rule-based check first for immediate detection
 */
async function moderateWithHuggingFace(
  content: string,
  title?: string,
): Promise<{ isHateSpeech: boolean; reason?: string; flags: string[] }> {
  // ALWAYS run rule-based check first (fastest and most reliable for profanity)
  const ruleBasedResult = detectHateSpeechRuleBased(content, title);
  if (ruleBasedResult.isHateSpeech) {
    return ruleBasedResult;
  }

  const fullText = title ? `${title}\n\n${content}` : content;

  try {
    // Use Hugging Face's free Inference API for multilingual toxicity detection
    let response;
    let modelUsed = "cardiffnlp/twitter-roberta-base-offensive";

    try {
      response = await fetch(
        `https://api-inference.huggingface.co/models/${modelUsed}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: fullText }),
        },
      );

      if (!response.ok) {
        throw new Error(`Model ${modelUsed} failed`);
      }
    } catch (error) {
      // Fallback to toxic-bert if multilingual model fails
      console.warn(`Multilingual model failed, trying toxic-bert:`, error);
      modelUsed = "unitary/toxic-bert";
      response = await fetch(
        `https://api-inference.huggingface.co/models/${modelUsed}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: fullText }),
        },
      );
    }

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const result = await response.json();

    // Handle array response format
    const predictions = Array.isArray(result) ? result[0] : result;

    // Check if any toxic label has high probability (>0.5 for less strict detection)
    const TOXICITY_THRESHOLD = 0.5;
    if (predictions && Array.isArray(predictions)) {
      // Handle different model response formats
      const toxicLabels = [
        "toxic",
        "severe_toxic",
        "obscene",
        "threat",
        "insult",
        "identity_hate",
        "offensive",
        "abusive",
        "hate",
        "hateful",
        "harassment",
        "profanity",
      ];
      const flags: string[] = [];
      let maxScore = 0;
      let detectedLabel = "";

      for (const pred of predictions) {
        const label = (pred.label || pred[0] || "").toLowerCase();
        const score = pred.score || pred[1] || 0;

        // Check if it's a toxic label
        if (toxicLabels.some((tl) => label.includes(tl) || label === tl)) {
          if (score > maxScore) {
            maxScore = score;
            detectedLabel = label;
          }
          if (score > TOXICITY_THRESHOLD) {
            flags.push(label.replace(/_/g, "_"));
          }
        }

        // Also check for LABEL_0, LABEL_1 format (some models use this)
        if (label.includes("label") && score > TOXICITY_THRESHOLD) {
          flags.push("toxic_content");
          maxScore = Math.max(maxScore, score);
        }
      }

      // Reject only when toxicity confidence is above threshold (50%)
      if (maxScore > TOXICITY_THRESHOLD) {
        return {
          isHateSpeech: true,
          reason: `Detected ${detectedLabel || "toxic"} content (confidence: ${Math.round(maxScore * 100)}%)`,
          flags: flags.length > 0 ? flags : ["toxic_content"],
        };
      }
    }

    return {
      isHateSpeech: false,
      flags: [],
    };
  } catch (error) {
    console.warn("Hugging Face API failed, using rule-based detection:", error);
    // Fallback to rule-based detection (already checked above, but return it)
    return ruleBasedResult;
  }
}

/**
 * Check if content is appropriate for university platform
 */
function checkUniversityAppropriateness(
  topic: string,
  content: string,
  title?: string,
): ModerationResponse {
  const fullText = (title ? `${title} ${content}` : content).toLowerCase();
  const flags: string[] = [];
  let confidenceScore = 100;

  // Spam indicators
  const spamPatterns = [
    /\b(buy\s+now|click\s+here|limited\s+time|act\s+now|free\s+money|make\s+money\s+fast|guaranteed\s+income)\b/gi,
    /(http[s]?:\/\/[^\s]+){2,}/gi, // Multiple URLs
    /(www\.[^\s]+){2,}/gi, // Multiple www links
  ];

  // Check for spam
  for (const pattern of spamPatterns) {
    if (pattern.test(fullText)) {
      flags.push("spam");
      confidenceScore -= 30;
    }
  }

  // Check content length (too short might be spam) - lenient minimum
  if (content.trim().length < 5) {
    flags.push("too_short");
    confidenceScore -= 15;
  }

  // Check if content is relevant to topic
  const topicLower = topic.toLowerCase();
  let isRelevant = true;

  if (topicLower.includes("lost") || topicLower.includes("found")) {
    const relevantKeywords = [
      "found",
      "lost",
      "item",
      "backpack",
      "phone",
      "wallet",
      "keys",
      "library",
      "campus",
      "contact",
    ];
    isRelevant = relevantKeywords.some((keyword) => fullText.includes(keyword));
  } else if (topicLower.includes("event")) {
    const relevantKeywords = [
      "event",
      "meeting",
      "conference",
      "workshop",
      "date",
      "time",
      "location",
      "join",
      "attend",
    ];
    isRelevant = relevantKeywords.some((keyword) => fullText.includes(keyword));
  } else if (topicLower.includes("academic")) {
    const relevantKeywords = [
      "resource",
      "study",
      "course",
      "material",
      "notes",
      "textbook",
      "academic",
      "education",
    ];
    isRelevant = relevantKeywords.some((keyword) => fullText.includes(keyword));
  }

  if (!isRelevant) {
    flags.push("not_relevant");
    confidenceScore -= 20;
  }

  // Less strict: allow content with score >= 45 and at most one minor flag
  const isAuthentic =
    confidenceScore >= 45 &&
    (flags.length === 0 || (flags.length === 1 && flags[0] === "not_relevant"));

  let reason = "";
  if (!isAuthentic) {
    if (flags.includes("spam")) {
      reason = "Content appears to be spam or promotional material";
    } else if (flags.includes("not_relevant")) {
      reason = "Content is not relevant to the selected topic";
    } else if (flags.includes("too_short")) {
      reason = "Content is too short to be meaningful";
    } else {
      reason = "Content does not meet university platform standards";
    }
  } else {
    reason =
      "Content appears authentic and appropriate for university platform";
  }

  return {
    isAuthentic,
    confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
    reason,
    flags: flags.length > 0 ? flags : undefined,
  };
}

/**
 * Combined content moderation check
 */
async function moderateContent(
  topic: string,
  content: string,
  title?: string,
  imageUrl?: string,
): Promise<ModerationResponse> {
  const hateSpeechResult = await moderateWithHuggingFace(content, title);
  const universityCheck = checkUniversityAppropriateness(topic, content, title);

  let imageResult = null;
  if (imageUrl && imageUrl.startsWith("data:image")) {
    imageResult = await analyzeImageWithGemini(
      imageUrl,
      title || "",
      content,
      topic,
    );
  }

  // Combine results
  const isAuthentic =
    !hateSpeechResult.isHateSpeech &&
    universityCheck.isAuthentic &&
    (!imageResult || (imageResult.isAppropriate && imageResult.isRelevant));

  const finalResult: ModerationResponse = {
    isAuthentic,
    confidenceScore: hateSpeechResult.isHateSpeech
      ? 0
      : universityCheck.confidenceScore,
    reason: hateSpeechResult.isHateSpeech
      ? `Content rejected: ${hateSpeechResult.reason}`
      : imageResult && (!imageResult.isAppropriate || !imageResult.isRelevant)
        ? `Image issues detected: ${imageResult.reason}`
        : universityCheck.reason,
    flags: [
      ...(hateSpeechResult.isHateSpeech ? hateSpeechResult.flags : []),
      ...(universityCheck.flags || []),
      ...(imageResult && !imageResult.isAppropriate
        ? ["inappropriate_image"]
        : []),
      ...(imageResult && !imageResult.isRelevant ? ["irrelevant_image"] : []),
    ],
    hateSpeechDetected: hateSpeechResult.isHateSpeech,
    hateSpeechReason: hateSpeechResult.reason,
    imageAnalysis: imageResult
      ? {
          isAppropriate: imageResult.isAppropriate,
          isRelevant: imageResult.isRelevant,
          description: imageResult.description,
          confidence: imageResult.confidence,
        }
      : undefined,
  };

  return finalResult;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContentModerationRequest = await request.json();
    const { topic, content, title, imageUrl } = body;

    if (!topic || !content) {
      return NextResponse.json(
        { error: "Missing required fields: topic and content are required" },
        { status: 400 },
      );
    }

    const moderationResult = await moderateContent(
      topic,
      content,
      title,
      imageUrl,
    );

    return NextResponse.json(moderationResult, { status: 200 });
  } catch (error) {
    console.error("Content moderation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during content moderation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to get topic-specific context (currently unused but kept for future use)
function _getTopicContext(topic: string): string {
  const topicLower = topic.toLowerCase();

  if (
    topicLower.includes("lost") ||
    topicLower.includes("found") ||
    topicLower === "lostnfound"
  ) {
    return `
Lost & Found Guidelines:
- Must describe a real, physical item that could be lost or found on campus
- Should include clear description of the item (color, brand, size, location found)
- Must not be a scam or attempt to sell inappropriate items
- Should be helpful to the university community
- Must not contain personal information that violates privacy
`;
  }

  if (topicLower.includes("event") || topicLower === "events") {
    return `
Event Guidelines:
- Must describe a legitimate university or student organization event
- Should include event details (date, time, location, purpose)
- Must be appropriate for university community
- Should not promote illegal activities or inappropriate gatherings
- Must not be spam or misleading information
`;
  }

  if (topicLower.includes("academic") || topicLower.includes("resource")) {
    return `
Academic Resource Guidelines:
- Must be educational and relevant to university coursework
- Should be appropriate for academic use
- Must not violate copyright or intellectual property
- Should be helpful to students' academic progress
- Must not contain inappropriate or offensive material
`;
  }

  // Default context for other topics
  return `
General University Content Guidelines:
- Content must be relevant to university activities and student life
- Must be appropriate, professional, and respectful
- Should contribute positively to the university community
- Must comply with all university policies and community standards
`;
}
