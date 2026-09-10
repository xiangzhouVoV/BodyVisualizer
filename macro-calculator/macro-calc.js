const fallbackFoods = {
  CN: {
    protein: [{ name: "Chicken breast / 鸡胸肉", grams: 31, serving: 150 }, { name: "Firm tofu / 北豆腐", grams: 13, serving: 200 }, { name: "Eggs / 鸡蛋", grams: 13, serving: 100 }],
    carbs: [{ name: "Rice / 米饭", grams: 26, serving: 200 }, { name: "Noodles / 面条", grams: 25, serving: 200 }, { name: "Steamed bun / 馒头", grams: 47, serving: 100 }],
    fat: [{ name: "Peanuts / 花生", grams: 49, serving: 30 }, { name: "Sesame paste / 芝麻酱", grams: 52, serving: 20 }, { name: "Walnuts / 核桃", grams: 65, serving: 25 }],
  },
  US: {
    protein: [{ name: "Chicken breast", grams: 31, serving: 150 }, { name: "Greek yogurt", grams: 10, serving: 200 }, { name: "Eggs", grams: 13, serving: 100 }],
    carbs: [{ name: "Brown rice", grams: 23, serving: 200 }, { name: "Potato", grams: 17, serving: 250 }, { name: "Whole-wheat bread", grams: 43, serving: 70 }],
    fat: [{ name: "Avocado", grams: 15, serving: 100 }, { name: "Almonds", grams: 50, serving: 30 }, { name: "Peanut butter", grams: 50, serving: 30 }],
  },
  GB: {
    protein: [{ name: "Chicken breast", grams: 31, serving: 150 }, { name: "Cottage cheese", grams: 12, serving: 200 }, { name: "Eggs", grams: 13, serving: 100 }],
    carbs: [{ name: "Porridge oats", grams: 60, serving: 60 }, { name: "Jacket potato", grams: 17, serving: 250 }, { name: "Wholemeal bread", grams: 43, serving: 70 }],
    fat: [{ name: "Avocado", grams: 15, serving: 100 }, { name: "Cheddar", grams: 34, serving: 30 }, { name: "Walnuts", grams: 65, serving: 25 }],
  },
  IN: {
    protein: [{ name: "Paneer", grams: 18, serving: 100 }, { name: "Dal / lentils", grams: 9, serving: 200 }, { name: "Chicken breast", grams: 31, serving: 150 }],
    carbs: [{ name: "Basmati rice", grams: 28, serving: 180 }, { name: "Roti", grams: 46, serving: 60 }, { name: "Potato", grams: 17, serving: 250 }],
    fat: [{ name: "Peanuts", grams: 49, serving: 30 }, { name: "Ghee", grams: 100, serving: 12 }, { name: "Cashews", grams: 44, serving: 30 }],
  },
  JP: {
    protein: [{ name: "Chicken breast / 鶏むね肉", grams: 31, serving: 150 }, { name: "Natto / 納豆", grams: 17, serving: 50 }, { name: "Tofu / 豆腐", grams: 7, serving: 200 }],
    carbs: [{ name: "Rice / ごはん", grams: 37, serving: 160 }, { name: "Udon / うどん", grams: 21, serving: 220 }, { name: "Soba / そば", grams: 26, serving: 200 }],
    fat: [{ name: "Sesame / ごま", grams: 54, serving: 20 }, { name: "Mackerel / さば", grams: 14, serving: 100 }, { name: "Almonds", grams: 50, serving: 30 }],
  },
};

const macroInfo = {
  protein: { title: "Protein", tint: "coral", icon: "P", detail: (amount, weight) => `about ${(amount / weight).toFixed(1)} g/kg` },
  carbs: { title: "Carbs", tint: "gold", icon: "C", detail: () => "your main energy source" },
  fat: { title: "Fat", tint: "olive", icon: "F", detail: () => "supports hormones & health" },
};

// API calls stay same-origin. Vite proxies them locally and the Cloudflare Worker
// proxies them in production, so browser CORS configuration is not required.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const DEFAULT_FOOD_COUNTRY = "CN";
const fallbackCountries = [
  { code: "CN", nameEn: "China", nameLocal: "中国" },
  { code: "US", nameEn: "United States", nameLocal: "United States" },
  { code: "GB", nameEn: "United Kingdom", nameLocal: "United Kingdom" },
  { code: "IN", nameEn: "India", nameLocal: "India" },
  { code: "JP", nameEn: "Japan", nameLocal: "日本" },
];

let selectedGender = "male";
let countries = [];
let selectedCountry = null;
let countryFoodCache = new Map();

const form = document.querySelector("#macro-form");
const countryPicker = document.querySelector("#country-picker");
const countryTrigger = document.querySelector("#country-trigger");
const countryOptions = document.querySelector("#country-options");
const countryFlag = document.querySelector("#country-flag");
const countryLabel = document.querySelector("#country-label");
const results = document.querySelector("#macro-results");
const error = document.querySelector("#form-error");

