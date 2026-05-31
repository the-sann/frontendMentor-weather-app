// ─── CONFIG ──────────────────────────────────────────────────────────────────

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather code → { label, icon filename }
const WMO_CODES = {
  0: { label: "Clear sky", icon: "icon-sunny.webp" },
  1: { label: "Mainly clear", icon: "icon-sunny.webp" },
  2: { label: "Partly cloudy", icon: "icon-partly-cloudy.webp" },
  3: { label: "Overcast", icon: "icon-overcast.webp" },
  45: { label: "Foggy", icon: "icon-fog.webp" },
  48: { label: "Icy fog", icon: "icon-fog.webp" },
  51: { label: "Light drizzle", icon: "icon-drizzle.webp" },
  53: { label: "Drizzle", icon: "icon-drizzle.webp" },
  55: { label: "Heavy drizzle", icon: "icon-drizzle.webp" },
  61: { label: "Light rain", icon: "icon-rain.webp" },
  63: { label: "Rain", icon: "icon-rain.webp" },
  65: { label: "Heavy rain", icon: "icon-rain.webp" },
  71: { label: "Light snow", icon: "icon-snow.webp" },
  73: { label: "Snow", icon: "icon-snow.webp" },
  75: { label: "Heavy snow", icon: "icon-snow.webp" },
  80: { label: "Showers", icon: "icon-rain.webp" },
  81: { label: "Heavy showers", icon: "icon-rain.webp" },
  95: { label: "Thunderstorm", icon: "icon-storm.webp" },
  96: { label: "Thunderstorm", icon: "icon-storm.webp" },
  99: { label: "Thunderstorm", icon: "icon-storm.webp" },
};

function getWmo(code) {
  return WMO_CODES[code] ?? { label: "Unknown", icon: "icon-sunny.webp" };
}

// ─── STATE ────────────────────────────────────────────────────────────────────

let unit = "celsius"; // "celsius" | "fahrenheit"
let weatherData = null; // full API response stored here

// ─── DOM REFS ─────────────────────────────────────────────────────────────────

const searchInput = document.querySelector(".search-input input");
const searchBtn = document.querySelector(".search-btn button");
const unitToggle = document.querySelector(".unit");
const allContent = document.getElementById("all-content");
const apiError = document.getElementById("api-error");
const retryBtn = document.querySelector(".api-error-retry");
const loadingEl = document.getElementById("banner-today-content-loading");
const daySelect = document.getElementById("day-selected");

// banner
const bannerImg = document.querySelector(
  ".banner-today-content:not(#banner-today-content-loading) img",
);
const bannerCity = document.querySelector(".larg-sreen-banner-today h1");
const bannerDate = document.querySelector(".larg-sreen-banner-today p");
const bannerTempH1 = document.querySelector(".weather-content h1");
const bannerWeatherImg = document.querySelector(".weather-content img");

// details
const feelEl = document.querySelector(".details-content .temperature");
const humidityEl = document.querySelector(".details-content .humidity");
const windEl = document.querySelector(".details-content .wind");
const precipEl = document.querySelectorAll(".details-content .p-text")[3];

// daily / hourly sections
const dailyGrid = document.querySelector(".daily-forecast-content");
const hourlyGrid = document.querySelector(".hourly-forecast-content");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function convertTemp(c) {
  if (unit === "fahrenheit") return Math.round((c * 9) / 5 + 32);
  return Math.round(c);
}

function unitSymbol() {
  return unit === "fahrenheit" ? "°F" : "°C";
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatHour(isoStr) {
  const d = new Date(isoStr + "Z"); // treat as UTC
  return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

function formatFullDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function showError(show) {
  apiError.style.display = show ? "flex" : "none";
  allContent.style.display = show ? "none" : "";
}

function setLoading(on) {
  loadingEl.style.display = on ? "flex" : "none";
  document.querySelector(
    ".banner-today-content:not(#banner-today-content-loading)",
  ).style.display = on ? "none" : "";
}

// ─── GEOCODING ────────────────────────────────────────────────────────────────

async function geocode(cityName) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results?.length) throw new Error("City not found");
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// ─── FETCH WEATHER ────────────────────────────────────────────────────────────

async function fetchWeather({ latitude, longitude, name, country }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    hourly:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
    timezone: "GMT",
    forecast_days: 7,
  });

  const res = await fetch(`${FORECAST_URL}?${params}`);
  const data = await res.json();
  return { data, name, country };
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderBanner({ data, name, country }) {
  const cur = data.current;
  const wmo = getWmo(cur.weather_code);
  const temp = convertTemp(cur.temperature_2m);

  bannerCity.innerHTML = `${name}, <span>${country}</span>`;
  bannerDate.textContent = formatFullDate(cur.time);
  bannerTempH1.innerHTML = `${temp}<sup>${unitSymbol()}</sup>`;
  bannerWeatherImg.src = `./assets/images/${wmo.icon}`;
  bannerWeatherImg.alt = wmo.label;
}

