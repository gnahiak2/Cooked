const output = document.getElementById("output");
const imgEl = document.getElementById("dishImage");
const cookBtn = document.getElementById("cook");
const worseBtn = document.getElementById("worse");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
//Worker URL - replace with your own if self-hosting or using a different service
const WORKER_URL = "https://cooked-serverside.wangz9096z.workers.dev";

let lastDish = "";

const BASE_PROMPT = `
Invent a completely original fictional dish.
Real ingredients only.
Fake but edible-sounding components.
Cursed but bizarre name.
Explain preparation and fake stats.
Unhinged but concise.
Output plain text only.
No markdown, no code blocks, no bullet symbols.
Make it sound as appetizing as possible while being very wrong and inedible.
Also make it like an actually possible recipe that someone could attempt if they were very reckless and didn't care about the consequences.
`;
//Halo
async function generateDish(prompt) {
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
      max_tokens: 400
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

  return toPlainText(content);
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

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");

  imgEl.src = "data:image/png;base64," + b64;
  imgEl.style.display = "block";
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
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
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
      "Make this dish worse, more cursed, and less edible. Output plain text only.\n\n" + lastDish
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
