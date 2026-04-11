const output = document.getElementById("output");
const imgEl = document.getElementById("dishImage");
const cookBtn = document.getElementById("cook");
const worseBtn = document.getElementById("worse");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
//Worker URL - replace with your own if self-hosting or using a different service
const WORKER_URL = "https://cooked-serverside.wangz9096z.workers.dev";

let lastDish = "";
const MIN_RECIPE_STEPS = 8;
const MAX_RECIPE_CONTINUATIONS = 2;

const BASE_PROMPT = `
Invent a completely original fictional dish.
Real ingredients only.
Fake but edible-sounding components.
Cursed but bizarre name.
Write a complete full-length recipe, not a short summary.
Use this exact structure:
Dish Name
Short pitch
Servings + prep time + cook time
Ingredients list (one per line)
Step-by-step method (at least 8 clear steps)
Fake nutrition stats
Chef warning
Explain preparation and fake stats in detail.
Unhinged but coherent.
Output plain text only.
No markdown or code blocks.
Make it sound as appetizing as possible while being very wrong and inedible.
Also make it like an actually possible recipe that someone could attempt if they were very reckless and didn't care about the consequences.
`;
//Halo
async function generateDish(prompt) {
  let recipe = "";
  let nextPrompt = prompt;

  for (let attempt = 0; attempt <= MAX_RECIPE_CONTINUATIONS; attempt++) {
    const { text, finishReason } = await requestDishCompletion(nextPrompt);
    recipe = mergeRecipeText(recipe, text);

    const needsContinuation = finishReason === "length" || isRecipeLikelyIncomplete(recipe);
    if (!needsContinuation) {
      return recipe;
    }

    if (attempt === MAX_RECIPE_CONTINUATIONS) {
      return recipe;
    }

    nextPrompt = buildContinuationPrompt(recipe);
  }

  return recipe;
}

async function requestDishCompletion(prompt) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3-32b",
      messages: [
        { role: "system", content: "You are a chaotic experimental chef AI." },
        { role: "user", content: prompt }
      ],
      temperature: 1.1,
      max_tokens: 1100
    })
  });

  const data = await readJsonResponse(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Request failed (${res.status})`);
  }

  const content = extractModelText(data);
  if (!content) {
    throw new Error("No recipe text returned by model");
  }

  return {
    text: toPlainText(content),
    finishReason: data?.choices?.[0]?.finish_reason || data?.finish_reason || ""
  };
}

function buildContinuationPrompt(currentRecipe) {
  return [
    "Continue this exact recipe from where it stops.",
    "Only output the missing remainder.",
    "Do not restart or repeat previous sections.",
    "If the steps are incomplete, continue from the next step number.",
    "Output plain text only.",
    "",
    currentRecipe
  ].join("\n");
}

function isRecipeLikelyIncomplete(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return true;

  const stepCount = countRecipeSteps(cleaned);
  if (stepCount < MIN_RECIPE_STEPS) return true;

  // Heuristic for obvious truncation at the tail.
  return /[:,;\-]$/.test(cleaned);
}

function countRecipeSteps(text) {
  const matches = String(text).match(/^\s*(?:step\s*)?\d{1,2}[).:-]\s+/gim);
  return matches ? matches.length : 0;
}

function mergeRecipeText(existing, addition) {
  const left = String(existing || "").trim();
  const right = String(addition || "").trim();

  if (!left) return right;
  if (!right) return left;
  if (left.includes(right)) return left;
  if (right.includes(left)) return right;

  const leftLines = left.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rightLines = right.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const maxOverlap = Math.min(12, leftLines.length, rightLines.length);

  let overlap = 0;
  for (let size = maxOverlap; size >= 1; size--) {
    const leftTail = leftLines.slice(-size).join("\n");
    const rightHead = rightLines.slice(0, size).join("\n");
    if (leftTail === rightHead) {
      overlap = size;
      break;
    }
  }

  const uniqueRight = overlap > 0 ? rightLines.slice(overlap).join("\n") : right;
  return uniqueRight ? `${left}\n${uniqueRight}` : left;
}

function extractModelText(data) {
  const choice = data?.choices?.[0];

  // Chat-completions style: message.content can be a string or an array of parts.
  const fromMessage = flattenText(choice?.message?.content);
  if (fromMessage) return fromMessage;

  // Some providers place text directly on the message.
  const fromMessageText = flattenText(choice?.message?.text || choice?.message?.output_text);
  if (fromMessageText) return fromMessageText;

  // Text-completions style.
  const fromChoiceText = flattenText(choice?.text || choice?.content);
  if (fromChoiceText) return fromChoiceText;

  // Responses API style.
  const fromOutputText = flattenText(data?.output_text);
  if (fromOutputText) return fromOutputText;

  // Some APIs return nested output/content arrays with text fields.
  const fromOutput = flattenText(data?.output);
  if (fromOutput) return fromOutput;

  // Gemini-style candidates payload.
  const fromCandidates = flattenText(data?.candidates);
  if (fromCandidates) return fromCandidates;

  return "";
}

function flattenText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    const text = value
      .map((item) => flattenText(item))
      .filter(Boolean)
      .join("\n")
      .trim();
    return text;
  }

  if (typeof value === "object") {
    const direct = [value.text, value.content, value.output_text, value.value]
      .map((item) => flattenText(item))
      .find(Boolean);
    if (direct) return direct;

    const nested = [value.message, value.delta, value.output, value.parts, value.candidates]
      .map((item) => flattenText(item))
      .find(Boolean);
    if (nested) return nested;
  }

  return "";
}

async function generateImage(description) {
  const res = await fetch(WORKER_URL + "/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      prompt: `A cursed fictional food dish. Looks edible but wrong.
Dark humor.
Description: ${description}`,
      size: "512x512"
    })
  });

  const data = await readJsonResponse(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Image request failed (${res.status})`);
  }
  if (data.error) throw new Error(data.error.message || data.error);

  const imageSrc = extractImageSrc(data);
  if (!imageSrc) throw new Error("No image returned");

  imgEl.src = imageSrc;
  imgEl.style.display = "block";
}

