'use strict';
let popupPointPrevious=new Map(),popupPointCurrent=new Map(),popupPointCredits=new Set(),popupPointsReady=false;
function popupCurrentAwards(){if(typeof KingModel==='undefined'||typeof kingLoaded==='undefined'||!kingLoaded||typeof kingEvaluations!=='function')return null;try{return KingModel.liveLegAwards(kingConfig,bets,kingEvaluations());}catch{return null;}}
function refreshPopupPointState(){
 const awards=popupCurrentAwards();if(!awards){popupPointsReady=false;return;}
 const next=new Map(awards.map(a=>[a.key,a])),count=values=>{const m=new Map();for(const a of values){const k=a.owner+'|'+a.week;m.set(k,(m.get(k)||0)+1);}return m;};
 const before=count(popupPointPrevious.values()),after=count(next.values()),budgets=new Map([...after].map(([k,n])=>[k,Math.max(0,n-(before.get(k)||0))]));
 popupPointCredits=new Set();for(const a of awards){const k=a.owner+'|'+a.week;if(!popupPointPrevious.has(a.key)&&(budgets.get(k)||0)>0){popupPointCredits.add(a.key);budgets.set(k,budgets.get(k)-1);}}
 popupPointPrevious=next;popupPointCurrent=next;popupPointsReady=true;
}
function popupPointReceipts(entries,cumulative=false){
 const awards=popupCurrentAwards();if(!awards)return [...new Set(entries.map(e=>e.bet.owner))].map(owner=>({owner,points:null,reason:'points loading',keys:[]}));
 const current=new Map(awards.map(a=>[a.key,a])),groups=new Map();for(const e of entries){if(!groups.has(e.bet.owner))groups.set(e.bet.owner,[]);groups.get(e.bet.owner).push(e);}
 const receipts=[];for(const [owner,list] of groups){const selectionReport=KingModel.scoringReport(kingConfig,bets,kingEvaluations());const keys=[...new Set(list.flatMap(e=>selectionReport.selected.filter(r=>r.betId===e.bet.id&&r.legIndex===e.bet.legs.indexOf(e.leg)).map(r=>r.key)))],tracked=keys.filter(k=>current.has(k));let earned=[];
  if(cumulative)earned=tracked;else if(popupPointsReady){earned=tracked.filter(k=>popupPointCredits.has(k));for(const k of earned)popupPointCredits.delete(k);}
  const report=KingModel.scoringReport(kingConfig,bets,kingEvaluations());
  const reasons=list.map(e=>report.decisions.find(r=>r.betId===e.bet.id&&r.legIndex===e.bet.legs.indexOf(e.leg))?.reason).filter(Boolean);
  const reason=cumulative?(tracked.length?'leg points credited':reasons.find(r=>r!=='scoring pick')||'no scored hits'):earned.length?'earned':tracked.length?'already counted':reasons.find(r=>r!=='scoring pick')||'not a scored hit';
  receipts.push({owner,points:earned.length,reason,keys:earned,live:earned.some(k=>!current.get(k)?.confirmed),cumulative});
 }return receipts;
}
function validatePopupPointReceipts(receipts){const awards=popupCurrentAwards();if(!awards)return receipts;const keys=new Set(awards.map(a=>a.key));return receipts.map(r=>{if(r.points===null||!r.keys)return r;const kept=r.keys.filter(k=>keys.has(k));return {...r,keys:kept,points:kept.length,reason:kept.length<r.points?'stat correction':r.reason};});}

