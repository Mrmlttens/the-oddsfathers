/* PumpQuest local Hevy CSV importer. No network calls. */
(function(root){
 'use strict';
 function csvRows(text){
  if(typeof text!=='string'||text.length>20*1024*1024)throw Error('CSV is empty or too large (20 MB maximum).');
  const rows=[];let row=[],v='',quote=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quote){if(c==='"'&&text[i+1]==='"'){v+='"';i++}else if(c==='"')quote=false;else v+=c;continue;}
   if(c==='"'){quote=true;continue}
   if(c===','){row.push(v);v='';continue}
   if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v);if(row.some(x=>x.trim()))rows.push(row);row=[];v='';continue}
   v+=c;
  }
  if(quote)throw Error('CSV contains an unclosed quote.');row.push(v);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
 }
 function dateValue(input){
  if(!input||!input.trim())return null;
  const direct=Date.parse(input);
  if(Number.isFinite(direct))return new Date(direct).toISOString();
  const m=/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(input);
  if(!m)return null;
  const months='jan feb mar apr may jun jul aug sep oct nov dec'.split(' '),mon=months.indexOf(m[2].toLowerCase().slice(0,3));
  if(mon<0)return null;
  const d=new Date(Number(m[3]),mon,Number(m[1]),Number(m[4]),Number(m[5]));return Number.isFinite(d.getTime())?d.toISOString():null;
 }
 const norm=s=>String(s||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
 function inferMuscle(name){const n=norm(name);if(/pulldown|pull up|chin up|row|deadlift|lat\b/.test(n))return 'Back';if(/bench|chest|pec|fly|push up/.test(n))return 'Chest';if(/shoulder|delt|lateral|overhead press|face pull|shrug/.test(n))return 'Shoulders';if(/curl|bicep/.test(n))return 'Biceps';if(/tricep|pushdown|skullcrush/.test(n))return 'Triceps';if(/calf/.test(n))return 'Calves';if(/hamstring|leg curl|romanian/.test(n))return 'Hamstrings';if(/hip thrust|glute/.test(n))return 'Glutes';if(/squat|leg press|lunge|leg extension/.test(n))return 'Quads';if(/ab |crunch|plank|core|twist/.test(n))return 'Core';if(/treadmill|run|cycle|bike|rowing machine|walk/.test(n))return 'Cardio';return 'Other'}
 function toWorkouts(text,library,custom,existing,units='lb'){
  const rows=csvRows(text);if(rows.length<2)throw Error('No workout rows found.');
  const head=rows.shift().map(x=>x.trim().toLowerCase());
  for(const required of ['title','start_time','exercise_title','set_index'])if(!head.includes(required))throw Error('This does not look like a Hevy workout export (missing '+required+').');
  const get=(r,key)=>r[head.indexOf(key)]??'';
  const weightColumn=head.includes('weight_lbs')?'weight_lbs':head.includes('weight_kg')?'weight_kg':null;
  const existingNames=new Map([...library,...custom].map(x=>[norm(x.name),x.id]));
  // Hevy places equipment in parentheses; PumpQuest puts equipment first in many names.
  const aliases=new Map([['bench press barbell','bench-press'],['bench press dumbbell','flat-db'],['incline bench press dumbbell','incline-db'],['incline bench press barbell','incline-bar'],['squat barbell','squat'],['romanian deadlift barbell','rdl'],['lateral raise dumbbell','lateral-raise'],['lat pulldown cable','lat-pulldown'],['seated row cable','cable-row'],['hammer curl dumbbell','hammer-curl'],['triceps pushdown cable','triceps-pushdown'],['leg press machine','leg-press']]);
  const byId=new Map(library.map(x=>[x.id,x]));
  const newExercises=[];let importedSets=0;
  const seen=new Set((existing||[]).map(x=>String(x.name).trim().toLowerCase()+'|'+new Date(x.startedAt).getTime()));
  const workMap=new Map();
  for(const row of rows){if(row.length<4)continue;
   const name=get(row,'title').trim().slice(0,90)||'Hevy workout',exerciseName=get(row,'exercise_title').trim().slice(0,90),start=dateValue(get(row,'start_time'));
   if(!exerciseName||!start)continue;
   const key=name.toLowerCase()+'|'+new Date(start).getTime();if(seen.has(key))continue;
   let w=workMap.get(key);if(!w){w={id:'hevy-'+workMap.size+'-'+new Date(start).getTime(),name,startedAt:start,endedAt:dateValue(get(row,'end_time'))||start,earnedXp:0,source:'hevy',notes:get(row,'description').slice(0,500),exercises:[]};workMap.set(key,w)}
   const rawKey=norm(exerciseName);let id=aliases.get(exerciseName.toLowerCase().replace(/\s+/g,' ').trim())||existingNames.get(rawKey);
   if(!id){const tokens=rawKey.split(' ');id=library.find(x=>tokens.length>1&&norm(x.name).split(' ').every(t=>tokens.includes(t)))?.id}
   if(!id){id='hevy-'+rawKey.replace(/\s+/g,'-').slice(0,60);let duplicate=0;while(byId.has(id)||newExercises.find(x=>x.id===id)){duplicate++;id='hevy-'+rawKey.replace(/\s+/g,'-').slice(0,55)+'-'+duplicate}const exercise={id,name:exerciseName,muscle:inferMuscle(exerciseName),equipment:'Imported'};newExercises.push(exercise);existingNames.set(rawKey,id)}
   let ex=w.exercises.find(x=>x.id===id);if(!ex){ex={id,notes:get(row,'exercise_notes').slice(0,500),sets:[]};w.exercises.push(ex)}
   const rawWeight=weightColumn?Number(get(row,weightColumn)):0, reps=Number(get(row,'reps')),duration=Number(get(row,'duration_seconds')),dist=Number(get(row,'distance_miles')||get(row,'distance_km'));
   const goodReps=Number.isFinite(reps)&&reps>=0?reps:0;
   const goodWeight=Number.isFinite(rawWeight)&&rawWeight>=0?rawWeight:0;
   const isKg=weightColumn==='weight_kg';const weight=units==='lb'&&isKg?goodWeight*2.2046226218:units==='kg'&&!isKg?goodWeight/2.2046226218:goodWeight;
   const rpeVal=Number(get(row,'rpe'));
   if(goodReps===0&&goodWeight===0&&!(duration>0||dist>0))continue;
   ex.sets.push({weight:Math.round(weight*100)/100,reps:goodReps,type:get(row,'set_type')||'normal',rpe:rpeVal>=1&&rpeVal<=10?rpeVal:null,duration:duration>0?duration:null,distance:dist>0?dist:null});importedSets++;
  }
  const incoming=[...workMap.values()].filter(w=>w.exercises.some(x=>x.sets.length)).sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt));
  if(!incoming.length)throw Error('No new completed sets found; this file may already be imported.');
  if(incoming.length>5000)throw Error('Import too large. Split your Hevy export into smaller files.');
  return {workouts:incoming,customExercises:newExercises,importedSets,skipped:rows.length-importedSets};
 }
 root.PQ_IMPORT={csvRows,dateValue,toWorkouts};
})(typeof window!=='undefined'?window:globalThis);