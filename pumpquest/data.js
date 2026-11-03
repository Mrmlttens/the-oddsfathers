/* Offline exercise library. Keep ids stable so existing workouts survive updates. */
window.PQ_EXERCISES = [
 ['bench-press','Barbell Bench Press','Chest','Barbell'],['incline-db','Incline Dumbbell Press','Chest','Dumbbell'],['flat-db','Flat Dumbbell Press','Chest','Dumbbell'],['incline-bar','Incline Barbell Press','Chest','Barbell'],['chest-fly','Cable Chest Fly','Chest','Cable'],['pec-deck','Pec Deck Fly','Chest','Machine'],['pushups','Push-ups','Chest','Bodyweight'],['chest-press','Machine Chest Press','Chest','Machine'],['dips','Chest Dips','Chest','Bodyweight'],
 ['lat-pulldown','Lat Pulldown','Back','Cable'],['pullups','Pull-ups','Back','Bodyweight'],['chinups','Chin-ups','Back','Bodyweight'],['barbell-row','Barbell Bent-Over Row','Back','Barbell'],['cable-row','Seated Cable Row','Back','Cable'],['chest-row','Chest-Supported Row','Back','Machine'],['db-row','One-Arm Dumbbell Row','Back','Dumbbell'],['straight-pulldown','Straight-Arm Pulldown','Back','Cable'],['tbar-row','T-Bar Row','Back','Machine'],['deadlift','Conventional Deadlift','Back','Barbell'],
 ['ohp','Overhead Press','Shoulders','Barbell'],['db-shoulder','Dumbbell Shoulder Press','Shoulders','Dumbbell'],['lateral-raise','Dumbbell Lateral Raise','Shoulders','Dumbbell'],['cable-lateral','Cable Lateral Raise','Shoulders','Cable'],['reverse-fly','Reverse Pec Deck','Shoulders','Machine'],['face-pull','Face Pull','Shoulders','Cable'],['rear-delt','Rear Delt Dumbbell Fly','Shoulders','Dumbbell'],['front-raise','Front Raise','Shoulders','Dumbbell'],['shrugs','Dumbbell Shrugs','Shoulders','Dumbbell'],
 ['barbell-curl','Barbell Curl','Biceps','Barbell'],['db-curl','Dumbbell Curl','Biceps','Dumbbell'],['hammer-curl','Hammer Curl','Biceps','Dumbbell'],['preacher-curl','Preacher Curl','Biceps','Machine'],['incline-curl','Incline Dumbbell Curl','Biceps','Dumbbell'],['cable-curl','Cable Curl','Biceps','Cable'],['concentration-curl','Concentration Curl','Biceps','Dumbbell'],
 ['triceps-pushdown','Triceps Rope Pushdown','Triceps','Cable'],['overhead-triceps','Overhead Triceps Extension','Triceps','Cable'],['skullcrusher','Skull Crushers','Triceps','Barbell'],['close-grip','Close-Grip Bench Press','Triceps','Barbell'],['triceps-dips','Triceps Dips','Triceps','Bodyweight'],['kickback','Triceps Kickback','Triceps','Dumbbell'],
 ['squat','Barbell Squat','Quads','Barbell'],['leg-press','Leg Press','Quads','Machine'],['hack-squat','Hack Squat','Quads','Machine'],['goblet-squat','Goblet Squat','Quads','Dumbbell'],['split-squat','Bulgarian Split Squat','Quads','Dumbbell'],['leg-extension','Leg Extension','Quads','Machine'],['lunges','Walking Lunges','Quads','Dumbbell'],['step-ups','Step-ups','Quads','Dumbbell'],
 ['rdl','Romanian Deadlift','Hamstrings','Barbell'],['db-rdl','Dumbbell Romanian Deadlift','Hamstrings','Dumbbell'],['leg-curl','Seated Leg Curl','Hamstrings','Machine'],['lying-curl','Lying Leg Curl','Hamstrings','Machine'],['hip-thrust','Hip Thrust','Glutes','Barbell'],['glute-bridge','Glute Bridge','Glutes','Bodyweight'],['cable-kickback','Cable Kickback','Glutes','Cable'],
 ['calf-raise','Standing Calf Raise','Calves','Machine'],['seated-calf','Seated Calf Raise','Calves','Machine'],['single-calf','Single-Leg Calf Raise','Calves','Bodyweight'],
 ['crunch','Cable Crunch','Core','Cable'],['hanging-raise','Hanging Knee Raise','Core','Bodyweight'],['plank','Plank','Core','Bodyweight'],['ab-wheel','Ab Wheel Rollout','Core','Bodyweight'],['russian-twist','Russian Twist','Core','Bodyweight'],['woodchop','Cable Woodchop','Core','Cable'],
 ['smith-incline','Smith Incline Press','Chest','Machine'],['landmine-press','Landmine Press','Shoulders','Barbell'],['machine-row','Iso-Lateral Machine Row','Back','Machine'],['neutral-pulldown','Neutral-Grip Lat Pulldown','Back','Cable'],['seated-db-press','Seated Dumbbell Press','Shoulders','Dumbbell'],['upright-row','Cable Upright Row','Shoulders','Cable'],['rope-hammer','Rope Hammer Curl','Biceps','Cable'],['bench-dips','Bench Dips','Triceps','Bodyweight'],['front-squat','Front Squat','Quads','Barbell'],['pendulum-squat','Pendulum Squat','Quads','Machine'],['nordic-curl','Nordic Hamstring Curl','Hamstrings','Bodyweight'],['elliptical','Elliptical','Cardio','Cardio'],
 ['treadmill','Treadmill','Cardio','Cardio'],['bike','Stationary Bike','Cardio','Cardio'],['rower','Rowing Machine','Cardio','Cardio']
].map(([id,name,muscle,equipment]) => ({id,name,muscle,equipment}));

