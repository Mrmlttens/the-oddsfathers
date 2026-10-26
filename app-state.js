"use strict";

const ACTIVITY_KEY = "oddsfathers.activity.v1";

const NFL_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

const DATE = "2026-10-22";

const HOME = "Chicago Bears";

const NAME_ALIASES = {
  ne: "new england patriots",
  nwe: "new england patriots",
  "new england": "new england patriots",
  patriots: "new england patriots",
  chi: "chicago bears",
  bears: "chicago bears",
  chicago: "chicago bears",
  dal: "dallas cowboys",
  cowboys: "dallas cowboys",
  gb: "green bay packers",
  packers: "green bay packers",
  jax: "jacksonville jaguars",
  jac: "jacksonville jaguars",
  jaguars: "jacksonville jaguars",
  hou: "houston texans",
  texans: "houston texans",
  sf: "san francisco 49ers",
  "49ers": "san francisco 49ers",
  was: "washington commanders",
  wsh: "washington commanders",
  commanders: "washington commanders",
  nyg: "new york giants",
  nyj: "new york jets",
  la: "los angeles rams",
  lar: "los angeles rams",
};

function uuid() {
  return (
    crypto?.randomUUID?.() ||
    "bet_" + Date.now() + "_" + Math.random().toString(36).slice(2)
  );
}

function now() {
  return new Date().toISOString();
}

function money(v) {
  if (v === null || v === undefined) return "N/A";
  return Number(v || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function canonTeam(s) {
  const a = String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  return NAME_ALIASES[a] || a;
}

function teamEquals(a, b) {
  return norm(canonTeam(a)) === norm(canonTeam(b));
}

function teamAbbr(n) {
  const map = {
    "arizona cardinals": "ARI",
    "atlanta falcons": "ATL",
    "baltimore ravens": "BAL",
    "buffalo bills": "BUF",
    "carolina panthers": "CAR",
    "chicago bears": "CHI",
    "cincinnati bengals": "CIN",
    "cleveland browns": "CLE",
    "dallas cowboys": "DAL",
    "denver broncos": "DEN",
    "detroit lions": "DET",
    "green bay packers": "GB",
    "houston texans": "HOU",
    "indianapolis colts": "IND",
    "jacksonville jaguars": "JAX",
    "kansas city chiefs": "KC",
    "las vegas raiders": "LV",
    "los angeles chargers": "LAC",
    "los angeles rams": "LAR",
    "miami dolphins": "MIA",
    "minnesota vikings": "MIN",
    "new england patriots": "NE",
    "new orleans saints": "NO",
    "new york giants": "NYG",
    "new york jets": "NYJ",
    "philadelphia eagles": "PHI",
    "pittsburgh steelers": "PIT",
    "san francisco 49ers": "SF",
    "seattle seahawks": "SEA",
    "tampa bay buccaneers": "TB",
    "tennessee titans": "TEN",
    "washington commanders": "WAS",
  };
  return (
    map[canonTeam(n)] ||
    String(n || "")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3)
  );
}

function teamLogo(n) {
  const ab = teamAbbr(n).toLowerCase();
  const ids = {
    ne: "ne",
    chi: "chi",
    gb: "gb",
    dal: "dal",
    hou: "hou",
    jax: "jax",
    sf: "sf",
    was: "wsh",
  };
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${ids[ab] || ab}.png`;
}

function dateText(d) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function oddsFromReturn(b) {
  if (Number.isFinite(b.odds)) return (b.odds > 0 ? "+" : "") + b.odds;
  let stake = Number(b.stake),
    pay = Number(b.payout);
  if (!(stake > 0) || pay <= 0) return "—";
  let dec = pay / stake;
  return dec >= 2
    ? `+${Math.round((dec - 1) * 100)}`
    : `${Math.round(-100 / (dec - 1))}`;
}

function readJSON(key, fallback) {
  try {
    let x = JSON.parse(localStorage.getItem(key));
    return x ?? fallback;
  } catch {
    return fallback;
  }
}

let bets = [];

let publishedVersion = "";

let publishedSyncBusy = false;

let activity = [];

let currentView = "dashboard",
  selectedOwner = "all",
  selectedStatus = "all",
  expanded = new Set(),
  selectedGameKey = null;

const livefieldSummaries = new Map(),
  livefieldFailures = new Set();

let scoreboardFailures = 0;

let espnEvents = [],
  statsByEvent = new Map(),
  scoreState = "pending",
  lastRefresh = null,
  lastKnownStatus = new Map();

let winEvents = {};

const $ = (id) => document.getElementById(id);

function toast(text) {
  let d = document.createElement("div");
  d.className = "toast";
  d.textContent = text;
  $("toasts").appendChild(d);
  setTimeout(() => d.remove(), 4200);
}

document.addEventListener("DOMContentLoaded", () => init());

let celebrationTimer = null;
