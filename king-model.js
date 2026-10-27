(function(root){'use strict';
const RULES='koto-accuracy-v3',MINIMUM=5,BONUS_CAP=5,SEASON_WEEKS=3;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
// Weekend CP is a rating, not a sum of independently credited legs.
const ratingChange=(previous,current)=>previous===null||previous===undefined?null:round(current-previous);
const clean=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
function week(date){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw Error('Invalid date');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-4+7)%7);return d.toISOString().slice(0,10);}
function season(date){const [y,m]=date.split('-').map(Number);return String(m<3?y-1:y);}
function familyKey(bet,leg){const g=leg.game||bet.game;return [clean(bet.owner),g.date,clean(g.away),clean(g.home),['ml','spread'].includes(leg.kind)?'winner':leg.kind==='either_td'?(leg.players||[]).map(clean).sort().join('or'):clean(leg.name),leg.kind,leg.scope?.period?'q'+leg.scope.period:leg.scope?.drive?'drive'+leg.scope.drive:'game'].join('|');}
const registrationId=(id,i)=>id+':'+i;
function registrations(config,bets){const list=(config.registrations||[]).map(r=>({...r})),ids=new Set(list.map(r=>r.id));for(const b of bets)for(let i=0;i<(b.legs||[]).length;i++){const id=registrationId(b.id,i);if(!ids.has(id)){list.push({id,betId:b.id,legIndex:i,owner:b.owner,game:{...(b.legs[i].game||b.game)},leg:{...b.legs[i]},submittedAt:b.createdAt,title:b.title});ids.add(id);}}return list;}
function scoringReport(config,bets,evaluations=[]){
 const evals=new Map(evaluations.map(e=>[registrationId(e.betId,e.legIndex),e])),saved=new Map((config.results||[]).filter(r=>r.sourceVerified===true).map(r=>[r.registrationId,r]));
 const list=registrations(config,bets).sort((a,b)=>Date.parse(a.submittedAt)-Date.parse(b.submittedAt)||String(a.betId).localeCompare(String(b.betId))||a.legIndex-b.legIndex),seen=new Set(),selected=[],decisions=[];
 for(const r of list){const key=familyKey({owner:r.owner,game:r.game},r.leg),w=week(r.game.date),e=evals.get(r.id),previous=saved.get(r.id),start=Date.parse(r.kickoff||e?.gameStart||previous?.gameStart),submitted=Date.parse(r.submittedAt);let reason='scoring pick';
  if(!['drive_offensive_td','ml','spread','passing_td','passing_yards','rushing_yards','receiving_yards','receptions','any_td','either_td','total_points'].includes(r.leg.kind))reason='unsupported selection';
  else if(!Number.isFinite(start)||!Number.isFinite(submitted))reason='kickoff/submission time unverified';else if(submitted>=start)reason='added after kickoff · tracking only';else if(seen.has(key))reason='duplicate or opposing player/stat/game';else seen.add(key);
  const current=e&&e.source!=='manual'&&['in','post'].includes(e.gameState)?e:null;
  const result=current&&['hit','miss','void'].includes(current.status)?current:previous||current;
  const state=result?.status||'unknown',confirmed=(result?.gameState==='post'||result?.scopeFinal===true)&&['hit','miss','void'].includes(state);
  const item={...r,key,week:w,season:season(r.game.date),reason,selected:reason==='scoring pick',status:state,value:result?.value??null,confirmed,observedAt:result?.observedAt||r.submittedAt};decisions.push(item);if(item.selected)selected.push(item);
 }return {selected,decisions};
}
function rating(correct,incorrect){const graded=correct+incorrect;return 100*correct/Math.max(MINIMUM,graded)+Math.min(BONUS_CAP,correct);}
function summarize(picks){const hits=picks.filter(r=>r.status==='hit').length,misses=picks.filter(r=>r.status==='miss').length,voids=picks.filter(r=>r.status==='void').length,graded=hits+misses;return {hits,misses,voids,graded,pending:picks.length-graded-voids,accuracy:graded?100*hits/graded:null,legCredit:Math.min(BONUS_CAP,hits),rating:rating(hits,misses),final:picks.length>0&&picks.every(r=>r.confirmed),qualifying:graded>=MINIMUM};}
function liveLegAwards(config,bets,evaluations=[]){return scoringReport(config,bets,evaluations).selected.filter(r=>r.status==='hit').map(r=>({key:r.key,owner:r.owner,gameDate:r.game.date,week:r.week,season:r.season,points:null,confirmed:r.confirmed,title:r.leg.name?r.leg.name+' · '+r.leg.kind:r.leg.team+' win',time:r.observedAt,registrationId:r.id}));}
function standings(config,bets,today,evaluations=[]){
 const currentWeek=week(today),currentSeason=season(today),report=scoringReport(config,bets,evaluations),groups=new Map();for(const r of report.selected){const id=r.owner+'|'+r.week;if(!groups.has(id))groups.set(id,{owner:r.owner,week:r.week,season:r.season,picks:[]});groups.get(id).picks.push(r);}
 const weeks=[...groups.values()].map(g=>({...g,...summarize(g.picks)})),names=[...new Set([...bets.map(b=>b.owner),...report.selected.map(r=>r.owner)])];
 const rows=names.map(name=>{const all=weeks.filter(g=>g.owner===name&&g.season===currentSeason),current=all.find(g=>g.week===currentWeek)||{...summarize([]),picks:[]},closed=all.filter(g=>g.week<currentWeek&&g.final&&g.qualifying),qualified=closed.length;return {name,seasonPoints:closed.length?closed.reduce((s,g)=>s+g.rating,0)/closed.length:0,seasonWeeks:closed.length,qualifiedWeeks:qualified,seasonQualified:qualified>=SEASON_WEEKS,seasonEntries:all.reduce((s,g)=>s+g.picks.length,0),seasonLegPoints:all.reduce((s,g)=>s+g.hits,0),weekendPoints:current.rating,weekendEligible:current.qualifying,weekendToQualify:Math.max(0,MINIMUM-current.graded),weekendEntries:current.picks.length,weekendSettled:current.picks.filter(r=>r.confirmed).length,weekendLegPoints:current.hits,liveWeekendPoints:current.picks.filter(r=>!r.confirmed&&r.status==='hit').length,...current};});
 const seasonRows=[...rows].sort((a,b)=>Number(b.seasonQualified)-Number(a.seasonQualified)||b.seasonPoints-a.seasonPoints||a.name.localeCompare(b.name)),weekendRows=[...rows].sort((a,b)=>Number(b.weekendEligible)-Number(a.weekendEligible)||b.weekendPoints-a.weekendPoints||a.name.localeCompare(b.name));
 const past=[...new Set(weeks.filter(w=>w.week<currentWeek&&w.season===currentSeason).map(w=>w.week))],crowns=[];
 for(const w of past){const participants=weeks.filter(g=>g.week===w);if(participants.length<2||participants.some(g=>!g.final))continue;const eligible=participants.filter(g=>g.qualifying);if(!eligible.length)continue;const best=Math.max(...eligible.map(g=>g.rating));if(best>0)for(const g of eligible.filter(g=>Math.abs(g.rating-best)<1e-8))crowns.push({owner:g.owner,week:w,rating:g.rating,tied:eligible.filter(g=>Math.abs(g.rating-best)<1e-8).length>1});}
 const events=report.selected.filter(r=>r.status==='hit'&&r.season===currentSeason).map(r=>({owner:r.owner,title:r.leg.name||r.leg.team||(r.leg.kind==='total_points'?'Game total':r.leg.kind.replaceAll('_',' ')),points:null,week:r.week,season:r.season,time:r.observedAt,live:!r.confirmed})).sort((a,b)=>String(b.time).localeCompare(String(a.time)));
 return {week:currentWeek,season:currentSeason,report,weeks,crowns,seasonRows,weekendRows,events,issues:report.decisions.filter(r=>r.reason==='kickoff/submission time unverified')};
}
const api={RULES,MINIMUM,BONUS_CAP,SEASON_WEEKS,round,ratingChange,week,season,familyKey,registrationId,registrations,scoringReport,summarize,rating,liveLegAwards,standings};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.KingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);

