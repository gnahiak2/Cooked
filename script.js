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

  const data = await res.json();
  if (data.error) throw data.error;
  return data.choices[0].message.content;
}

async function generateImage(description) {
  const res = await fetch(WORKER_URL + "/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      prompt: `A cursed fictional food dish. Looks edible but wrong.
Dark humor. Experimental plating.
Description: ${description}`,
      size: "512x512"
    })
  });

  const data = await res.json();
  if (data.error) throw data.error;

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw "No image returned";

  imgEl.src = "data:image/png;base64," + b64;
  imgEl.style.display = "block";
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
    await generateImage(lastDish);
  } catch (e) {
    output.textContent = JSON.stringify(e, null, 2);
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
      "Make this dish worse, more cursed, and less edible:\n\n" + lastDish
    );
    output.textContent = lastDish;
    await generateImage(lastDish);
  } catch (e) {
    output.textContent = JSON.stringify(e, null, 2);
  } finally {
    setLoadingState(false);
  }
};