function getFlagUrl(code) {
  return `https://flagcdn.com/${String(code).toLowerCase()}.svg`;
}

function normaliseCountry(item) {
  const code = String(item.code ?? item.id ?? item.country_code ?? "").toUpperCase();
  return {
    code,
    nameEn: item.nameEn ?? item.name_en ?? item.name ?? code,
    nameLocal: item.nameLocal ?? item.name_local ?? "",
    flagUrl: item.flagUrl ?? item.flag_url ?? getFlagUrl(code),
  };
}

function countryName(country) {
  return country.nameLocal && country.nameLocal !== country.nameEn ? `${country.nameEn} / ${country.nameLocal}` : country.nameEn;
}

function selectCountry(code) {
  selectedCountry = countries.find((country) => country.code === code) ?? countries[0];
  if (!selectedCountry) return;
  countryFlag.src = selectedCountry.flagUrl;
  countryFlag.alt = `${selectedCountry.nameEn} flag`;
  countryLabel.textContent = countryName(selectedCountry);
  countryOptions.querySelectorAll("[role=option]").forEach((option) => {
    option.setAttribute("aria-selected", String(option.dataset.code === selectedCountry.code));
  });
}

function closeCountryOptions() {
  countryOptions.hidden = true;
  countryTrigger.setAttribute("aria-expanded", "false");
}

function renderCountries(items) {
  countries = items.map(normaliseCountry).filter((country) => country.code);
  countryOptions.innerHTML = countries.map((country) => `<button type="button" role="option" data-code="${escapeHtml(country.code)}" aria-selected="false"><img src="${escapeHtml(country.flagUrl)}" alt="" width="24" height="18" /><span>${escapeHtml(countryName(country))}</span></button>`).join("");
  countryOptions.querySelectorAll("[role=option]").forEach((option) => {
    option.addEventListener("click", () => {
      selectCountry(option.dataset.code);
      closeCountryOptions();
    });
  });
  selectCountry(countries[0]?.code);
}

async function loadCountries() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/countries`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Country API unavailable");
    const items = await response.json();
    if (!Array.isArray(items) || !items.length) throw new Error("Country API returned no results");
    renderCountries(items);
  } catch {
    renderCountries(fallbackCountries);
    document.querySelector("#country-hint").textContent = "Showing starter country suggestions";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function numberValue(id) {
  return Number(document.querySelector(`#${id}`).value);
}

function getMacroRequestParams() {
  const weight = numberValue("weight");
  const trainingLevel = numberValue("trainingLevel");
  if (!Number.isFinite(weight) || weight <= 0 || weight >= 500) {
    throw new Error("Please enter a valid weight.");
  }
  return { weightKg: weight, gender: selectedGender, trainingLevel, country: selectedCountry?.code ?? DEFAULT_FOOD_COUNTRY };
}

function macroRange(data, names) {
  for (const name of names) {
    const value = data[name];
    if (Array.isArray(value) && value.length >= 2) {
      const min = Number(value[0]);
      const max = Number(value[1]);
      if (Number.isFinite(min) && Number.isFinite(max)) return { min: Math.round(min), max: Math.round(max) };
    }
    if (value && typeof value === "object") {
      const min = Number(value.min ?? value.minValue ?? value.lower);
      const max = Number(value.max ?? value.maxValue ?? value.upper);
      if (Number.isFinite(min) && Number.isFinite(max)) return { min: Math.round(min), max: Math.round(max) };
    }
    const scalar = Number(value);
    if (Number.isFinite(scalar)) return { min: Math.round(scalar), max: Math.round(scalar) };
  }
  return null;
}

function rangeMarkup(range) {
  return range.min === range.max ? String(range.min) : `<span>${range.min}</span><i>–</i><span>${range.max}</span>`;
}

function rangeMidpoint(range) {
  return (range.min + range.max) / 2;
}