function renderDetails({ data }) {
  const cur = data.current;
  feelEl.textContent = `${convertTemp(cur.apparent_temperature)}${unitSymbol()}`;
  humidityEl.textContent = `${cur.relative_humidity_2m}%`;
  windEl.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
  precipEl.textContent = `${cur.precipitation} mm`;
}

function renderDaily({ data }) {
  const { time, temperature_2m_max, temperature_2m_min, weather_code } =
    data.daily;

  dailyGrid.innerHTML = time
    .map((t, i) => {
      const wmo = getWmo(weather_code[i]);
      const hi = convertTemp(temperature_2m_max[i]);
      const lo = convertTemp(temperature_2m_min[i]);
      return `
      <div class="daily-forecast-item">
        <p class="daily-forecast-item-title">${formatDay(t)}</p>
        <img src="./assets/images/${wmo.icon}" alt="${wmo.label}" title="${wmo.label}" />
        <div class="daily-forecast-weather">
          <p>${hi}<sup>o</sup></p>
          <p>${lo}<sup>o</sup></p>
        </div>
      </div>`;
    })
    .join("");
}

function renderHourly({ data }, dayIndex = 0) {
  const { time, temperature_2m, weather_code } = data.hourly;

  // Each day has 24 hours
  const start = dayIndex * 24;
  const slice = time.slice(start, start + 24);

  hourlyGrid.innerHTML = slice
    .map((t, i) => {
      const wmo = getWmo(weather_code[start + i]);
      const temp = convertTemp(temperature_2m[start + i]);
      return `
      <div class="hourly-forecast-item">
        <div class="hourly-forecast-item-title">
          <img src="./assets/images/${wmo.icon}" alt="${wmo.label}" />
          <p>${formatHour(t)}</p>
        </div>
        <p>${temp}<sup>o</sup></p>
      </div>`;
    })
    .join("");
}

function populateDaySelect({ data }) {
  const days = data.daily.time;
  daySelect.innerHTML = days
    .map((t, i) => {
      const label = new Date(t).toLocaleDateString("en-US", {
        weekday: "long",
      });
      return `<option value="${i}">${label}</option>`;
    })
    .join("");
}

function renderAll(result) {
  weatherData = result;
  renderBanner(result);
  renderDetails(result);
  renderDaily(result);
  populateDaySelect(result);
  renderHourly(result, 0);
}

// ─── SEARCH FLOW ─────────────────────────────────────────────────────────────

async function search() {
  const city = searchInput.value.trim();
  if (!city) return;

  showError(false);
  setLoading(true);

  try {
    const location = await geocode(city);
    const result = await fetchWeather(location);
    setLoading(false);
    renderAll(result);
  } catch (err) {
    console.error(err);
    setLoading(false);
    showError(true);
  }
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

searchBtn.addEventListener("click", search);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});

retryBtn.addEventListener("click", () => {
  showError(false);
  search();
});

daySelect.addEventListener("change", () => {
  if (!weatherData) return;
  renderHourly(weatherData, Number(daySelect.value));
});

unitToggle.addEventListener("click", () => {
  unit = unit === "celsius" ? "fahrenheit" : "celsius";
  // Update the label text
  const label = unitToggle.querySelector("p");
  if (label) label.textContent = unit === "celsius" ? "Unit (°C)" : "Unit (°F)";
  if (weatherData) renderAll(weatherData);
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

// Hide error on load, show content skeleton
showError(false);
setLoading(false);

// Optionally load a default city on start
// searchInput.value = "Phnom Penh";
// search();
