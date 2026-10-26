"use strict";

function addActivity(message, type = "info", owner = "") {
  activity.unshift({ id: uuid(), message, type, owner, time: now() });
  activity = activity.slice(0, 40);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  renderActivity();
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshLive(silent = false) {
  if ($("refreshBtn").disabled) return;
  $("refreshBtn").disabled = true;
  $("refreshGlyph").textContent = "◌";
  try {
    const dates = [
      ...new Set(
        bets
          .flatMap(ticketGames)
          .filter(
            (g) =>
              g.sport === "NFL" && (!recordedGame(g) || g.date >= boardDate()),
          )
          .map((g) => g.date),
      ),
    ];
    if (!dates.includes(boardDate())) dates.unshift(boardDate());
    let all = [];
    const pageLoads = await Promise.allSettled(
      dates.map((date) =>
        fetchJson(`${NFL_BASE}/scoreboard?dates=${date.replaceAll("-", "")}`),
      ),
    );
    scoreboardFailures = pageLoads.filter(
      (r) => r.status === "rejected",
    ).length;
    for (const rr of pageLoads) {
      if (rr.status === "fulfilled") all.push(...(rr.value.events || []));
    }
    if (!pageLoads.some((x) => x.status === "fulfilled"))
      throw Error("No scoreboard responses");
    espnEvents = [...new Map(all.map((e) => [e.id, e])).values()];
    const events = [
      ...new Map(
        bets
          .flatMap(ticketGames)
          .filter((g) => !recordedGame(g) || g.date >= boardDate())
          .map((g) => findEvent(g))
          .filter(Boolean)
          .map((e) => [e.id, e]),
      ).values(),
    ];
    let done = await Promise.allSettled(
      events.map(async (e) => {
        const id = String(e.id);
        try {
          const raw = await fetchJson(
            `${NFL_BASE}/summary?event=${encodeURIComponent(e.id)}`,
          );
          if (String(raw.header?.id) !== id)
            throw Error("Mismatched game summary");
          const stats = extractGameStats(raw);
          livefieldSummaries.set(id, { raw, time: Date.now() });
          livefieldFailures.delete(id);
          return { id, stats };
        } catch (error) {
          livefieldFailures.add(id);
          throw error;
        }
      }),
    );
    for (const r of done) {
      if (r.status === "fulfilled")
        statsByEvent.set(String(r.value.id), r.value.stats);
    }
    scoreState = "connected";
    lastRefresh = new Date();
    // Only announce new hit/miss milestones after at least one prior successful feed, never initial backfill.
    for (const b of bets) {
      for (let j = 0; j < b.legs.length; j++) {
        let key = `${b.id}.${j}`,
          v = evalLeg(b.legs[j], b).status,
          old = lastKnownStatus.get(key);
        if (old && old !== v && (v === "hit" || v === "miss"))
          addActivity(
            `${b.owner}: ${legText(b.legs[j])} — ${v === "hit" ? "HIT" : "MISSED"}`,
            v,
            b.owner,
          );
        lastKnownStatus.set(key, v);
      }
    }
    checkLegMilestones();
    checkWinners();
    checkDailyRollover();
    if (!silent) toast("NFL scoreboard and player stats refreshed.");
  } catch (err) {
    scoreState = "failed";
    if (!silent)
      toast(
        `Live feed unavailable: ${err.message}. Showing the last available data.`,
      );
  } finally {
    $("refreshBtn").disabled = false;
    $("refreshGlyph").textContent = "⟳";
    render();
  }
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}

function exportCsv() {
  let rows = [
    [
      "Bet Owner",
      "Ticket",
      "Game Date",
      "Matchup",
      "Stake",
      "Potential Return",
      "Odds",
      "Status",
      "Leg",
    ],
  ];
  for (const b of bets)
    for (const leg of b.legs) {
      rows.push([
        b.owner,
        b.title,
        b.game.date,
        `${b.game.away} at ${b.game.home}`,
        b.stake ?? "N/A",
        b.payout ?? "N/A",
        oddsFromReturn(b),
        ticketStatus(b),
        legText(leg),
      ]);
    }
  downloadFile(
    "oddsfathers-bets.csv",
    rows
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\n"),
    "text/csv",
  );
}

function copyText(t) {
  if (navigator.clipboard && window.isSecureContext)
    return navigator.clipboard
      .writeText(t)
      .then(() => toast("Copied to clipboard!"))
      .catch(() => fallbackCopy(t));
  return fallbackCopy(t);
}

function fallbackCopy(t) {
  let ta = document.createElement("textarea");
  ta.value = t;
  ta.style.position = "fixed";
  ta.style.left = "-3000px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {}
  ta.remove();
  if (ok) toast("Copied!");
  else prompt("Copy this text:", t);
}

function shareTicket(b) {
  copyText("https://mrmlttens.github.io/the-oddsfathers/");
}

async function syncPublished() {
  if (publishedSyncBusy) return;
  publishedSyncBusy = true;
  try {
    const data = await fetchJson("./bets.json");
    if (data.version !== 1 || !Array.isArray(data.bets))
      throw Error("Invalid published board");
    const ids = new Set();
    for (const b of data.bets) {
      if (
        !b.id ||
        ids.has(b.id) ||
        !b.owner ||
        !b.game?.date ||
        !b.game?.home ||
        !b.game?.away ||
        !Array.isArray(b.legs) ||
        !b.legs.length ||
        (b.stake !== null && !Number.isFinite(b.stake)) ||
        (b.payout !== null && !Number.isFinite(b.payout))
      )
        throw Error("Invalid published ticket");
      ids.add(b.id);
    }
    const signature = JSON.stringify(data.bets);
    if (signature !== publishedVersion) {
      bets = data.bets;
      publishedVersion = signature;
      checkDailyRollover();
      render();
      checkWinners();
    }
    if ($("boardStatus"))
      $("boardStatus").textContent = "VIEW ONLY · Shared board";
  } catch (err) {
    if ($("boardStatus"))
      $("boardStatus").textContent = "VIEW ONLY · Board update unavailable";
    console.warn("Published board:", err.message);
  } finally {
    publishedSyncBusy = false;
  }
}

function bind() {
  document
    .querySelectorAll(".navtab")
    .forEach((el) =>
      el.addEventListener("click", () => pickView(el.dataset.tab)),
    );
  $("refreshBtn").addEventListener("click", async () => {
    await syncPublished();
    refreshLive(false);
  });
  $("exportBtn").addEventListener("click", exportCsv);
  $("gameSelect").addEventListener("change", (e) => {
    selectedGameKey = e.target.value;
    renderScenarioBar();
    renderGameCenter();
  });
  $("ownerFilter").addEventListener("change", (e) => {
    selectedOwner = e.target.value;
    renderTickets();
  });
  $("statusFilter").addEventListener("change", (e) => {
    selectedStatus = e.target.value;
    renderTickets();
  });
  $("celebrationDismiss").addEventListener("click", dismissCelebration);
  $("celebration").addEventListener("click", (e) => {
    if (e.target === $("celebration")) dismissCelebration();
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const b = bets.find((x) => x.id === el.dataset.id);
    if (!b) return;
    if (el.dataset.action === "expand") {
      expanded.has(b.id) ? expanded.delete(b.id) : expanded.add(b.id);
      renderTickets();
    } else if (el.dataset.action === "share") shareTicket(b);
  });
}

async function init() {
  bind();
  render();
  await syncPublished();
  await refreshLive(true);
  showRecentOnReturn();
  setInterval(async () => {
    if (!document.hidden) {
      await syncPublished();
      refreshLive(true);
    }
  }, 30000);
  setInterval(checkDailyRollover, 60000);
  document.addEventListener("visibilitychange", async () => {
    if (!document.hidden) {
      await syncPublished();
      refreshLive(true);
      showRecentOnReturn();
    }
  });
}