async function requestDailyMacroTargets() {
  const params = getMacroRequestParams();
  const query = new URLSearchParams({
    weightKg: String(params.weightKg),
    gender: params.gender,
    trainingLevel: String(params.trainingLevel),
    country: params.country,
  });
  const response = await fetch(`${API_BASE_URL}/api/daily-macro-target?${query}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("We couldn't calculate your macro targets right now. Please try again shortly.");

  const payload = await response.json();
  const data = payload.data ?? payload;
  const protein = macroRange(data, ["proteinG", "protein_g", "protein"]);
  const carbs = macroRange(data, ["carbsG", "carbs_g", "carbohydratesG", "carbohydrates_g", "carbs"]);
  const fat = macroRange(data, ["fatG", "fat_g", "fat"]);
  if (protein === null || carbs === null || fat === null) {
    throw new Error("The macro service returned an incomplete result. Please try again shortly.");
  }
  return { protein, carbs, fat, weight: params.weightKg, recommendedFoods: data.recommendedFoods ?? null, country: params.country };
}

function renderMacroCards(macros) {
  const cards = document.querySelector("#macro-cards");
  cards.innerHTML = Object.entries(macroInfo).map(([key, info]) => {
    const amount = macros[key];
    return `<article class="macro-card ${info.tint}"><span class="macro-icon">${info.icon}</span><p>${info.title}</p><strong>${rangeMarkup(amount)} <small>g</small></strong><span>daily target range</span><em>${key === "protein" ? `about ${(rangeMidpoint(amount) / macros.weight).toFixed(1)} g/kg` : info.detail()}</em></article>`;
  }).join("");
  document.querySelector("#result-summary").textContent = "Personalized for your training level";
}

function normaliseFood(item, type) {
  return {
    name: item.nameEn ?? item.name_en ?? item.displayName ?? item.nameZh ?? item.name ?? item.food_name ?? item.title ?? "Food suggestion",
    grams: Number(item[`${type}G`] ?? item[`${type}_g`] ?? item.macro_per_100g ?? item[`${type}_per_100g`] ?? item.grams ?? item.value ?? 0),
    serving: Number(item.serving_grams ?? item.serving ?? item.portion ?? 100),
    sort: Number(item.sort_order ?? item.sort ?? 0),
  };
}

async function getFoods(countryId) {
  if (countryFoodCache.has(countryId)) return countryFoodCache.get(countryId);
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods?country=${encodeURIComponent(countryId)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Food API unavailable");
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload.foods ?? payload.data ?? [];
    const grouped = { protein: [], carbs: [], fat: [] };
    items.forEach((item) => {
      const type = String(item.macro_type ?? item.type ?? item.category ?? "").toLowerCase();
      if (grouped[type]) grouped[type].push(normaliseFood(item, type));
    });
    if (!grouped.protein.length || !grouped.carbs.length || !grouped.fat.length) throw new Error("Incomplete food response");
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.sort - b.sort));
    countryFoodCache.set(countryId, grouped);
    return grouped;
  } catch {
    return fallbackFoods[countryId] ?? fallbackFoods[DEFAULT_FOOD_COUNTRY];
  }
}

function foodsFromRecommendation(recommendedFoods) {
  if (!recommendedFoods || typeof recommendedFoods !== "object") return null;
  const grouped = { protein: [], carbs: [], fat: [] };
  Object.keys(grouped).forEach((type) => {
    const items = Array.isArray(recommendedFoods[type]) ? recommendedFoods[type] : [];
    grouped[type] = items.map((item) => normaliseFood(item, type)).filter((item) => item.grams > 0);
  });
  return grouped.protein.length && grouped.carbs.length && grouped.fat.length ? grouped : null;
}

function renderFoods(foods, macros) {
  const container = document.querySelector("#food-columns");
  container.innerHTML = Object.entries(macroInfo).map(([type, info]) => {
    const list = foods[type] ?? [];
    const rows = list.map((food) => {
      const percent = Math.max(1, Math.round((food.grams / 100 * food.serving / rangeMidpoint(macros[type])) * 100));
      return `<li><div class="food-item-top"><strong>${escapeHtml(food.name)}</strong><span>${food.grams}g <small>per 100g</small></span></div><div class="food-progress"><i style="width:${Math.min(percent, 100)}%"></i></div><p>${food.serving}g serving <b>≈ ${percent}% of your daily ${info.title.toLowerCase()}</b></p></li>`;
    }).join("");
    return `<article class="food-column ${info.tint}"><div class="food-column-title"><span>${info.icon}</span><div><p>${info.title} picks</p><small>Local staples & easy options</small></div></div><ul>${rows}</ul></article>`;
  }).join("");
}

document.querySelectorAll("[data-gender]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedGender = button.dataset.gender;
    document.querySelectorAll("[data-gender]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
  });
});

countryTrigger.addEventListener("click", () => {
  const willOpen = countryOptions.hidden;
  countryOptions.hidden = !willOpen;
  countryTrigger.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (event) => {
  if (!countryPicker.contains(event.target)) closeCountryOptions();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.hidden = true;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.firstChild.textContent = "Calculating ";
  try {
    const macros = await requestDailyMacroTargets();
    renderMacroCards(macros);
    results.hidden = false;
    const foods = foodsFromRecommendation(macros.recommendedFoods) ?? await getFoods(macros.country ?? DEFAULT_FOOD_COUNTRY);
    renderFoods(foods, macros);
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (reason) {
    error.textContent = reason instanceof Error ? reason.message : "Please check your inputs and try again.";
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.firstChild.textContent = "Calculate my macros ";
  }
});

loadCountries();
