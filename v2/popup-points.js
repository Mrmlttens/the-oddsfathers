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
 const receipts=[];for(const [owner,list] of groups){const keys=[...new Set(list.map(e=>KingModel.familyKey(e.bet,e.leg)))],tracked=keys.filter(k=>current.has(k));let earned=[];
  if(cumulative)earned=tracked;else if(popupPointsReady){earned=tracked.filter(k=>popupPointCredits.has(k));for(const k of earned)popupPointCredits.delete(k);}
  const atCap=list.some(e=>awards.filter(a=>a.owner===owner&&a.week===KingModel.week(e.bet.game.date)).length>=10);
  const reason=cumulative?'leg points credited':earned.length?'earned':tracked.length?'already counted':list.every(e=>e.bet.placed===false)?'unconfirmed':atCap?'weekend cap':'not eligible';
  receipts.push({owner,points:earned.length,reason,keys:earned,live:earned.some(k=>!current.get(k)?.confirmed),cumulative});
 }return receipts;
}
function validatePopupPointReceipts(receipts){const awards=popupCurrentAwards();if(!awards)return receipts;const keys=new Set(awards.map(a=>a.key));return receipts.map(r=>{if(r.points===null||!r.keys)return r;const kept=r.keys.filter(k=>keys.has(k));return {...r,keys:kept,points:kept.length,reason:kept.length<r.points?'stat correction':r.reason};});}
