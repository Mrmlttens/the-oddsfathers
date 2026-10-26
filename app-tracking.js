"use strict";

function statusOfGame(g) {
  const x = findEvent(g);
  if (!x) return "unknown";
  return (
    x.competitions?.[0]?.status?.type?.state ||
    x.status?.type?.state ||
    (recordedGame(g) ? "post" : "unknown")
  );
}

function findEvent(g) {
  let date = g?.date,
    away = g?.away,
    home = g?.home;
  return (
    espnEvents.find((ev) => {
      const c = ev.competitions?.[0]?.competitors || [];
      if (c.length < 2) return false;
      const teams = c.map(
        (x) => x.team?.displayName || x.team?.name || x.team?.abbreviation,
      );
      const d = (ev.date || "").slice(0, 10);
      let et = new Date(ev.date);
      let eastern = !isNaN(et)
        ? et.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
        : d;
      return (
        (date === d || date === eastern) &&
        teams.some((n) => teamEquals(n, home)) &&
        teams.some((n) => teamEquals(n, away))
      );
    }) || recordedGame(g)?.event
  );
}

function recordedGame(g) {
  return (window.OddsRecords?.games || []).find(
    (x) => x.sourceVerified === true && x.key === GameModel.gameKey(g),
  );
}

function extractGameStats(summary) {
  return GameModel.extractGameStats(summary);
}

function legGame(leg, bet) {
  return leg.game || bet.game;
}

function ticketGames(bet) {
  return [
    ...new Map(
      (bet.legs || []).map((l) => {
        const g = legGame(l, bet);
        return [GameModel.gameKey(g), g];
      }),
    ).values(),
  ];
}

function evalLeg(leg, bet) {
  const game = legGame(leg, bet),
    event = findEvent(game),
    record = recordedGame(game),
    id = String(event?.id || "");
  const current = GameModel.evaluate(
    leg,
    event,
    statsByEvent.get(id),
    statusOfGame(game),
    livefieldSummaries.get(id)?.raw,
  );
  if (leg.override) return current;
  if (
    record &&
    (!statsByEvent.has(id) ||
      livefieldFailures.has(id) ||
      ["review", "unknown"].includes(current.status))
  )
    return {
      ...GameModel.evaluate(
        leg,
        record.event,
        new Map(Object.entries(record.players)),
        "post",
        record.scopeData,
      ),
      source: "saved ESPN",
      observedAt: record.observedAt,
    };
  return current;
}

function ticketStatus(b) {
  if (b.settlement === "won") return "won";
  if (b.settlement === "lost") return "lost";
  if (b.settlement === "void") return "review";
  if (!b.legs?.length) return "review";
  const s = b.legs.map((l) => evalLeg(l, b).status);
  if (s.includes("miss")) return "lost";
  if (s.every((x) => x === "hit")) return "won";
  if (s.includes("review") || s.includes("void")) return "review";
  if (
    s.includes("live") ||
    ticketGames(b).some((g) => statusOfGame(g) === "in")
  )
    return "live";
  return "open";
}

function legText(l) {
  const who = l.name || l.team || "Selection",
    scopeText = l.scope?.period
      ? "Q" + l.scope.period + " · "
      : l.scope?.drive
        ? "Drive " + l.scope.drive + " · "
        : "";
  if (l.kind === "drive_offensive_td")
    return `${l.team} · Drive 1 · offensive touchdown`;
  if (l.kind === "ml") return `${l.team} moneyline`;
  if (l.kind === "spread")
    return `${l.team} ${l.target >= 0 ? "+" : ""}${l.target} spread`;
  if (l.kind === "any_td" || l.kind === "either_td")
    return `${who} · ${l.target > 1 ? l.target + "+ touchdowns" : "anytime touchdown"}`;
  const labels = {
    passing_yards: "passing yards",
    passing_td: "passing touchdowns",
    rushing_yards: "rushing yards",
    receiving_yards: "receiving yards",
    receptions: "receptions",
    total_points: "total points",
  };
  const target = l.side
    ? (l.side === "under" ? "Under " : "Over ") + l.target
    : l.target + "+";
  return `${l.kind === "total_points" ? "Game" : who} · ${scopeText}${target} ${labels[l.kind] || l.kind}`;
}

