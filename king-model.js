(function(root){
'use strict';
const RULES='koto-10-slots-v1',LIMIT=10;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const clean=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
function week(date){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw Error('Invalid date');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-4+7)%7);return d.toISOString().slice(0,10);}
function season(date){const [y,m]=date.split('-').map(Number);return String(m<3?y-1:y);}
function familyKey(bet,leg){const game=leg.game||bet.game;return [clean(bet.owner),game.date,clean(game.away),clean(game.home),leg.kind==='ml'?'winner':leg.kind==='either_td'?(leg.players||[]).map(clean).sort().join('or'):clean(leg.name),leg.kind].join('|');}
function registrationId(betId,index){return betId+':'+index;}
function registrations(config,bets){
 const list=(config.registrations||[]).map(r=>({...r})),ids=new Set(list.map(r=>r.id));
 for(const b of bets)for(let i=0;i<(b.legs||[]).length;i++){const id=registrationId(b.id,i);if(!ids.has(id)){list.push({id,betId:b.id,legIndex:i,owner:b.owner,game:{...(b.legs[i].game||b.game)},leg:{...b.legs[i]},submittedAt:b.createdAt,title:b.title});ids.add(id);}}
 return list;
}
function scoringReport(config,bets,evaluations=[]){
 const evals=new Map(evaluations.map(e=>[registrationId(e.betId,e.legIndex),e]));
 const saved=new Map((config.results||[]).filter(r=>r.sourceVerified===true).map(r=>[r.registrationId,r]));
 const list=registrations(config,bets).sort((a,b)=>Date.parse(a.submittedAt)-Date.parse(b.submittedAt)||String(a.betId).localeCompare(String(b.betId))||a.legIndex-b.legIndex);
 const seen=new Set(),counts=new Map(),selected=[],decisions=[];
 for(const r of list){
  const key=familyKey({owner:r.owner,game:r.game},r.leg),w=week(r.game.date),ownerWeek=clean(r.owner)+'|'+w,e=evals.get(r.id),start=Date.parse(r.kickoff||e?.gameStart),submitted=Date.parse(r.submittedAt);
  let reason='scoring pick';
  if(!['ml','spread','passing_td','passing_yards','rushing_yards','receiving_yards','receptions','any_td','either_td','total_points'].includes(r.leg.kind))reason='unsupported selection';
  else if(!Number.isFinite(submitted)||!Number.isFinite(start))reason='kickoff/submission time unverified';
  else if(submitted>=start)reason='added after kickoff · tracking only';
  else if(seen.has(key))reason='duplicate or opposing player/stat/game';
  else if((counts.get(ownerWeek)||0)>=LIMIT)reason='10 scoring slots already used';
  else {seen.add(key);counts.set(ownerWeek,(counts.get(ownerWeek)||0)+1);}
  const previous=saved.get(r.id);
  const current=e&&e.source!=='manual'&&['in','post'].includes(e.gameState)?e:null;
  const result=current||previous;
  const state=r.leg.override==='void'?'void':result?.status||'unknown';
  const confirmed=state==='void'||result?.gameState==='post';
  const item={...r,key,week:w,season:season(r.game.date),reason,selected:reason==='scoring pick',status:state,confirmed,observedAt:result?.observedAt||r.submittedAt};
  decisions.push(item);if(item.selected)selected.push(item);
 }
 return {selected,decisions};
}
function liveLegAwards(config,bets,evaluations=[]){return scoringReport(config,bets,evaluations).selected.filter(r=>r.status==='hit').map(r=>({key:r.key,owner:r.owner,gameDate:r.game.date,week:r.week,season:r.season,points:1,confirmed:r.confirmed,title:r.leg.name?r.leg.name+' · '+r.leg.kind:r.leg.team+' win',time:r.observedAt,registrationId:r.id}));}
function standings(config,bets,today,evaluations=[]){
 const currentWeek=week(today),currentSeason=season(today),report=scoringReport(config,bets,evaluations),awards=liveLegAwards(config,bets,evaluations),events=[];
 const names=[...new Set([...bets.map(b=>b.owner),...report.selected.map(r=>r.owner)])];
 const rows=new Map(names.map(name=>[name,{name,seasonPoints:0,weekendPoints:0,seasonEntries:0,weekendEntries:0,weekendSettled:0,bonus:0,liveSeasonPoints:0,liveWeekendPoints:0,seasonLegPoints:0,weekendLegPoints:0}]));
 const groups=new Map();
 for(const r of report.selected){const row=rows.get(r.owner);if(r.season===currentSeason)row.seasonEntries++;if(r.week===currentWeek){row.weekendEntries++;if(r.confirmed&&['hit','miss','void'].includes(r.status))row.weekendSettled++;}if(!groups.has(r.week))groups.set(r.week,[]);groups.get(r.week).push(r);}
 for(const a of awards){const row=rows.get(a.owner);if(a.season===currentSeason){row.seasonPoints++;row.seasonLegPoints++;if(!a.confirmed)row.liveSeasonPoints++;}if(a.week===currentWeek){row.weekendPoints++;row.weekendLegPoints++;if(!a.confirmed)row.liveWeekendPoints++;}events.push({owner:a.owner,title:a.title,points:1,week:a.week,season:a.season,time:a.time,live:!a.confirmed});}
 let closedWeeks=0;
 for(const [w,picks] of groups){if(w>=currentWeek||season(w)!==currentSeason||picks.some(r=>!r.confirmed||!['hit','miss','void'].includes(r.status)))continue;closedWeeks++;
  const owners=[...new Set(picks.map(r=>r.owner))];if(owners.length<2)continue;
  const scores=owners.map(owner=>({owner,points:picks.filter(r=>r.owner===owner&&r.status==='hit').length})),best=Math.max(...scores.map(r=>r.points));if(best<=0)continue;
  const winners=scores.filter(r=>r.points===best);for(const winner of winners){const value=5/winners.length,row=rows.get(winner.owner);row.seasonPoints+=value;row.bonus+=value;events.push({owner:winner.owner,title:'Weekend crown bonus',points:value,week:w,season:currentSeason,time:w,live:false});}
 }
 const all=[...rows.values()],sort=(a,b,field)=>b[field]-a[field]||a.name.localeCompare(b.name);
 return {week:currentWeek,season:currentSeason,seasonRows:[...all].sort((a,b)=>sort(a,b,'seasonPoints')),weekendRows:[...all].sort((a,b)=>sort(a,b,'weekendPoints')),events:events.filter(e=>e.season===currentSeason).sort((a,b)=>String(b.time).localeCompare(String(a.time))),issues:report.decisions.filter(r=>r.reason==='kickoff/submission time unverified'),closedWeeks,report};
}
const api={RULES,LIMIT,round,week,season,familyKey,registrationId,registrations,scoringReport,liveLegAwards,standings};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.KingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);


