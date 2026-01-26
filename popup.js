const output = document.getElementById("output");

const BASE_PROMPT = `
Invent a completely original fictional dish.
Do NOT use real recipes or real ingredients.
Invent imaginary ingredients that sound edible but wrong.
Give it a cursed or funny name.
Explain ingredients, preparation, and fake stats.
Keep it concise and unhinged.
`;

let lastDish = "";

/* =========================
   SAVE API KEY
========================= */
document.getElementById("saveKey").onclick = () => {
  const key = document.getElementById("apikey").value.trim();
  if (!key) {
    output.textContent = "No key pasted.";
    return;
  }
  chrome.storage.local.set({ apiKey: key });
  output.textContent = "API key saved locally 👍";
};

/* =========================
   CALL GROQ API
========================= */
async function callAI(prompt) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("apiKey", async (result) => {
      const apiKey = result.apiKey;

      if (!apiKey) {
        reject("No API key saved.");
        return;
      }

      try {
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
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
          reject(data.error?.message || "API request failed.");
          return;
        }

        // ✅ NORMAL SUCCESS PATH
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          reject("No text returned from model.");
          return;
        }

        resolve(text);
      } catch (err) {
        console.error(err);
        reject("Network error.");
      }
    });
  });
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
      "Take the following dish and make it worse, more cursed, and less edible:\n\n" +
        lastDish
    );
    output.textContent = text;
    lastDish = text;
  } catch (err) {
    output.textContent = err;
  }
};
