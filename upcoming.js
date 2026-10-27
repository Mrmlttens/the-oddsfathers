'use strict';
const upcomingState={events:[],updatedAt:null,failed:false,busy:false,previous:new Map(),movement:new Map()};
function upcomingGames(events,time=Date.now()){return [...new Map(events.map(e=>[String(e.id),e])).values()].filter(e=>{const c=e.competitions?.[0],type=(c?.status||e.status)?.type;return type?.state==='pre'&&type.name!=='STATUS_CANCELED'&&type.name!=='STATUS_POSTPONED'&&Number.isFinite(Date.parse(e.date))&&Date.parse(e.date)>time;}).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,16);}
function upcomingLines(event){const c=event.competitions?.[0]||{},teams=c.competitors||[],away=teams.find(t=>t.homeAway==='away'),home=teams.find(t=>t.homeAway==='home'),odds=c.odds?.[0];
 const value=x=>x===null||x===undefined||x===''?'—':String(x);
 return {away:away?.team?.abbreviation||'AWAY',home:home?.team?.abbreviation||'HOME',awayName:away?.team?.displayName||'Away',homeName:home?.team?.displayName||'Home',provider:odds?.provider?.displayName||odds?.provider?.name||'Lines unavailable',spread:value(odds?.details),total:value(odds?.overUnder),awayML:value(odds?.moneyline?.away?.close?.odds??odds?.awayTeamOdds?.moneyLine),homeML:value(odds?.moneyline?.home?.close?.odds??odds?.homeTeamOdds?.moneyLine)};
}
function upcomingMovement(previous,current){const changes={};for(const k of ['spread','total','awayML','homeML']){if(!previous||previous.provider!==current.provider||previous[k]==='—'||current[k]==='—'||previous[k]===current[k])continue;const a=Number.parseFloat(String(previous[k]).replace(/^[^+\-\d.]*/,'')),b=Number.parseFloat(String(current[k]).replace(/^[^+\-\d.]*/,''));changes[k]={before:previous[k],direction:Number.isFinite(a)&&Number.isFinite(b)&&a!==b?(b>a?'↑':'↓'):'↔'};}return changes;}
function renderUpcoming(){const root=$('upcomingGames');if(!root)return;root.hidden=currentView!=='dashboard';if(root.hidden)return;const meta=$('upcomingMeta');meta.textContent=upcomingState.updatedAt?(upcomingState.failed?'UPDATE DELAYED · last success ':'Updated ')+new Date(upcomingState.updatedAt).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET · checks every 60s':upcomingState.failed?'Schedule unavailable · retrying automatically':'Loading schedule and lines…';
 const events=upcomingGames(upcomingState.events);
 $('upcomingList').innerHTML=events.map(e=>{const l=upcomingLines(e),changes=upcomingState.movement.get(String(e.id))||{},when=new Date(e.date).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
 const cell=(k,v)=>{const change=changes[k];return `<span class="upcoming-value${change?' line-moved':''}"${change?` title="Previous: ${esc(change.before)}"`:''}>${esc(v)}${change?` <small aria-label="Changed from ${esc(change.before)}">${change.direction}</small>`:''}</span>`;};
 return `<article class="upcoming-game"><div class="upcoming-match"><strong>${esc(l.away)} <span>@</span> ${esc(l.home)}</strong><small>${esc(when)} ET</small><small>${esc(l.provider)}</small></div><div><small>SPREAD</small>${cell('spread',l.spread)}</div><div><small>TOTAL</small>${cell('total',l.total)}</div><div><small>MONEYLINE</small><span class="upcoming-moneyline">${esc(l.away)} ${cell('awayML',l.awayML)}<br>${esc(l.home)} ${cell('homeML',l.homeML)}</span></div></article>`;}).join('')||`<p class="subtle">${upcomingState.failed?'Schedule unavailable. The next check will retry.':'No upcoming NFL games reported in the current schedule.'}</p>`;
}
async function refreshUpcoming(){if(upcomingState.busy)return;upcomingState.busy=true;
 try{const feed=await fetchJson(`${NFL_BASE}/scoreboard`);if(!Array.isArray(feed.events))throw Error('Invalid schedule response');const events=feed.events,choices=upcomingGames(events);
 for(const event of choices){const key=String(event.id),line=upcomingLines(event),before=upcomingState.previous.get(key);const changes=upcomingMovement(before,line);upcomingState.movement.set(key,changes);upcomingState.previous.set(key,line);}
 upcomingState.events=events;upcomingState.updatedAt=Date.now();upcomingState.failed=false;
 }catch{upcomingState.failed=true;}finally{upcomingState.busy=false;renderUpcoming();}}
$('upcomingRefresh').addEventListener('click',refreshUpcoming);
// app-views.pickView is the single navigation/render owner.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshUpcoming();});
refreshUpcoming();setInterval(()=>{if(!document.hidden)refreshUpcoming();},60000);
