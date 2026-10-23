(function(root){
'use strict';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function implied(odds){if(!Number.isFinite(odds)||odds===0)throw Error('Verified odds required');return odds>0?100/(odds+100):-odds/(-odds+100);}
function points(odds,legs,result){if(!Number.isInteger(legs)||legs<1)throw Error('Effective leg count required');if(result==='void')return 0;if(!['won','lost'].includes(result))return null;const p=implied(odds),m=1+.05*Math.min(legs-1,5);return 20*m*((result==='won'?1:0)-p);}
function etDate(value){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}
function week(date){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw Error('Invalid date');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-4+7)%7);return d.toISOString().slice(0,10);}
function season(date){const [y,m]=date.split('-').map(Number);return String(m<3?y-1:y);}
function familyKey(bet,leg){const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');return [clean(bet.owner),bet.game.date,clean(bet.game.away),clean(bet.game.home),clean(leg.team),clean(leg.name),leg.kind].join('|');}
function liveLegAwards(config,bets,evaluations){
 const awards=new Map(),approved=new Set(config.liveApprovedBetIds||[]),byId=new Map(bets.map(b=>[b.id,b]));
 for(const a of config.legAwards||[]){if(a&&a.sourceVerified===true&&a.key&&a.owner&&/^\d{4}-\d{2}-\d{2}$/.test(a.gameDate)&&a.points===1)awards.set(a.key,{...a,confirmed:true,week:week(a.gameDate),season:season(a.gameDate)});}
 for(const e of evaluations||[]){const b=byId.get(e.betId),leg=b?.legs?.[e.legIndex];if(!b||!leg||b.placed===false||e.status!=='hit'||e.source==='manual'||!['passing_yards','rushing_yards','receiving_yards','receptions','any_td','ml'].includes(leg.kind))continue;
  const start=Date.parse(e.gameStart),recorded=Date.parse(b.createdAt);if(!Number.isFinite(start)||(!approved.has(b.id)&&(!Number.isFinite(recorded)||recorded>=start)))continue;
  if(!['in','post'].includes(e.gameState))continue;
  const key=familyKey(b,leg);if(awards.has(key))continue;
  awards.set(key,{key,owner:b.owner,gameDate:b.game.date,week:week(b.game.date),season:season(b.game.date),points:1,confirmed:e.gameState==='post',title:leg.name?(leg.name+' · '+({passing_yards:'passing yards',rushing_yards:'rushing yards',receiving_yards:'receiving yards',receptions:'catches',any_td:'touchdown'}[leg.kind]||leg.kind)):(leg.team+' win'),time:e.observedAt||b.game.date});
 }
 const count=new Map();return [...awards.values()].sort((a,b)=>String(a.key).localeCompare(String(b.key))).filter(a=>{const k=a.owner+'|'+a.week,n=count.get(k)||0;count.set(k,n+1);return n<10;});
}
function standings(config,bets,today,evaluations=[]){
 const currentWeek=week(today),currentSeason=season(today),names=new Set(bets.map(b=>b.owner)),byId=new Map(bets.map(b=>[b.id,b])),groups=new Map(),events=[],issues=[];
 const entries=Array.isArray(config.entries)?config.entries:[];
 for(const entry of entries){if(!entry||typeof entry!=='object'){issues.push('Invalid nomination');continue;}const bet=byId.get(entry.betId);if(!bet){issues.push('Missing ticket');continue;}names.add(bet.owner);let date;try{date=etDate(entry.firstKickoff);}catch{issues.push('Missing kickoff');continue;}const w=week(date),key=bet.owner+'|'+w;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...entry,bet,week:w,season:season(date)});}
 const awards=liveLegAwards(config,bets,evaluations);for(const a of awards)names.add(a.owner);
 const rows=new Map([...names].map(name=>[name,{name,seasonPoints:0,weekendPoints:0,seasonEntries:0,weekendEntries:0,weekendSettled:0,activeWeeks:0,bonus:0,liveSeasonPoints:0,liveWeekendPoints:0,seasonLegPoints:0,weekendLegPoints:0}]));
 const weekResults=new Map();
 for(const entries of groups.values()){
  const earliest=Math.min(...entries.map(e=>Date.parse(e.firstKickoff))),ids=new Set(entries.map(e=>e.betId));
  const valid=entries.length===3&&ids.size===3&&entries.every(e=>etDate(e.firstKickoff)===e.bet.game.date&&e.oddsVerified===true&&Number.isFinite(e.baseOdds)&&e.baseOdds!==0&&Number.isInteger(e.effectiveLegs)&&e.effectiveLegs>=1&&e.effectiveLegs<=e.bet.legs.length&&Number.isFinite(Date.parse(e.nominatedAt))&&Date.parse(e.nominatedAt)<earliest&&['pending','won','lost','void'].includes(e.result));
  if(!valid){issues.push('Nominations need review');continue;}
  const first=entries[0],row=rows.get(first.bet.owner);let sum=0,settled=0;
  for(const e of entries){const score=points(e.baseOdds,e.effectiveLegs,e.result);if(score===null)continue;sum+=score;settled++;events.push({owner:e.bet.owner,title:e.bet.title,points:round(score),week:e.week,season:e.season,time:e.settledAt||e.firstKickoff});}
  if(first.season===currentSeason){row.seasonPoints+=sum;row.seasonEntries+=entries.length;}
  if(first.week===currentWeek){row.weekendPoints+=sum;row.weekendEntries=3;row.weekendSettled=settled;}
  if(!weekResults.has(first.week))weekResults.set(first.week,[]);weekResults.get(first.week).push({row,score:round(sum),settled,season:first.season});
 }
 for(const a of awards){const row=rows.get(a.owner);if(a.season===currentSeason){row.seasonPoints++;row.seasonLegPoints++;if(!a.confirmed)row.liveSeasonPoints++;}if(a.week===currentWeek){row.weekendPoints++;row.weekendLegPoints++;if(!a.confirmed)row.liveWeekendPoints++;}events.push({owner:a.owner,title:a.title||'Leg cleared',points:1,week:a.week,season:a.season,time:a.time||a.gameDate,live:!a.confirmed});}
 const closed=[...new Set(Array.isArray(config.closedWeeks)?config.closedWeeks:[])].filter(w=>typeof w==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(w)&&w<=currentWeek&&season(w)===currentSeason&&week(w)===w);
 for(const w of closed){const participants=weekResults.get(w)||[];for(const p of participants)if(p.settled===3)p.row.activeWeeks++;
  if(participants.length<2||participants.some(p=>p.settled!==3)||awards.some(a=>a.week===w&&!a.confirmed))continue;for(const p of participants)p.score=round(p.score+awards.filter(a=>a.week===w&&a.owner===p.row.name).length);const best=Math.max(...participants.map(p=>p.score));if(best<=0)continue;const winners=participants.filter(p=>p.score===best);for(const p of winners){p.row.seasonPoints+=5/winners.length;p.row.bonus+=5/winners.length;const time=events.filter(e=>e.week===w).map(e=>e.time).sort().at(-1)||w;events.push({owner:p.row.name,title:'Weekend crown bonus',points:round(5/winners.length),week:w,season:p.season,time});}
 }
 const all=[...rows.values()].map(r=>({...r,seasonPoints:round(r.seasonPoints),weekendPoints:round(r.weekendPoints),bonus:round(r.bonus),seasonEligible:closed.length>0&&r.activeWeeks>=Math.ceil(closed.length*.75)}));
 return {week:currentWeek,season:currentSeason,seasonRows:[...all].sort((a,b)=>b.seasonPoints-a.seasonPoints||a.name.localeCompare(b.name)),weekendRows:[...all].sort((a,b)=>b.weekendPoints-a.weekendPoints||a.name.localeCompare(b.name)),events:events.filter(e=>e.season===currentSeason).sort((a,b)=>String(b.time).localeCompare(String(a.time))),issues,closedWeeks:closed.length};
}
const api={round,implied,points,week,season,familyKey,liveLegAwards,standings};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.KingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