window.PQ_STARTER_ROUTINES = [
 {id:'push',name:'PUSH DAY',tag:'Chest · Delts · Triceps',color:'pink',exercises:[['incline-db',3,8,12,90],['bench-press',3,6,10,120],['lateral-raise',3,12,15,60],['chest-fly',3,10,15,75],['triceps-pushdown',3,10,15,60]]},
 {id:'pull',name:'PULL DAY',tag:'Back · Rear Delts · Biceps',color:'blue',exercises:[['chest-row',3,8,12,90],['lat-pulldown',3,8,12,90],['cable-row',3,10,12,90],['reverse-fly',3,12,15,60],['hammer-curl',3,10,12,60]]},
 {id:'legs',name:'LEG DAY',tag:'Quads · Hamstrings · Calves',color:'orange',exercises:[['leg-press',4,8,12,120],['rdl',3,8,10,120],['leg-extension',3,12,15,75],['leg-curl',3,10,15,75],['calf-raise',4,12,20,60]]},
 {id:'upper',name:'UPPER DAY',tag:'Chest · Back · Arms',color:'mint',exercises:[['incline-db',3,8,10,90],['chest-row',3,8,12,90],['cable-lateral',3,12,15,60],['face-pull',3,12,15,60],['cable-curl',3,10,12,60],['overhead-triceps',3,10,12,60]]}
].map(r => ({...r,exercises:r.exercises.map(([id,sets,min,max,rest])=>({id,sets,min,max,rest}))}));

window.PQ_ITEMS = [
 {id:'base',name:'Training Shorts',category:'outfit',level:1,icon:'◈'},
 {id:'pulse',name:'Pulse Halo',category:'aura',level:2,icon:'✦'},
 {id:'wrist',name:'Power Wraps',category:'outfit',level:3,icon:'⌁'},
 {id:'mint',name:'Ion Aura',category:'aura',level:4,icon:'✺'},
 {id:'shades',name:'Champion Shades',category:'head',level:5,icon:'◉'},
 {id:'shock',name:'Shockwave Aura',category:'aura',level:7,icon:'ϟ'},
 {id:'gold',name:'Golden Gloves',category:'outfit',level:10,icon:'◆'},
 {id:'crown',name:'The Iron Crown',category:'head',level:15,icon:'♛'},
 {id:'cosmic',name:'Cosmic Aura',category:'aura',level:20,icon:'✧'}
];