function legProgressBar(l, v) {
  const target = Number(l.target),
    numeric = l.kind !== "ml" && l.kind !== "spread" && target > 0;
  const known = numeric && Number.isFinite(v.value);
  const percent =
    v.status === "hit"
      ? 100
      : known
        ? Math.max(0, Math.min(100, (v.value / target) * 100))
        : 0;
  const label =
    v.status === "hit"
      ? "HIT"
      : v.status === "miss"
        ? "MISSED"
        : v.status === "void"
          ? "VOID"
          : l.kind === "ml"
            ? v.status === "live"
              ? "LIVE · AWAITING FINAL"
              : "AWAITING RESULT"
            : known
              ? l.side === "under"
                ? "UNDER " + target + " · AWAITING FINAL"
                : Math.max(0, target - v.value) + " TO GO"
              : v.status === "review"
                ? "VERIFY STATS"
                : "AWAITING STATS";
  const accessible =
    legText(l) + ": " + (known ? v.value + " of " + target + ". " : "") + label;
  const measurable = known || v.status === "hit";
  return (
    '<div class="leg-progress ' +
    v.status +
    '"><div class="leg-progress-track" role="progressbar" aria-label="' +
    esc(accessible) +
    '" aria-valuemin="0" aria-valuemax="100"' +
    (measurable ? ' aria-valuenow="' + Math.round(percent) + '"' : "") +
    '><span class="leg-progress-fill" style="width:' +
    percent +
    '%"></span></div><span class="leg-progress-label">' +
    esc(label) +
    "</span></div>"
  );
}

function legTicker(l, ev) {
  if (ev.value === null || ev.value === undefined)
    return ev.status === "review" ? "VERIFY" : "—";
  return l.kind === "ml"
    ? ev.value
    : l.kind === "spread"
      ? (ev.value > 0 ? "+" : "") + ev.value + " adjusted margin"
      : `${ev.value} / ${l.target || 1}`;
}

function teamColors(b) {
  const main = b.legs.find((x) => x.kind === "ml")?.team || b.game.home;
  return teamEquals(main, b.game.home) ? "orange" : "blue";
}

function progress(b) {
  const legs = b.legs || [];
  const r = legs.map((l) => evalLeg(l, b));
  return {
    total: legs.length,
    hit: r.filter((x) => x.status === "hit").length,
    miss: r.filter((x) => x.status === "miss").length,
    review: r.filter((x) => x.status === "review").length,
    states: r,
  };
}

function easternParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  let v = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${v.year}-${v.month}-${v.day}`, hour: Number(v.hour) };
}

function boardDate() {
  const et = easternParts();
  if (et.hour >= 4) return et.date;
  const d = new Date(`${et.date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function shouldArchiveTicket(b, today, state) {
  return (
    !b.archivedAt &&
    (["won", "lost", "void"].includes(b.settlement) ||
      state === "post" ||
      b.legs.some(
        (l) =>
          (statusOfGame(legGame(l, b)) === "post" ||
            evalLeg(l, b).scopeFinal === true) &&
          evalLeg(l, b).status === "miss",
      ))
  );
}

function checkDailyRollover() {
  const completed = bets.filter(
    (b) =>
      !b.archivedAt &&
      shouldArchiveTicket(
        b,
        null,
        ticketGames(b).every((g) => statusOfGame(g) === "post")
          ? "post"
          : "unfinished",
      ),
  );
  if (!completed.length) return;
  for (const b of completed) {
    b.archivedAt = now();
    b.updatedAt = now();
  }
  addActivity(
    `${completed.length} completed ticket${completed.length === 1 ? "" : "s"} moved to History.`,
  );
  render();
}
