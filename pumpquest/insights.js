/* PumpQuest analytics: deterministic, local, never sends a workout anywhere. */
(function(root){'use strict';
 const secs=t=>Date.parse(t)||0;
 const isWork=s=>s&&s.type!=='warmup'&&s.type!=='warm-up'&&Number.isFinite(Number(s.weight))&&Number.isFinite(Number(s.reps));
 function metrics(workouts,lookup,now=Date.now(),units='lb'){
  const hist=Array.isArray(workouts)?workouts:[];const periods=[7,30,90].map(days=>hist.filter(w=>secs(w.endedAt)>=now-days*86400000&&secs(w.endedAt)<=now));
  const volume=w=>w.reduce((total,session)=>total+(session.exercises||[]).reduce((v,e)=>v+(e.sets||[]).filter(isWork).reduce((s,x)=>s+Number(x.weight)*Number(x.reps),0),0),0);
  const sets=w=>w.reduce((n,x)=>n+(x.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(isWork).length,0),0);
  const bests=new Map(),records=[];
  for(const w of [...hist].sort((a,b)=>secs(a.endedAt)-secs(b.endedAt))){for(const ex of w.exercises||[]){for(const s of ex.sets||[]){if(!isWork(s)||!Number(s.reps))continue;const load=Number(s.weight),reps=Number(s.reps),estimated=load*(1+Math.min(30,reps)/30);const last=bests.get(ex.id);if(!last||estimated>last.estimated+0.01){const record={id:ex.id,name:lookup(ex.id).name,weight:load,reps,estimated,when:w.endedAt};bests.set(ex.id,record);records.push(record)}}}}
  const weekly=Array.from({length:7},(_,i)=>{const time=now-(6-i)*86400000,d=new Date(time),k=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;const sessions=hist.filter(w=>{const t=new Date(w.endedAt);return `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`===k});return {day:d.toLocaleDateString(undefined,{weekday:'short'}),count:sessions.length,sets:sets(sessions)}});
  return {total:hist.length,periods:periods.map(w=>({sessions:w.length,sets:sets(w),volume:volume(w)})),last30:periods[1],bests:[...bests.values()].sort((a,b)=>secs(b.when)-secs(a.when)),recentRecords:records.filter(r=>secs(r.when)>=now-30*86400000).slice(-8).reverse(),weekly,units};
 }
 root.PQ_INSIGHTS={metrics};
})(typeof window!=='undefined'?window:globalThis);