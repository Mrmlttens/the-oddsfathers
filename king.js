'use strict';
let kingConfig={version:1,rulesVersion:KingModel.RULES,registrations:[],results:[],games:[]},kingLoaded=false,kingDelayed=false,kingBusy=false,kingTickerPaused=false,kingTickerSignature='',kingPeriod='weekend';
function kingEvaluations(){const values=[];for(const r of KingModel.registrations(kingConfig,bets)){const bet={id:r.betId,owner:r.owner,game:r.game,legs:[r.leg]},event=findEvent(r.game);if(!event)continue;const value=evalLeg(r.leg,bet);values.push({...value,betId:r.betId,legIndex:r.legIndex,gameStart:event.date,gameState:statusOfGame(r.game),observedAt:value.observedAt||(livefieldSummaries.get(String(event.id))?.time?new Date(livefieldSummaries.get(String(event.id)).time).toISOString():r.submittedAt)});}return values;}
function kingPoints(n){return Number(n||0).toFixed(2);}
function kingRows(rows,period,view){
 const season=period==='season';
 const ordered=season?[...rows].sort((a,b)=>
   Number(b.seasonWeeks>0)-Number(a.seasonWeeks>0)||
   (a.seasonWeeks>0?b.seasonPoints-a.seasonPoints:
    (Number(b.graded>=KingModel.MINIMUM)-Number(a.graded>=KingModel.MINIMUM)||b.weekendPoints-a.weekendPoints))||
   a.name.localeCompare(b.name)):rows;
 let last=null,rank=0;
 return ordered.map(r=>{
  const hasOfficial=season&&r.seasonWeeks>0,preview=season&&!hasOfficial&&r.graded>=KingModel.MINIMUM;
  const pending=season&&!hasOfficial&&!preview;
  const display=season?(hasOfficial?r.seasonPoints:preview?r.weekendPoints:null):r.weekendPoints;
  const eligible=season?r.seasonQualified:r.weekendEligible,ranked=!season||hasOfficial;
  if(ranked){if(last===null||Math.abs(display-last)>1e-8)rank++;last=display;}
  const status=season?(preview?'LIVE PREVIEW':pending?'PENDING':r.seasonQualified?'QUALIFIED':r.seasonWeeks+' / 3 FINAL'):
   (r.graded<KingModel.MINIMUM?r.weekendToQualify+' TO QUALIFY':r.final?'FINAL':'LIVE');
  const detail=season?(preview?'Current week · not official':pending?'Awaiting a qualified final week':r.seasonWeeks+' qualifying final '+(r.seasonWeeks===1?'week':'weeks')):
   r.hits+'–'+r.misses+' · '+(r.accuracy===null?'No grades':r.accuracy.toFixed(1)+'% accurate')+(r.pending?' · '+r.pending+' pending':'');
  const label=display===null?'—':kingPoints(display),pct=display===null?0:Math.max(0,Math.min(100,display/105*100));
  const p=CrewModel.profile(r.name,bets,view,ticketStatus,isFinalTicket);
  const xpProgress=Math.max(0,Math.min(100,p.rankProgress*100));
  return `<details class="king-person king-member ${eligible&&rank===1?'king-first':''} ${pending?'king-unranked':''} ${preview?'king-preview':''}" data-owner="${esc(r.name)}" data-period="${period}">
   <summary class="king-member-summary" aria-label="${esc(r.name)}, ${esc(status)}, ${label} crown rating, ${p.xp} experience points; expand for full profile">
    <span class="king-rank" aria-hidden="true">${ranked?String(rank).padStart(2,'0'):'—'}</span>
    <span class="king-member-avatar" aria-hidden="true">${esc(r.name.slice(0,1).toUpperCase())}</span>
    <span class="king-row-main">
      <span class="king-row-head"><strong class="profile-link king-member-name">${esc(r.name)}</strong><span class="king-state ${eligible?'is-eligible':''}">${esc(status)}</span></span>
      <span class="king-meter" role="img" aria-label="${season?(preview?'Provisional season preview':'Official season'):'Weekend'} rating ${label} out of 105"><span class="king-meter-fill" style="width:${pct.toFixed(2)}%"></span></span>
      <span class="king-member-meta">LVL ${Math.floor(p.xp/100)+1} · ${p.xp} XP · ${esc(detail)}</span>
      <span class="king-xp-mini" role="img" aria-label="Level progress ${Math.round(xpProgress)} percent"><span style="width:${xpProgress.toFixed(1)}%"></span></span>
    </span>
    <span class="king-number">${kingLoaded?label:'—'}<span>${display===null?'':preview?' PREVIEW':' CP'}</span></span>
    <span class="king-member-chevron" aria-hidden="true">⌄</span>
   </summary>
   <div class="king-member-info" data-loaded="" aria-label="${esc(r.name)} profile statistics"></div>
  </details>`;
 }).join('')||'<p class="king-empty">No crew predictions yet.</p>';
}
function kingRememberOpen(){
 return [...document.querySelectorAll('#kingWeekendRows details.king-member[open],#kingSeasonRows details.king-member[open]')]
  .map(el=>({owner:el.dataset.owner,period:el.dataset.period,sections:
    [...el.querySelectorAll('[data-profile-panel][open]')].map(x=>x.dataset.profilePanel)}));
}
function kingHydrateMember(member,sections=[]){
 if(!member?.open)return;
 const target=member.querySelector('.king-member-info'),owner=member.dataset.owner;
 if(target.dataset.loaded===owner)return;
 // Reuse the existing complete crew dossier, but render it only when expanded.
 profileOwner=owner;
 renderProfiles();
 target.innerHTML=$('profileDetail').innerHTML;
 target.dataset.loaded=owner;
 for(const section of sections){
  const el=[...target.querySelectorAll('[data-profile-panel]')].find(x=>x.dataset.profilePanel===section);
  if(el)el.open=true;
 }
}
function kingRestoreOpen(previous){
 for(const item of previous){
  const root=$(item.period==='season'?'kingSeasonRows':'kingWeekendRows');
  const el=[...root.querySelectorAll('details.king-member')].find(x=>x.dataset.owner===item.owner);
  if(el){el.open=true;kingHydrateMember(el,item.sections);}
 }
}
function kingExpandMember(owner){
 pickView('leaderboard');
 const root=$(kingPeriod==='season'?'kingSeasonRows':'kingWeekendRows');
 const member=[...root.querySelectorAll('details.king-member')].find(x=>x.dataset.owner===owner);
 if(!member)return;
 member.open=true;
 kingHydrateMember(member);
 member.scrollIntoView({behavior:'smooth',block:'nearest'});
}
document.addEventListener('toggle',e=>{
 const member=e.target;
 if(!member.matches?.('details.king-member')||!member.open)return;
 const root=member.parentElement;
 for(const other of root.querySelectorAll('details.king-member[open]'))if(other!==member)other.open=false;
 kingHydrateMember(member);
},true);
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
function renderLeaderboard(tickerOnly=false){
 const view=KingModel.standings(kingConfig,bets,boardDate(),kingEvaluations());
 if(!tickerOnly){const previous=kingRememberOpen();$('kingSeasonYear').textContent=view.season+' SEASON';$('kingWeekendDate').textContent='WEEK OF '+dateText(view.week).toUpperCase();$('kingSeasonRows').innerHTML=kingRows(view.seasonRows,'season',view);$('kingWeekendRows').innerHTML=kingRows(view.weekendRows,'weekend',view);kingRestoreOpen(previous);
 const qualifiedWeekCount=Math.max(0,...view.seasonRows.map(r=>r.seasonWeeks));
 const endOfWeek=new Date(view.week+'T12:00:00Z');endOfWeek.setUTCDate(endOfWeek.getUTCDate()+6);
 $('kingSeasonHint').textContent=qualifiedWeekCount===0?'Official season ratings pending · This week ends '+dateText(endOfWeek.toISOString().slice(0,10))+'. LIVE PREVIEW bars use current results, not official season points.':'Official season ratings average qualified final weeks only · Three completed weeks required for the title.';
 setKingPeriod(kingPeriod);
 const feedDelayed=scoreState==='failed'||livefieldFailures.size>0||scoreboardFailures>0;
 $('kingStatus').textContent=kingDelayed?'Records delayed · showing saved rankings':!kingLoaded?'Loading standings…':(feedDelayed?'Feed delayed · ':'')+'5 graded picks to qualify · Live scores provisional'+(view.issues.length?' · '+view.issues.length+' awaiting verification':'');
 renderScoringAudit(view);kingWagers();
 }
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
