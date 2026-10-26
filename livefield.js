'use strict';
function livefieldData(raw,event){
 const competition=event?.competitions?.[0]||raw?.header?.competitions?.[0]||{};
 const teams=competition.competitors||[];
 const drives=[...(raw?.drives?.previous||[]),...(raw?.drives?.current?[raw.drives.current]:[])];
 const plays=[...new Map(drives.flatMap(d=>d.plays||[]).filter(p=>p.text).map(p=>[String(p.id||p.sequenceNumber||p.text),p])).values()].sort((a,b)=>Number(a.sequenceNumber||0)-Number(b.sequenceNumber||0));
 const latest=plays.at(-1)||null;
 const state=(competition.status||event?.status||raw?.header?.competitions?.[0]?.status)?.type?.state||'pre';
 const situation=competition.situation||{};
 const possession=String(situation.possession||latest?.end?.team?.id||'');
 const offense=teams.find(t=>String(t.id||t.team?.id)===possession);
 const y=latest?.end?.yardsToEndzone;
 const position=state==='in'&&offense&&String(latest?.end?.team?.id)===possession&&typeof y==='number'&&Number.isFinite(y)?Math.max(0,Math.min(100,offense.homeAway==='away'?100-y:y)):null;
 const distance=latest?.end?.distance;
 const first=position!==null&&typeof distance==='number'&&distance>0?Math.max(0,Math.min(100,position+(offense.homeAway==='away'?distance:-distance))):null;
 return {competition,teams,plays,latest,state,situation,offense,position,first,drive:raw?.drives?.current||null};
}
function renderGameCenter(){
 const root=document.getElementById('livefield');if(!root)return;root.hidden=currentView!=='dashboard';
 const game=currentGame(),event=game?findEvent(game):null,key=String(event?.id||''),cached=livefieldSummaries.get(key),data=livefieldData(cached?.raw,event);
 const stale=livefieldFailures.has(key)||scoreState==='failed'||(cached&&Date.now()-cached.time>90000);
 const away=data.teams.find(t=>t.homeAway==='away'),home=data.teams.find(t=>t.homeAway==='home');
 const tag=t=>t?.team?.abbreviation||'—';
 const score=t=>t?.score===undefined?'—':typeof t.score==='object'?t.score.displayValue??'—':t.score;
 const meta=document.getElementById('lfMeta');meta.classList.toggle('stale',!!stale);
 meta.textContent=!cached?'ESPN · Awaiting game details':(stale?'UPDATE DELAYED':'ESPN')+' · '+new Date(cached.time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+' · checks every 30s';
 const st=data.competition.status||event?.status||{};
 document.getElementById('lfScore').innerHTML=`<span class="lf-team">${esc(away?tag(away):game?teamAbbr(game.away):'AWAY')} <b>${esc(score(away))}</b></span><span class="lf-clock">${esc(st.type?.shortDetail||'Awaiting game feed')}</span><span class="lf-team"><b>${esc(score(home))}</b> ${esc(home?tag(home):game?teamAbbr(game.home):'HOME')}</span>`;
 const spot=data.situation.downDistanceText||data.latest?.end?.downDistanceText||'';
 document.getElementById('lfSituation').innerHTML=data.state==='in'?`<strong>${esc(data.offense?tag(data.offense)+' POSSESSION':'POSSESSION UNAVAILABLE')}</strong><span>${esc(spot||'Down & distance unavailable')}</span>`:`<span>${data.state==='post'?'FINAL · Last reported game details':game?esc(dateText(game.date)):'Choose a game on the board'}</span>`;
 const field=document.getElementById('lfField');field.dataset.away=away?tag(away):game?teamAbbr(game.away):'AWAY';field.dataset.home=home?tag(home):game?teamAbbr(game.home):'HOME';
 field.innerHTML='<div class="lf-turf">'+[10,20,30,40,50,60,70,80,90].map(n=>`<span class="lf-number" style="left:${n}%">${n<=50?n:100-n}</span>`).join('')+(data.position===null?'':`<span class="lf-los" style="left:${data.position}%"></span><span class="lf-ball" style="left:${data.position}%"></span>${data.first===null?'':`<span class="lf-first" style="left:${data.first}%"></span>`}`)+`</div><span class="lf-field-note">${data.position===null?(data.state==='post'?'GAME COMPLETE':'AWAITING FIELD POSITION'):'LATEST REPORTED SPOT · '+esc(data.offense?tag(data.offense):'')+(data.offense?.homeAway==='away'?' →':' ←')}</span>`;
 field.setAttribute('aria-label',data.position===null?'Football field; no live position available':'Football field. '+spot+'. '+(data.offense?tag(data.offense):'')+' possession.');
 document.getElementById('lfLast').textContent=data.latest?.text||(data.state==='pre'?'Play-by-play appears when the game feed starts.':'Play-by-play unavailable for this game.');
 const drive=data.drive;document.getElementById('lfDrive').textContent=drive?(drive.description||[drive.offensivePlays===undefined?'':drive.offensivePlays+' plays',drive.yards===undefined?'':drive.yards+' yards',drive.timeElapsed?.displayValue||''].filter(Boolean).join(' · ')):'';
 const pairs=new Map();for(const bet of bets.filter(b=>game&&ticketGames(b).some(g=>g.date===game.date&&teamEquals(g.home,game.home)&&teamEquals(g.away,game.away)))){for(const leg of bet.legs||[]){const lg=legGame(leg,bet);if(['ml','spread'].includes(leg.kind)||lg.date!==game.date||!teamEquals(lg.home,game.home)||!teamEquals(lg.away,game.away))continue;const k=norm(leg.name)+'|'+leg.kind+'|'+(leg.side||'atleast')+'|'+leg.target+'|'+JSON.stringify(leg.scope||{});if(!pairs.has(k))pairs.set(k,{leg,bet});}}
 const metric={passing_yards:'PASS YDS',passing_td:'PASS TD',rushing_yards:'RUSH YDS',receiving_yards:'REC YDS',receptions:'CATCHES',any_td:'TD',either_td:'EITHER TD'};
 const rows=[...pairs.values()].map(({leg,bet})=>{const value=cached?evalLeg(leg,bet):{value:null,status:'unknown'};return {leg,value};});
 const row=({leg,value})=>{const number=typeof value.value==='number'?value.value:null,target=leg.target||1,pc=number===null?0:Math.min(100,Math.max(0,number/target*100)),hit=value.status==='hit';return `<div class="lf-player"><div class="lf-player-head"><div><strong>${esc(leg.name)}</strong><br><span>${esc(leg.scope?.period?'Q'+leg.scope.period+' · ':leg.scope?.drive?'Drive '+leg.scope.drive+' · ':'')}${esc(metric[leg.kind]||leg.kind)} · ${esc(leg.side==='under'?'Under '+target:leg.side==='over'?'Over '+target:target+'+')} target</span></div><div class="lf-player-value ${hit?'hit':''}">${number===null?'—':esc(number)} <span>/ ${esc(target)}</span>${hit?' ✓':''}</div></div><div class="lf-meter"><i class="${hit?'hit':''}" style="width:${pc}%"></i></div></div>`;};
 document.getElementById('lfPlayers').innerHTML=rows.slice(0,4).map(row).join('')||'<p class="lf-empty">Player targets appear here when this game has tracked player bets.</p>';
 document.getElementById('lfMorePlayers').hidden=rows.length<=4;document.getElementById('lfMorePlayerCount').textContent='All tracked targets ('+rows.length+')';document.getElementById('lfMorePlayerRows').innerHTML=rows.slice(4).map(row).join('');
 const stat=(team,name)=>cached?.raw?.boxscore?.teams?.find(t=>String(t.team?.id)===String(team?.id||team?.team?.id))?.statistics?.find(s=>s.name===name)?.displayValue??'—';
 document.getElementById('lfStats').innerHTML=`<thead><tr><th scope="col">TEAM STATS</th><th scope="col">${esc(tag(away))}</th><th scope="col">${esc(tag(home))}</th></tr></thead><tbody>`+[['Total yards','totalYards'],['Passing yards','netPassingYards'],['Rushing yards','rushingYards'],['First downs','firstDowns'],['Turnovers','turnovers'],['Possession','possessionTime']].map(([label,name])=>`<tr><th scope="row">${label}</th><td>${esc(stat(away,name))}</td><td>${esc(stat(home,name))}</td></tr>`).join('')+'</tbody>';
 document.getElementById('lfPlays').innerHTML=data.plays.slice(-20).reverse().map(p=>`<li><small>Q${esc(p.period?.number||'—')} · ${esc(p.clock?.displayValue||'—')}${p.scoringPlay?' · SCORE':''}</small>${esc(p.text)}</li>`).join('')||'<li class="lf-empty">No reported plays yet.</li>';
}




