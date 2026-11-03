/* PumpQuest v0.2 anatomy: visual training recency, not a physiological recovery diagnosis. */
(function(root){
 'use strict';
 const ZONES=[
  ['upperChest','Upper chest','front'],['lowerChest','Mid / lower chest','front'],
  ['frontDelts','Front delts','front'],['sideDelts','Side delts','both'],['rearDelts','Rear delts','back'],
  ['biceps','Biceps','front'],['triceps','Triceps','back'],['forearms','Forearms','both'],
  ['abs','Abs','front'],['obliques','Obliques','front'],
  ['quads','Quads','front'],['adductors','Adductors','front'],
  ['lats','Lats','back'],['traps','Traps','back'],['midBack','Mid back','back'],['lowerBack','Lower back','back'],
  ['glutes','Glutes','back'],['hamstrings','Hamstrings','back'],['calves','Calves','both']
 ];
 // Primary muscle receives full credit; secondary receives partial credit, visibly labelled.
 const DEFAULT={Chest:['lowerChest','upperChest','frontDelts','triceps'],Back:['lats','midBack','biceps','rearDelts'],Shoulders:['sideDelts','frontDelts','rearDelts','traps'],Biceps:['biceps','forearms'],Triceps:['triceps'],Quads:['quads','glutes','adductors'],Hamstrings:['hamstrings','glutes'],Glutes:['glutes','hamstrings'],Calves:['calves'],Core:['abs','obliques']};
 const SPEC={
  'incline-db':['upperChest','frontDelts','triceps'],'incline-bar':['upperChest','frontDelts','triceps'],'smith-incline':['upperChest','frontDelts','triceps'],
  'bench-press':['lowerChest','upperChest','triceps','frontDelts'],'flat-db':['lowerChest','upperChest','triceps'],'chest-press':['lowerChest','triceps','frontDelts'],'pec-deck':['lowerChest','upperChest'],'chest-fly':['lowerChest','upperChest'],dips:['lowerChest','triceps'],'pushups':['lowerChest','triceps','frontDelts'],
  'lat-pulldown':['lats','biceps','midBack'],'neutral-pulldown':['lats','biceps','midBack'],pullups:['lats','biceps','midBack'],chinups:['lats','biceps','midBack'],
  'barbell-row':['midBack','lats','biceps','rearDelts'],'cable-row':['midBack','lats','biceps','rearDelts'],'chest-row':['midBack','lats','biceps','rearDelts'],'db-row':['lats','midBack','biceps'],'tbar-row':['midBack','lats','biceps'],'machine-row':['midBack','lats','biceps'],'straight-pulldown':['lats'],deadlift:['lowerBack','glutes','hamstrings','traps'],
  'ohp':['frontDelts','sideDelts','triceps'],'db-shoulder':['frontDelts','sideDelts','triceps'],'seated-db-press':['frontDelts','sideDelts','triceps'],'landmine-press':['frontDelts','triceps'],
  'lateral-raise':['sideDelts'],'cable-lateral':['sideDelts'],'reverse-fly':['rearDelts','midBack'],'face-pull':['rearDelts','traps','midBack'],'rear-delt':['rearDelts'],'front-raise':['frontDelts'],shrugs:['traps'],'upright-row':['sideDelts','traps'],
  'barbell-curl':['biceps','forearms'],'db-curl':['biceps','forearms'],'hammer-curl':['biceps','forearms'],'rope-hammer':['biceps','forearms'],'preacher-curl':['biceps'],'incline-curl':['biceps'],'cable-curl':['biceps'],'concentration-curl':['biceps'],
  'triceps-pushdown':['triceps'],'overhead-triceps':['triceps'],skullcrusher:['triceps'],'close-grip':['triceps','lowerChest'],'triceps-dips':['triceps'],'kickback':['triceps'],'bench-dips':['triceps'],
  squat:['quads','glutes','adductors'],'front-squat':['quads','glutes'],'leg-press':['quads','glutes','adductors'],'hack-squat':['quads','glutes'],'pendulum-squat':['quads','glutes'],'goblet-squat':['quads','glutes'],'split-squat':['quads','glutes','adductors'],'leg-extension':['quads'],lunges:['quads','glutes'],'step-ups':['quads','glutes'],
  rdl:['hamstrings','glutes','lowerBack'],'db-rdl':['hamstrings','glutes','lowerBack'],'leg-curl':['hamstrings'],'lying-curl':['hamstrings'],'nordic-curl':['hamstrings'],
  'hip-thrust':['glutes','hamstrings'],'glute-bridge':['glutes'],'cable-kickback':['glutes'],
  'calf-raise':['calves'],'seated-calf':['calves'],'single-calf':['calves'],
  crunch:['abs'],'hanging-raise':['abs'],'plank':['abs','obliques'],'ab-wheel':['abs'],'russian-twist':['obliques'],'woodchop':['obliques']
 };
 const ZMAP=Object.fromEntries(ZONES.map(([id,label,side])=>[id,{id,label,side}]));
 function groupsFor(exercise){if(!exercise||exercise.muscle==='Cardio')return[];return SPEC[exercise.id]||DEFAULT[exercise.muscle]||[]}
 function analyze(workouts,exerciseLookup,now=Date.now()){
  const map=Object.fromEntries(ZONES.map(([id,label,side])=>[id,{id,label,side,status:'untracked',days:null,last:null,sets:0,secondaryOnly:false}]));
  for(const workout of workouts||[]){const t=Date.parse(workout.endedAt);if(!Number.isFinite(t)||t>now)continue;
   for(const entry of workout.exercises||[]){const groups=groupsFor(exerciseLookup(entry.id));if(!groups.length)continue;
    const sets=(entry.sets||[]).filter(s=>s.done!==false).length;if(!sets)continue;
    groups.forEach((id,i)=>{const z=map[id];if(!z)return; const effect=i===0?sets:sets*.4;if(effect<.35)return;
     z.sets+=effect;if(z.last===null||t>z.last){z.last=t;z.secondaryOnly=i!==0}else if(t===z.last&&i===0)z.secondaryOnly=false;
    });
   }
  }
  for(const z of Object.values(map)){
   if(z.last===null)continue;
   z.days=Math.max(0,Math.floor((now-z.last)/86400000));
   z.status=z.days<2?'hot':z.days<7?'warm':z.days<14?'neutral':'cold';
  }
  const counts={hot:0,warm:0,neutral:0,cold:0,untracked:0};Object.values(map).forEach(z=>counts[z.status]++);
  return {zones:map,counts,cold:Object.values(map).filter(z=>z.status==='cold').sort((a,b)=>b.days-a.days),hot:Object.values(map).filter(z=>z.status==='hot'),total:ZONES.length};
 }
 root.PQ_ANATOMY={ZONES,groupsFor,analyze};
})(typeof window!=='undefined'?window:globalThis);