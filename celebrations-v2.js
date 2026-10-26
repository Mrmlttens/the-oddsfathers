'use strict';
// V2-only state: previewing or testing never marks V1 celebrations as seen.
const POPUP_SEEN_KEY='oddsfathers.v2.popup-seen.v1',POPUP_WINS_KEY='oddsfathers.v2.popup-wins.v1';
function popupRead(key){const value=readJSON(key,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
let popupSeen=popupRead(POPUP_SEEN_KEY),popupQueue=[],popupCurrent=null,popupFocus=null;
const popupGamesObserved=new Set(),popupQueued=new Set();
winEvents=popupRead(POPUP_WINS_KEY);
function popupSave(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function popupMarkSeen(key){popupSeen[key]=now();const cutoff=Date.now()-3*86400000;popupSeen=Object.fromEntries(Object.entries(popupSeen).filter(([,time])=>new Date(time).getTime()>cutoff));popupSave(POPUP_SEEN_KEY,popupSeen);}
function popupGameKey(game){return [game?.date,norm(game?.away),norm(game?.home)].join('|');}
function popupLegKey(bet,leg){return ['leg',popupGameKey(legGame(leg,bet)),norm(leg.name||leg.team),leg.kind,leg.side||'atleast',leg.target??'',JSON.stringify(leg.scope||{})].join('|');}
function popupOwnerLegKey(bet,leg){return 'owner|'+norm(bet.owner)+'|'+popupLegKey(bet,leg);}
function popupPendingOwnerKeys(){return new Set([popupCurrent,...popupQueue].filter(Boolean).flatMap(e=>e.seenKeys||[]));}
function popupOwners(entries){const owners=new Map();for(const {bet} of entries){const prior=owners.get(bet.owner);owners.set(bet.owner,prior===true||bet.placed!==false);}return [...owners].map(([name,confirmed])=>name);}
function queuePopup(event){if(!event.demo&&(popupSeen[event.key]||popupQueued.has(event.key)))return;popupQueued.add(event.key);if(event.type==='win')popupQueue.unshift(event);else popupQueue.push(event);pumpPopup();}
function pumpPopup(){if(popupCurrent||document.hidden||!popupQueue.length)return;const event=popupQueue.shift();if(!event.demo&&event.type==='win'){const bet=bets.find(b=>b.id===event.betId);if(!bet||ticketStatus(bet)!=='won'){popupQueued.delete(event.key);pumpPopup();return;}}popupCurrent=event;paintPopup(event);}
function paintPopup(event){
 const root=$('celebration');if(!root)return;
 clearTimeout(celebrationTimer);root.classList.toggle('milestone',event.type!=='win');
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','celebrationTitle');root.setAttribute('aria-describedby','celebrationSubtitle');
 root.querySelector('.celebration-label').textContent=event.demo?'PREVIEW · SAMPLE RESULT':event.type==='catchup'?'WHILE YOU WERE AWAY':'THE ODDSFATHERS';
 root.querySelector('.celebration-crown').textContent=event.type==='win'?'♛':event.touchdown?'🏈':'✓';
 $('celebrationTitle').textContent=event.title;$('celebrationSubtitle').textContent=event.subtitle||'';
 const receipts=event.pointReceipts?(event.demo?event.pointReceipts:validatePopupPointReceipts(event.pointReceipts)):null;
 $('celebrationPeople').innerHTML=receipts?receipts.map(r=>`<span class="celebration-person">${esc(r.owner)} <strong>${r.points===null?'POINTS LOADING':(!r.cumulative&&r.points===0?'RATING '+Number(r.rating||0).toFixed(2):(r.cumulative?'':'+')+Number(r.points).toFixed(2))+' CP'}</strong><small>${esc(r.cumulative?'weekend rating · already included':r.points>0?(r.live?'rating change · live':'rating change'):r.reason)}</small></span>`).join(''):(event.owners||[]).map(owner=>`<span class="celebration-person">${esc(owner)}</span>`).join('');
 $('celebrationStats').classList.toggle('four',(event.stats||[]).length===4);
 $('celebrationStats').hidden=!event.stats?.length;$('celebrationStats').innerHTML=(event.stats||[]).map(stat=>`<div class="celebration-stat"><strong>${esc(stat.value)}</strong><small>${esc(stat.label)}</small></div>`).join('');
 $('celebrationNote').textContent=event.demo?'Demo only. No tickets, stats or results were changed.':event.note||'Reported player stats · Verify sportsbook grading.';
 $('celebrationDismiss').textContent='GOT IT'+(popupQueue.length?' · '+popupQueue.length+' MORE':'');
 $('celebrationSparks').innerHTML=Array.from({length:event.type==='win'?45:18},()=>`<i style="--x:${Math.round(Math.random()*100)}%;--delay:${(Math.random()*.5).toFixed(2)}s;--duration:${(2+Math.random()*2).toFixed(2)}s;--rot:${Math.round(Math.random()*720)}deg"></i>`).join('');
 if(!popupFocus)popupFocus=document.activeElement;root.hidden=false;root.classList.add('visible');$('celebrationDismiss').focus({preventScroll:true});
 if(!document.hidden)celebrationTimer=setTimeout(()=>{if(!document.hidden)dismissCelebration();},event.type==='win'?8500:6000);
}
function dismissCelebration(){
 clearTimeout(celebrationTimer);if(document.hidden)return;
 const root=$('celebration');root?.classList.remove('visible');if(root)root.hidden=true;
 if(popupCurrent){if(!popupCurrent.demo){for(const key of popupCurrent.seenKeys||[popupCurrent.key])popupMarkSeen(key);}popupQueued.delete(popupCurrent.key);}
 popupCurrent=null;
 if(popupQueue.length)pumpPopup();else{popupFocus?.focus?.({preventScroll:true});popupFocus=null;}
}
function checkLegMilestones(){
 if(typeof refreshPopupPointState==='function')refreshPopupPointState();
 const groups=new Map(),pending=popupPendingOwnerKeys();
 for(const bet of bets){if(!bet.legs?.length||(bet.archivedAt&&ticketGames(bet).every(g=>g.date<boardDate())))continue;
  for(const leg of bet.legs){const game=legGame(leg,bet),ev=findEvent(game);if(leg.kind==='ml'||!ev||!statsByEvent.has(String(ev.id))||livefieldFailures.has(String(ev.id)))continue;
   const value=evalLeg(leg,bet);if(value.status!=='hit'||value.source==='manual')continue;
   const seenKey=popupOwnerLegKey(bet,leg);if(popupSeen[seenKey]||pending.has(seenKey))continue;
   if(game.date<boardDate()&&statusOfGame(game)!=='in'){popupMarkSeen(seenKey);continue;}
   const key=popupLegKey(bet,leg);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({bet,leg,value,event:ev,seenKey});
  }
 }
 const catchups=new Map();
 for(const [key,entries] of groups){const {bet,leg}=entries[0],gameKey=popupGameKey(legGame(leg,bet));
  if(!popupGamesObserved.has(gameKey)){if(!catchups.has(gameKey))catchups.set(gameKey,[]);catchups.get(gameKey).push(...entries);continue;}
  const seenKeys=[...new Set(entries.map(e=>e.seenKey))],touchdown=['any_td','either_td','drive_offensive_td'].includes(leg.kind);
  queuePopup({key:'milestone|'+seenKeys.slice().sort().join('~'),seenKeys,type:'leg',touchdown,title:touchdown?'TOUCHDOWN!':'LEG HIT!',subtitle:leg.kind==='either_td'?'One of '+leg.name+(leg.target>1?' reached '+leg.target+' touchdowns!':' scored!'):leg.kind==='any_td'?leg.name+(leg.target>1?' reached '+leg.target+' touchdowns!':' scored!'):legText(leg),owners:popupOwners(entries),pointReceipts:typeof popupPointReceipts==='function'?popupPointReceipts(entries):null});
 }
 for(const [key,entries] of catchups){const count=new Set(entries.map(({bet,leg})=>popupLegKey(bet,leg))).size,seenKeys=[...new Set(entries.map(e=>e.seenKey))];
  queuePopup({key:'catchup|'+seenKeys.slice().sort().join('~'),seenKeys,type:'catchup',title:'LEGS HIT WHILE AWAY',subtitle:count+' player milestone'+(count===1?'':'s')+' cleared before this check.',owners:popupOwners(entries),pointReceipts:typeof popupPointReceipts==='function'?popupPointReceipts(entries):null,note:'Catch-up from reported stats. Points shown are already included in the standings; this alert does not add them again.'});
 }
 for(const bet of bets)for(const game of ticketGames(bet)){const ev=findEvent(game);if(ev&&statsByEvent.has(String(ev.id))&&!livefieldFailures.has(String(ev.id)))popupGamesObserved.add(popupGameKey(game));}
}
function ticketPopup(bet){
 const cleared=bet.legs.filter(leg=>evalLeg(leg,bet).status==='hit').length,total=bet.legs.length,official=bet.settlement==='won';
 const payout=Number.isFinite(bet.payout)?bet.payout:null,stake=Number.isFinite(bet.stake)?bet.stake:null;
 const pointReceipts=typeof popupPointReceipts==='function'?popupPointReceipts(bet.legs.map(leg=>({bet,leg})),true):null;
 const profit=payout!==null&&stake!==null?payout-stake:null,estimated=bet.stakeEstimated||bet.payoutEstimated;
 return {key:'win|'+bet.id,betId:bet.id,type:'win',title:official?'TICKET WON!':'ALL LEGS HIT!',subtitle:bet.title,owners:[bet.owner],pointReceipts,stats:[{label:cleared===total?'LEGS CLEARED':'LEGS TRACKED',value:cleared+' / '+total},{label:bet.payoutEstimated?'EST. RETURN':official?'TOTAL RETURN':'LISTED RETURN',value:money(payout)},{label:estimated?'EST. PROFIT*':'PROFIT*',value:profit===null?'N/A':(profit>0?'+':'')+money(profit)},...(pointReceipts?[{label:'WEEKEND RATING',value:pointReceipts.some(r=>r.points===null)?'Loading':pointReceipts.reduce((n,r)=>n+r.points,0)+' CP'}]:[])],note:'*Profit is return minus wager, before fees. '+(official?'Reported settled win.':'Awaiting sportsbook confirmation.')};
}
function checkWinners(){
 for(const bet of bets){if(ticketStatus(bet)!=='won'){if(winEvents[bet.id])delete winEvents[bet.id];continue;}
  const event=ticketPopup(bet);winEvents[bet.id]={id:bet.id,owner:bet.owner,title:bet.title,payout:bet.payout,stake:bet.stake,time:winEvents[bet.id]?.time||now(),legs:bet.legs.length};
  if(ticketGames(bet).every(g=>g.date<boardDate())&&ticketGames(bet).every(g=>statusOfGame(g)!=='in')){popupMarkSeen(event.key);continue;}
  queuePopup(event);
 }
 popupSave(POPUP_WINS_KEY,winEvents);renderRecentHits();
}
function showRecentOnReturn(){pumpPopup();}
// Retained for callers; all full wins use the same queue and detail card.
function showCelebration(win){const bet=bets.find(b=>b.id===win.id);if(bet&&ticketStatus(bet)==='won')queuePopup(ticketPopup(bet));}
function previewCelebration(type){
 const unique='demo|'+Date.now()+'|'+Math.random();
 queuePopup({key:unique,demo:true,type:type==='td'?'leg':'win',touchdown:type==='td',title:type==='td'?'TOUCHDOWN!':'ALL LEGS HIT!',subtitle:'Sample animation only',owners:['Demo member'],pointReceipts:[{owner:'Demo member',points:1,live:true}],stats:type==='td'?[]:[{label:'EXAMPLE ONLY',value:'DEMO'}]});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(celebrationTimer);return;}if(popupCurrent)paintPopup(popupCurrent);else pumpPopup();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&popupCurrent)dismissCelebration();});
document.getElementById('previewTouchdown')?.addEventListener('click',()=>previewCelebration('td'));
document.getElementById('previewTicketWin')?.addEventListener('click',()=>previewCelebration('win'));





