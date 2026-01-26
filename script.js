const output = document.getElementById("output");

const BASE_PROMPT = `Invent a completely original fictional dish. Do NOT use real recipes or real ingredients. Invent imaginary ingredients that sound edible but wrong. Give it a cursed or funny name. Explain ingredients, preparation, and fake stats. Keep it concise and unhinged.`;

let lastDish = "";

/* =========================
   SAVE API KEY
========================= */
document.getElementById("saveKey").onclick = async () => {
  const key = document.getElementById("apikey").value.trim();
  if (!key) {
    output.textContent = "No key pasted.";
    return;
  }
  try {
    await chrome.storage.local.set({ apiKey: key });
    output.textContent = "API key saved locally 👍";
  } catch (err) {
    output.textContent = "Error saving API key.";
  }
};

/* =========================
   CALL GROQ API
========================= */
async function callAI(prompt) {
  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await chrome.storage.local.get("apiKey")?.apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "You are a chaotic experimental chef AI." },
            { role: "user", content: prompt }
          ],
          temperature: 1.0,
          max_tokens: 400
        })
      }
    );

    const data = await res.json();
    console.log("Groq response:", data);

    // ✅ HANDLE ERRORS SAFELY
    if (!res.ok) {
      throw data.error?.message || "API request failed.";
    }

    // ✅ NORMAL SUCCESS PATH
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw "No text returned from model.";
    }

    return text;
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
}

/* =========================
   COOK BUTTON
========================= */
document.getElementById("cook").onclick = async () => {
  output.textContent = "Cooking something illegal...";
  try {
    const text = await callAI(BASE_PROMPT);
    output.textContent = text;
    lastDish = text;
  } catch (err) {
    output.textContent = err;
  }
};

/* =========================
   MAKE IT WORSE BUTTON
========================= */
document.getElementById("worse").onclick = async () => {
  if (!lastDish) {
    output.textContent = "Nothing to worsen yet.";
    return;
  }

  output.textContent = "Making it worse...";
  try {
    const text = await callAI(
      "Take the following dish and make it worse, more