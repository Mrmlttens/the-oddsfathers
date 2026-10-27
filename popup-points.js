'use strict';
// K.O.T.O. is an accuracy rating, not one independently earned point per leg.
// Record the signed weekend rating movement once per successful feed refresh.
let popupRatingPrevious=new Map(),popupRatingChanges=new Map();
function popupRatingView(){if(!kingLoaded)return null;return KingModel.standings(kingConfig,bets,boardDate(),kingEvaluations());}
function refreshPopupPointState(){
 const view=popupRatingView();if(!view)return;
 popupRatingChanges=new Map();
 for(const w of view.weeks){
  const key=w.owner+'|'+w.week,previous=popupRatingPrevious.get(key);
  popupRatingChanges.set(key,KingModel.ratingChange(previous,w.rating));
  popupRatingPrevious.set(key,w.rating);
 }
}
function popupPointReceipts(entries,cumulative=false){
 const view=popupRatingView(),owners=[...new Set(entries.map(e=>e.bet.owner))];
 if(!view)return owners.map(owner=>({owner,points:null,rating:null,delta:null,reason:'rating loading',keys:[],cumulative:true}));
 return owners.map(owner=>{
  const own=entries.filter(e=>e.bet.owner===owner),week=cumulative?view.week:KingModel.week(legGame(own[0].leg,own[0].bet).date);
  const selected=own.flatMap(e=>view.report.selected.filter(r=>r.betId===e.bet.id&&r.legIndex===e.bet.legs.indexOf(e.leg)));
  const w=view.weeks.find(w=>w.owner===owner&&w.week===week),key=owner+'|'+week;
  return {owner,points:w?.rating??0,rating:w?.rating??0,delta:popupRatingChanges.get(key)??null,week,
   reason:selected.length?'Accuracy rating, not per-leg CP':'Duplicate or tracking-only pick · no additional rating credit',
   keys:selected.map(r=>r.key),live:!w?.final,eligible:!!w?.qualifying,cumulative:true};
 });
}
function validatePopupPointReceipts(receipts){
 const view=popupRatingView();if(!view)return receipts;
 return receipts.map(r=>{
  const w=view.weeks.find(w=>w.owner===r.owner&&r.week===w.week);
  return {...r,points:w?.rating??null,rating:w?.rating??null,
   // A queued alert may be displayed long after it was created. Suppress stale deltas.
   delta:null,live:!w?.final,eligible:!!w?.qualifying,cumulative:true};
 });
}
