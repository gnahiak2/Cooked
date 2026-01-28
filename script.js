const output = document.getElementById("output");
const imgEl = document.getElementById("dishImage");

const WORKER_URL = "https://cooked-serverside.wangz9096z.workers.dev";

let lastDish = "";

const BASE_PROMPT = `
Invent a completely original fictional dish.
No real ingredients.
Fake but edible-sounding components.
Cursed name.
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

document.getElementById("cook").onclick = async () => {
  output.textContent = "Cooking something illegal...";
  imgEl.style.display = "none";

  try {
    lastDish = await generateDish(BASE_PROMPT);
    output.textContent = lastDish;
    await generateImage(lastDish);
  } catch (e) {
    output.textContent = JSON.stringify(e, null, 2);
  }
};

document.getElementById("worse").onclick = async () => {
  if (!lastDish) return;

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
  }
};
