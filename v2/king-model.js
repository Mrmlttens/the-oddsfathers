(function(root){
'use strict';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function implied(odds){if(!Number.isFinite(odds)||odds===0)throw Error('Verified odds required');return odds>0?100/(odds+100):-odds/(-odds+100);}
function points(odds,legs,result){if(!Number.isInteger(legs)||legs<1)throw Error('Effective leg count required');if(result==='void')return 0;if(!['won','lost'].includes(result))return null;const p=implied(odds),m=1+.05*Math.min(legs-1,5);return 20*m*((result==='won'?1:0)-p);}
function etDate(value){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}
function week(date){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw Error('Invalid date');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-4+7)%7);return d.toISOString().slice(0,10);}
function season(date){const [y,m]=date.split('-').map(Number);return String(m<3?y-1:y);}
function standings(config,bets,today){
 const currentWeek=week(today),currentSeason=season(today),names=new Set(bets.map(b=>b.owner)),byId=new Map(bets.map(b=>[b.id,b])),groups=new Map(),events=[],issues=[];
 const entries=Array.isArray(config.entries)?config.entries:[];
 for(const entry of entries){if(!entry||typeof entry!=='object'){issues.push('Invalid nomination');continue;}const bet=byId.get(entry.betId);if(!bet){issues.push('Missing ticket');continue;}names.add(bet.owner);let date;try{date=etDate(entry.firstKickoff);}catch{issues.push('Missing kickoff');continue;}const w=week(date),key=bet.owner+'|'+w;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...entry,bet,week:w,season:season(date)});}
 const rows=new Map([...names].map(name=>[name,{name,seasonPoints:0,weekendPoints:0,seasonEntries:0,weekendEntries:0,weekendSettled:0,activeWeeks:0,bonus:0}]));
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
 const closed=[...new Set(Array.isArray(config.closedWeeks)?config.closedWeeks:[])].filter(w=>typeof w==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(w)&&w<=currentWeek&&season(w)===currentSeason&&week(w)===w);
 for(const w of closed){const participants=weekResults.get(w)||[];for(const p of participants)if(p.settled===3)p.row.activeWeeks++;
  if(participants.length<2||participants.some(p=>p.settled!==3))continue;const best=Math.max(...participants.map(p=>p.score));if(best<=0)continue;const winners=participants.filter(p=>p.score===best);for(const p of winners){p.row.seasonPoints+=5/winners.length;p.row.bonus+=5/winners.length;const time=events.filter(e=>e.week===w).map(e=>e.time).sort().at(-1)||w;events.push({owner:p.row.name,title:'Weekend crown bonus',points:round(5/winners.length),week:w,season:p.season,time});}
 }
 const all=[...rows.values()].map(r=>({...r,seasonPoints:round(r.seasonPoints),weekendPoints:round(r.weekendPoints),bonus:round(r.bonus),seasonEligible:closed.length>0&&r.activeWeeks>=Math.ceil(closed.length*.75)}));
 return {week:currentWeek,season:currentSeason,seasonRows:[...all].sort((a,b)=>b.seasonPoints-a.seasonPoints||a.name.localeCompare(b.name)),weekendRows:[...all].sort((a,b)=>b.weekendPoints-a.weekendPoints||a.name.localeCompare(b.name)),events:events.filter(e=>e.season===currentSeason).sort((a,b)=>String(b.time).localeCompare(String(a.time))),issues,closedWeeks:closed.length};
}
const api={round,implied,points,week,season,standings};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.KingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
