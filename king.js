'use strict';
let kingConfig={version:1,rulesVersion:KingModel.RULES,registrations:[],results:[],games:[]},kingLoaded=false,kingDelayed=false,kingBusy=false,kingTickerPaused=false,kingTickerSignature='',kingPeriod='weekend';
function kingEvaluations(){const values=[];for(const r of KingModel.registrations(kingConfig,bets)){const bet={id:r.betId,owner:r.owner,game:r.game,legs:[r.leg]},event=findEvent(r.game);if(!event)continue;const value=evalLeg(r.leg,bet);values.push({...value,betId:r.betId,legIndex:r.legIndex,gameStart:event.date,gameState:statusOfGame(r.game),observedAt:value.observedAt||(livefieldSummaries.get(String(event.id))?.time?new Date(livefieldSummaries.get(String(event.id)).time).toISOString():r.submittedAt)});}return values;}
function kingPoints(n){return Number(n||0).toFixed(2);}
function kingRows(rows,period){
 let last=null,rank=0;
 return rows.map((r,i)=>{
  const season=period==='season',isPendingSeason=season&&r.seasonWeeks===0;
  const score=season?r.seasonPoints:r.weekendPoints;
  if(last===null||Math.abs(score-last)>1e-8)rank=i+1;last=score;
  const eligible=season?r.seasonQualified:r.weekendEligible;
  const label=isPendingSeason?'—':kingPoints(score);
  const status=season?(r.seasonQualified?'QUALIFIED':r.seasonWeeks+' / 3 WEEKS'):
    (r.graded<5?r.weekendToQualify+' TO QUALIFY':r.final?'FINAL':'LIVE');
  const detail=season
    ?(isPendingSeason?'No qualifying final weekend yet':r.seasonWeeks+' final '+(r.seasonWeeks===1?'week':'weeks')+' · '+(r.seasonQualified?'title qualified':'title pending'))
    :r.hits+'–'+r.misses+' · '+(r.accuracy===null?'No grades':r.accuracy.toFixed(1)+'% accurate')+(r.pending?' · '+r.pending+' pending':'');
  const pct=isPendingSeason?0:Math.max(0,Math.min(100,score/105*100));
  return `<div class="king-person ${eligible&&rank===1?'king-first':''} ${isPendingSeason?'king-unranked':''}" aria-label="${esc(r.name)}: ${isPendingSeason?'not yet ranked':kingPoints(score)+' crown points'}, ${esc(status)}">
    <span class="king-rank" aria-hidden="true">${isPendingSeason?'—':String(rank).padStart(2,'0')}</span>
    <div class="king-row-main">
      <div class="king-row-head">
        <button class="profile-link" data-profile="${esc(r.name)}">${esc(r.name)}</button>
        <span class="king-state ${eligible?'is-eligible':''}">${esc(status)}</span>
      </div>
      <div class="king-meter" role="img" aria-label="${season?'Season':'Weekend'} rating ${label} out of 105">
        <span class="king-meter-fill" style="width:${pct.toFixed(2)}%"></span>
      </div>
      <small>${esc(detail)}</small>
    </div>
    <div class="king-number">${kingLoaded?label:'—'}<span>${isPendingSeason?'':' CP'}</span></div>
  </div>`;
 }).join('')||'<p class="king-empty">No scoring records yet.</p>';
}
function setKingPeriod(period){
 kingPeriod=period==='season'?'season':'weekend';
 const season=kingPeriod==='season';
 $('kingWeekendPanel').hidden=season;
 $('kingSeasonPanel').hidden=!season;
 $('kingWeekendToggle').classList.toggle('active',!season);
 $('kingSeasonToggle').classList.toggle('active',season);
 $('kingWeekendToggle').setAttribute('aria-pressed',String(!season));
 $('kingSeasonToggle').setAttribute('aria-pressed',String(season));
}
function kingWagers(){const names=[...new Set(bets.map(b=>b.owner))].sort();$('leaderboard').innerHTML='<div class="king-table-wrap"><table class="king-table"><thead><tr><th>CREW</th><th>KNOWN WAGERS</th><th>FEED RETURN</th><th>FEED NET*</th></tr></thead><tbody>'+names.map(name=>{const all=bets.filter(b=>b.owner===name),c=CrewModel.cashStats(all,ticketStatus,isFinalTicket);return `<tr><th scope="row"><button class="profile-link" data-profile="${esc(name)}">${esc(name)}</button><br><small>${c.known} confirmed stakes · ${c.unverified} unverified</small></th><td>${c.known?money(c.wager):'—'}</td><td>${c.settled?money(c.returned):'—'}</td><td class="${c.net<0?'negative':''}">${c.net===null?'—':money(c.net)}</td></tr>`;}).join('')+'</tbody></table></div>';}
function renderLeaderboard(){
 const view=KingModel.standings(kingConfig,bets,boardDate(),kingEvaluations());$('kingSeasonYear').textContent=view.season+' SEASON';$('kingWeekendDate').textContent='WEEK OF '+dateText(view.week).toUpperCase();$('kingSeasonRows').innerHTML=kingRows(view.seasonRows,'season');$('kingWeekendRows').innerHTML=kingRows(view.weekendRows,'weekend');
 const qualifiedWeekCount=Math.max(0,...view.seasonRows.map(r=>r.seasonWeeks));
 $('kingSeasonHint').textContent=qualifiedWeekCount===0?'No qualifying final weekends yet · Season points begin after the first qualified week.':'Season scores average qualified final weekends · Three required for the title.';
 setKingPeriod(kingPeriod);
 const feedDelayed=scoreState==='failed'||livefieldFailures.size>0||scoreboardFailures>0;
 $('kingStatus').textContent=kingDelayed?'Records delayed · showing saved rankings':!kingLoaded?'Loading standings…':(feedDelayed?'Feed delayed · ':'')+'5 graded picks to qualify · Live scores provisional'+(view.issues.length?' · '+view.issues.length+' awaiting verification':'');
 renderScoringAudit(view);kingWagers();
 const lead=rows=>{const valid=rows.filter(r=>r.weekendEligible||(r.seasonWeeks>0));if(!kingLoaded||!valid.length)return 'Awaiting records';const top=valid[0];return esc(top.name)+' <strong>'+kingPoints(top.weekendPoints)+' CP</strong>';};
 const season=view.seasonRows.filter(r=>r.seasonWeeks>0),parts=['<span>WEEKEND · '+lead(view.weekendRows)+'</span>','<span>SEASON · '+(season.length?esc(season[0].name)+' '+kingPoints(season[0].seasonPoints)+' avg CP':'awaiting first final week')+'</span>',...view.events.slice(0,4).map(e=>'<span><strong>'+esc(e.owner)+'</strong> · '+esc(e.title)+' HIT'+(e.live?' · LIVE':' · FINAL')+'</span>')];
 const ticker=parts.join('');if(ticker!==kingTickerSignature){kingTickerSignature=ticker;$('kingTickerGroup').innerHTML=ticker;$('kingTickerCopy').innerHTML=ticker;kingFitTicker();}
}
function renderScoringAudit(view){$('kingScoringAudit').innerHTML=view.report.decisions.filter(r=>r.week===view.week).map(r=>`<div class="king-person"><div><strong>${esc(r.owner)} · ${esc(legText(r.leg))}</strong><small>${esc(r.selected?'COUNTS IN ACCURACY · '+r.status+(r.confirmed?' · final':' · provisional'):r.reason)}</small></div><div>${r.selected&&r.status==='hit'?'✓':r.selected&&r.status==='miss'?'✕':'—'}</div></div>`).join('')||'<p class="king-empty">No picks this weekend.</p>';}
function kingFitTicker(){requestAnimationFrame(()=>{const running=$('kingTickerGroup').scrollWidth>$('kingTickerWindow').clientWidth;$('kingTicker').classList.toggle('running',running);$('kingTickerPause').hidden=!running;});}
async function loadKing(){if(kingBusy)return;kingBusy=true;try{const config=await fetchJson('./king.json');if(config.version!==1||config.rulesVersion!==KingModel.RULES||!Array.isArray(config.registrations)||!Array.isArray(config.results))throw Error('Invalid contest records');kingConfig=config;window.OddsRecords=config;kingLoaded=true;kingDelayed=false;}catch{kingDelayed=true;}finally{kingBusy=false;if(typeof isFinalTicket==='function'){render();}}}
$('kingWeekendToggle').addEventListener('click',()=>setKingPeriod('weekend'));
$('kingSeasonToggle').addEventListener('click',()=>setKingPeriod('season'));
$('kingQuickRefresh').addEventListener('click',async()=>{await syncPublished();await refreshLive(false);await loadKing();});
$('kingTickerPause').addEventListener('click',()=>{kingTickerPaused=!kingTickerPaused;$('kingTicker').classList.toggle('paused',kingTickerPaused);$('kingTickerPause').textContent=kingTickerPaused?'▶':'Ⅱ';$('kingTickerPause').setAttribute('aria-label',kingTickerPaused?'Resume points ticker':'Pause points ticker');$('kingTickerPause').setAttribute('aria-pressed',String(kingTickerPaused));});$('kingTickerLink').addEventListener('click',()=>pickView('leaderboard'));window.addEventListener('resize',kingFitTicker);
document.addEventListener('DOMContentLoaded',loadKing);setInterval(()=>{if(!document.hidden)loadKing();},30000);
