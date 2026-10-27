"use strict";

function gamesOnBoard() {
  let m = new Map();
  for (const b of bets.filter((b) => !b.archivedAt))
    for (const g of ticketGames(b)) {
      let key = `${g.date}|${g.away}|${g.home}`;
      if (!m.has(key)) m.set(key, { ...g, key });
    }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function currentGame() {
  const games = gamesOnBoard();
  if (!selectedGameKey || !games.some((g) => g.key === selectedGameKey))
    selectedGameKey =
      games.find((g) => g.date === DATE && teamEquals(g.home, HOME))?.key ||
      games[0]?.key ||
      null;
  return games.find((g) => g.key === selectedGameKey) || null;
}

function renderScenarioBar() {
  const g = currentGame();
  if (!g) {
    $("scenarioBar").hidden = true;
    return;
  }
  const gameBets = bets.filter(
    (b) =>
      !b.archivedAt &&
      b.game.date === g.date &&
      teamEquals(b.game.home, g.home) &&
      teamEquals(b.game.away, g.away),
  );
  const moneylineSides = [g.home, g.away].map((team) => ({
    team,
    payout: gameBets
      .filter((b) =>
        b.legs.some((l) => l.kind === "ml" && teamEquals(l.team, team)),
      )
      .reduce((acc, b) => acc + Number(b.payout || 0), 0),
  }));
  $("scenarioBar").hidden = false;
  $("scenarioBar").innerHTML =
    `<strong>♛ GAME SCENARIOS</strong>` +
    moneylineSides
      .map(
        ({ team, payout }, i) =>
          `<span class="bar-pill ${i === 0 ? "orange" : ""}">${esc(teamAbbr(team))} WIN → up to <strong>${money(payout)}</strong></span>`,
      )
      .join("") +
    `<span class="bar-note">Conditional totals only · all props on each side must also hit</span>`;
}

function renderGameSelect() {
  const sel = $("gameSelect"),
    games = gamesOnBoard(),
    g = currentGame();
  sel.innerHTML = games
    .map(
      (x) =>
        `<option value="${esc(x.key)}">${esc(teamAbbr(x.away))} @ ${esc(teamAbbr(x.home))} · ${esc(dateText(x.date))}</option>`,
    )
    .join("");
  if (g) sel.value = g.key;
}

function renderFilters() {
  const names = [...new Set(bets.map((b) => b.owner || "Unknown"))].sort();
  const s = $("ownerFilter"),
    prev = s.value || selectedOwner;
  s.innerHTML =
    '<option value="all">All crew</option>' +
    names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  s.value = names.includes(prev) ? prev : "all";
  selectedOwner = s.value;
}

function ticketCloseness(b) {
  const p = progress(b),
    status = ticketStatus(b);
  const rank =
    status === "won"
      ? 0
      : status === "lost" || p.miss
        ? 4
        : b.placed === false
          ? 2
          : status === "review"
            ? 3
            : 1;
  const partial = p.states.reduce((sum, s, i) => {
    if (s.status === "hit" || s.status === "void") return sum + 1;
    const target = Number(b.legs[i].target);
    return (
      sum +
      (b.legs[i].kind !== "ml" &&
      b.legs[i].side !== "under" &&
      Number.isFinite(s.value) &&
      target > 0
        ? Math.max(0, Math.min(1, s.value / target))
        : 0)
    );
  }, 0);
  return {
    rank,
    hit: p.total ? p.hit / p.total : 0,
    progress: p.total ? partial / p.total : 0,
    remaining: p.total - p.hit,
  };
}

function compareTicketCloseness(a, b) {
  const x = ticketCloseness(a),
    y = ticketCloseness(b);
  return (
    x.rank - y.rank ||
    y.hit - x.hit ||
    y.progress - x.progress ||
    x.remaining - y.remaining ||
    String(a.id).localeCompare(String(b.id))
  );
}

// Proximity is measured per leg, never averaged across the ticket.
function ticketRadiance(b, p, status, now = Date.now()) {
  if (b.archivedAt || b.settlement || status !== "live" || scoreState !== "connected" || !p.total || p.states.length !== b.legs.length) return false;
  let remaining = 0;
  const near = p.states.every((s, i) => {
    if (s.status === "hit" || s.status === "void") return true;
    const l = b.legs[i], target = Number(l.target);
    if (s.status !== "live" || l.side === "under" || !["passing_yards", "passing_td", "rushing_yards", "receiving_yards", "receptions", "total_points", "any_td", "either_td"].includes(l.kind) || !(target > 0) || !Number.isFinite(s.value)) return false;
    const game = legGame(l, b), id = String(findEvent(game)?.id || ""), cached = livefieldSummaries.get(id);
    if (statusOfGame(game) !== "in" || livefieldFailures.has(id) || !Number.isFinite(cached?.time) || now - cached.time > 90000 || cached.time > now) return false;
    remaining++;
    return s.value / target >= 0.8;
  });
  return near && remaining > 0;
}

function renderTickets() {
  let filtered = bets
    .filter((b) => !b.archivedAt)
    .filter(
      (b) =>
        (selectedOwner === "all" || b.owner === selectedOwner) &&
        (selectedStatus === "all" ||
          (selectedStatus === "open"
            ? ["open", "live", "review"].includes(ticketStatus(b))
            : ticketStatus(b) === selectedStatus)),
    );
  filtered.sort(compareTicketCloseness);
  $("visibleCount").textContent = filtered.length;
  $("emptyState").hidden = filtered.length > 0;
  $("ticketGrid").innerHTML = filtered
    .map((b, i) => {
      const st = ticketStatus(b),
        p = progress(b),
        detail = expanded.has(b.id),
        winner = b.legs.find((l) => l.kind === "ml")?.team;
      const statusLabel = {
        open: "OPEN",
        live: "IN PLAY",
        won: "WON",
        lost: "LOST",
        review: "REVIEW",
      }[st];
      const matchups = ticketGames(b),
        shortTeams =
          matchups.length > 1
            ? matchups.length + " GAMES"
            : `${teamAbbr(b.game.away)} @ ${teamAbbr(b.game.home)}`;
      const dots = p.states
        .map(
          (s) =>
            `<span class="p-dot ${s.status === "hit" ? "hit" : s.status === "miss" ? "miss" : s.status === "live" ? "live" : ""}"></span>`,
        )
        .join("");
      const legs = b.legs
        .map((l, j) => {
          const v = p.states[j],
            sym =
              v.status === "hit"
                ? "✓"
                : v.status === "miss"
                  ? "✕"
                  : v.status === "review"
                    ? "!"
                    : "·";
          return `<div class="leg-wrap"><div class="leg"><span class="leg-symbol ${v.status}">${sym}</span><span class="leg-name">${esc(legText(l))}${ticketGames(b).length > 1 ? `<small style="display:block;color:var(--muted);font-size:10px">${esc(teamAbbr(legGame(l, b).away))} @ ${esc(teamAbbr(legGame(l, b).home))} · ${esc(dateText(legGame(l, b).date))}</small>` : ""}</span><span class="leg-stat ${v.status}">${esc(legTicker(l, v))}</span></div>${legProgressBar(l, v)}</div>`;
        })
        .join("");
      return `<article class="ticket ${teamColors(b)} ${st}${ticketRadiance(b, p, st) ? " ticket-radiant" : ""}" data-id="${esc(b.id)}"><div class="ticket-top"><div><span class="ticket-no">TICKET ${String(b.id).endsWith("-1") ? "01" : String(b.id).endsWith("-2") ? "02" : String(b.id).endsWith("-3") ? "03" : String(b.id).endsWith("-4") ? "04" : String(i + 1).padStart(2, "0")}</span><span class="ticket-owner">♛ ${esc(b.owner)}</span></div><span class="statuspill ${st}">${statusLabel}</span></div>
<div class="ticket-content"><div class="ticket-title"><h4>${esc(b.title)}</h4><div class="ticket-odds">${esc(oddsFromReturn(b))}</div></div>
<div class="matchup">◷ ${esc(shortTeams)} <span>·</span> ${esc(dateText(b.game.date))}${matchups.some((g) => g.date !== b.game.date) ? " onwards" : ""} <span>·</span> ${esc(b.sportsbook || "")}</div>
<div class="teamchips"><span class="teamchip"><img loading="lazy" onerror="this.style.display='none'" src="${esc(teamLogo(b.game.away))}" alt="">${esc(teamAbbr(b.game.away))}</span><span class="vs">AT</span><span class="teamchip"><img loading="lazy" onerror="this.style.display='none'" src="${esc(teamLogo(b.game.home))}" alt="">${esc(teamAbbr(b.game.home))}</span>${winner ? `<span class="vs">↳ ${esc(teamAbbr(winner))} WIN</span>` : ""}</div>
<div class="ticket-bottom"><div><div class="dollars">${money(b.stake)}</div><div class="micro">${b.placed === false ? "UNCONFIRMED WAGER" : b.stakeEstimated ? "PLACEHOLDER WAGER" : "WAGERED"}</div></div><div class="payoutval"><div class="dollars">${money(b.payout)}</div><div class="micro">${b.payoutEstimated ? "ESTIMATED TOTAL RETURN" : "POSSIBLE TOTAL RETURN"}</div></div></div>
<div class="progressbox"><div class="progressrow"><span>LEGS TRACKED</span><span>${p.hit} / ${p.total} hit${p.miss ? ` · ${p.miss} missed` : ""}</span></div><div class="progressdots">${dots}</div></div>
<div class="ticket-buttons"><button class="btn btn-primary" data-action="expand" data-id="${esc(b.id)}">${detail ? "Hide" : "Track"} ${p.total} legs ${detail ? "⌃" : "⌄"}</button><button class="btn btn-ghost smallicon" title="Share ticket" data-action="share" data-id="${esc(b.id)}">↗</button></div>
${detail ? `<div class="legs">${legs}<div style="display:flex;justify-content:space-between;gap:9px;align-items:center;margin-top:8px">${b.ticketUrl ? `<a target="_blank" rel="noopener noreferrer" href="${esc(b.ticketUrl)}" style="font-size:11px">Open slip ↗</a>` : ""}</div></div>` : ""}</div></article>`;
    })
    .join("");
}

function renderRecentHits() {
  let el = $("recentHits");
  if (!el) return;
  let recent = Object.values(winEvents)
    .filter((x) => Date.now() - new Date(x.time).getTime() < 36 * 3600 * 1000)
    .sort((a, b) => b.time.localeCompare(a.time));
  el.hidden = recent.length === 0;
  el.innerHTML = recent.length
    ? `<span class="hit-blaze">♛ RECENT HITS</span>` +
      recent
        .slice(0, 3)
        .map(
          (w) =>
            `<div class="hit-chip"><strong>${esc(w.owner)}:</strong> ${esc(w.title)} <em>${money(w.payout)}</em></div>`,
        )
        .join("")
    : "";
}

function render() {
  renderStats();
  renderRecentHits();
  renderFilters();
  renderGameSelect();
  renderScenarioBar();
  renderTickets();
  renderGameCenter();
  renderLeaderboard();
  renderHistory();
  renderProfiles();
  renderFeedHealth();
  if (currentView !== "dashboard") $("scenarioBar").hidden = true;
  const badge = $("feedBadge");
  badge.className = "livebadge " + scoreState;
  badge.querySelector("span:last-child").textContent =
    scoreState === "connected"
      ? "ESPN LIVE"
      : scoreState === "failed"
        ? "FEED OFFLINE"
        : "CONNECTING";
}
function pickView(view) {
  currentView = view;
  renderGameCenter();
  for (const name of ["dashboard", "leaderboard", "history", "profiles"])
    $(name + "View").hidden = name !== view;
  document
    .querySelectorAll(".navtab")
    .forEach((el) => el.classList.toggle("active", el.dataset.tab === view));
  $("currentTitle").innerHTML =
    view === "profiles"
      ? 'The Crew <span class="text-gradient">Career Intel.</span>'
      : view === "dashboard"
        ? 'The Board <span class="text-gradient">Is Live.</span>'
        : view === "leaderboard"
          ? 'King of <span class="text-gradient">the Odds.</span>'
          : 'The Record <span class="text-gradient">Never Lies.</span>';
  if (view === "profiles") renderProfiles();
  $("scenarioBar").hidden = view !== "dashboard" || !currentGame();
  if (typeof renderUpcoming === "function") renderUpcoming();
}
