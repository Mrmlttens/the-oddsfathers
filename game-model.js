(function(root){'use strict';
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const teamEquals=(a,b)=>norm(a)===norm(b);
const gameKey=g=>[g.date,norm(g.away),norm(g.home)].join('|');
function player(players,name){if(!players)return null;const n=norm(name);if(players.has(n))return players.get(n);for(const [key,p] of players)if(key===n||n.endsWith(key)||key.endsWith(n))return p;return null;}
function extractGameStats(summary){let players=new Map();for(const tp of summary?.boxscore?.players||[]){for(const group of tp.statistics||[]){const grp=String(group.name||group.type||group.displayName||'').toLowerCase();const labels=(group.labels||group.keys||[]).map(s=>String(s).toUpperCase());for(const item of group.athletes||[]){const name=item.athlete?.displayName||item.athlete?.fullName||item.athlete?.shortName||'';if(!name)continue;let id=norm(name);const p=players.get(id)||{name,passing_yards:null,receiving_yards:null,rushing_yards:null,receptions:null,passing_td:null,receiving_td:null,rushing_td:null};function getval(keys){for(const key of keys){const ix=labels.findIndex(x=>x===key);if(ix>=0){const v=String(item.stats?.[ix]??'').replaceAll(',','');if(v!==''&&!isNaN(Number(v)))return Number(v)}}return null}
if(grp.includes('pass')){p.passing_yards=getval(['YDS','YARDS']);p.passing_td=getval(['TD','TDS']);}
if(grp.includes('receiv')){p.receiving_yards=getval(['YDS','YARDS']);p.receptions=getval(['REC','RECEPTIONS']);p.receiving_td=getval(['TD','TDS']);}
if(grp.includes('rush')){p.rushing_yards=getval(['YDS','YARDS']);p.rushing_td=getval(['TD','TDS']);}
players.set(id,p)}}}
return players}
function evaluate(leg,event,players,state,raw){if(leg.override==='hit'||leg.override==='miss'||leg.override==='void')return {status:leg.override,value:null,source:'manual'};
if(leg.scope){const scoped=typeof module!=='undefined'&&module.exports?require('./scoped-model.js'):root.ScopedModel;return scoped.evaluate(leg,event,players,state,raw);}
const ev=event;if(!ev)return {status:'unknown',value:null};
const final=state==='post',playing=state==='in';
const c=ev.competitions?.[0]?.competitors||[];
if(leg.kind==='ml'){
 const team=c.find(x=>teamEquals(x.team?.displayName||x.team?.name||x.team?.abbreviation,leg.team));if(!team)return {status:'unknown',value:null};
 const score=Number(team.score||0),op=Number(c.find(x=>x!==team)?.score||0);
 if(final)return {status:score>op?'hit':score<op?'miss':'review',value:score+'–'+op};
 return {status:playing?'live':'pending',value:playing?score+'–'+op:null};
}
if(leg.kind==='spread'){
 const team=c.find(x=>teamEquals(x.team?.displayName||x.team?.name||x.team?.abbreviation,leg.team)),op=c.find(x=>x!==team);
 if(!team||!op)return {status:'unknown',value:null};
 const margin=Number(team.score||0)-Number(op.score||0)+Number(leg.target);
 return {status:final?(margin>0?'hit':margin<0?'miss':'void'):playing?'live':'pending',value:margin};
}
if(leg.kind==='either_td'){
 const tdPlayers=(leg.players||[]).map(name=>player(players,name));
 const totals=tdPlayers.map(p=>!p||(p.rushing_td==null&&p.receiving_td==null)?null:(p.rushing_td||0)+(p.receiving_td||0));
 if(totals.some(v=>v!==null&&v>=1))return {status:'hit',value:1};
 if(final&&totals.length>=2&&totals.every(v=>v!==null))return {status:'miss',value:0};
 return {status:final?'review':playing?'live':'pending',value:totals.every(v=>v!==null)?0:null};
}
let value=null;
if(leg.kind==='total_points')value=c.length===2&&c.every(x=>x.score!==undefined)?c.reduce((sum,x)=>sum+Number(x.score),0):null;
else {const p=player(players,leg.name);if(!p)return {status:final?'review':playing?'live':'pending',value:null};
if(leg.kind==='any_td'){value=(p.rushing_td||0)+(p.receiving_td||0);if(p.rushing_td===null&&p.receiving_td===null)value=null}else value=p[leg.kind];}
if(value===null||!Number.isFinite(value))return {status:final?'review':playing?'live':'pending',value:null};
const goal=leg.target??1;
if(leg.side==='under')return {status:final?(value<goal?'hit':value===goal?'void':'miss'):playing?'live':'pending',value};
if(leg.side==='over'){if(final&&value===goal)return {status:'void',value};return {status:value>goal?'hit':final?'miss':playing?'live':'pending',value};}
if(value>=goal)return {status:'hit',value};
return {status:final?'miss':playing?'live':'pending',value};
}


const api={norm,gameKey,extractGameStats,player,evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.GameModel=api;})(typeof globalThis!=='undefined'?globalThis:this);