function extractImageSrc(data) {
  const candidates = [
    data?.data?.[0]?.b64_json,
    data?.data?.[0]?.base64,
    data?.images?.[0]?.b64_json,
    data?.images?.[0]?.base64,
    data?.image?.b64_json,
    data?.image?.base64,
    data?.output?.[0]?.b64_json,
    data?.output?.[0]?.base64,
    data?.output?.[0]?.image?.b64_json,
    data?.output?.[0]?.image?.base64,
    data?.output?.[0]?.content?.[0]?.image_base64,
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data,
    data?.data?.[0]?.url,
    data?.images?.[0]?.url,
    data?.image?.url,
    data?.output?.[0]?.url
  ];

  for (const value of candidates) {
    const src = normalizeImageValue(value);
    if (src) return src;
  }

  return "";
}

function normalizeImageValue(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Assume plain base64 payload if it's not a URL/data URI.
  return "data:image/png;base64," + trimmed;
}

async function readJsonResponse(res) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid server response: ${text.slice(0, 160)}`);
  }
}

function formatError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    return err.message || err.error || JSON.stringify(err, null, 2);
  }
  return String(err);
}

function toPlainText(text) {
  return String(text)
    // Keep fenced content but strip fence marker lines.
    .replace(/^```[\w-]*\s*$/gm, "")
    .replace(/^```\s*$/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function setLoadingState(isLoading, message) {
  loadingOverlay.style.display = isLoading ? "flex" : "none";
  loadingOverlay.setAttribute("aria-hidden", isLoading ? "false" : "true");

  if (isLoading && message) {
    loadingText.textContent = message;
  }

  cookBtn.disabled = isLoading;
  worseBtn.disabled = isLoading;
}

cookBtn.onclick = async () => {
  setLoadingState(true, "Cooking something illegal...");
  output.textContent = "Cooking something illegal...";
  imgEl.style.display = "none";

  try {
    lastDish = await generateDish(BASE_PROMPT);
    output.textContent = lastDish;
    try {
      await generateImage(lastDish);
    } catch (imageError) {
      // Keep recipe text visible even if image generation fails.
      output.textContent = `${lastDish}\n\n[Image failed: ${formatError(imageError)}]`;
    }
  } catch (e) {
    output.textContent = "Error: " + formatError(e);
  } finally {
    setLoadingState(false);
  }
};

worseBtn.onclick = async () => {
  if (!lastDish) return;

  setLoadingState(true, "Making it worse...");
  output.textContent = "Making it worse...";
  imgEl.style.display = "none";

  try {
    lastDish = await generateDish(
      "Make this dish worse, more cursed, and less edible. Keep it a complete full recipe with ingredients and at least 8 steps. Output plain text only.\n\n" + lastDish
    );
    output.textContent = lastDish;
    try {
      await generateImage(lastDish);
    } catch (imageError) {
      // Keep recipe text visible even if image generation fails.
      output.textContent = `${lastDish}\n\n[Image failed: ${formatError(imageError)}]`;
    }
  } catch (e) {
    output.textContent = "Error: " + formatError(e);
  } finally {
    setLoadingState(false);
  }
};
