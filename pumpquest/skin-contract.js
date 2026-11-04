/* PumpQuest canonical art-to-anatomy contract.
   All illustrated champions share one FRONT mask and one BACK mask.
   A skin is an IMAGE ONLY; it cannot define, move, scale, or override muscle paths.
   Adding a new skin requires visual approval using the master guides.
*/
(function(root){'use strict';
 const ID='pq-19-region-art-v1', WIDTH=941, HEIGHT=1672;
 const ANCHORS={
  front:{head:[477,237],neck:[478,345],shoulderL:[289,394],shoulderR:[662,394],elbowL:[243,568],elbowR:[704,570],wristL:[195,704],wristR:[759,704],navel:[479,616],hipL:[355,834],hipR:[604,834],kneeL:[349,1080],kneeR:[607,1080],ankleL:[337,1326],ankleR:[611,1326]},
  back:{head:[475,241],neck:[477,346],shoulderL:[340,394],shoulderR:[613,394],elbowL:[307,561],elbowR:[650,561],wristL:[306,713],wristR:[664,713],spine:[481,609],hipL:[408,823],hipR:[552,823],kneeL:[406,1080],kneeR:[560,1080],ankleL:[375,1327],ankleR:[581,1327]}
 };
 const BASE={id:'stormhorn',label:'Iron Vanguard',rig:ID,front:'./assets/champion-stormhorn-front.webp',back:'./assets/champion-stormhorn-back.webp',canvas:[WIDTH,HEIGHT],approval:'reference',note:'New matched original front/back illustrated art; technical registration validated, visual muscle alignment still under review.'};
 // Other skins stay unavailable in illustrated mode until verified against both master guides.
 const SKINS=Object.freeze({stormhorn:Object.freeze(BASE)});
 function check(s){if(!s||s.rig!==ID||s.canvas?.[0]!==WIDTH||s.canvas?.[1]!==HEIGHT||!s.front||!s.back)throw Error('Skin must match canonical PumpQuest rig and have BOTH views');return true}
 function resolve(id){const candidate=SKINS[id];return candidate&&(candidate.id==='stormhorn'||candidate.approval==='approved')&&check(candidate)?candidate:BASE}
 function guide(side){if(!ANCHORS[side])throw Error('Invalid side');return `<g class="pq-art-qa-guide" aria-hidden="true"><rect x="2" y="2" width="937" height="1668" fill="none" stroke="#faff41" stroke-width="3"/><path d="M470 0 V1672 M0 836 H941" fill="none" stroke="#fafb43" stroke-width="2" stroke-dasharray="12 12"/>${Object.entries(ANCHORS[side]).map(([k,p])=>`<g><circle cx="${p[0]}" cy="${p[1]}" r="10" fill="#ffe953" stroke="#102335" stroke-width="3"/><text x="${p[0]+13}" y="${p[1]-10}" font-size="20" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${k}</text></g>`).join('')}</g>`}
 root.PQ_SKIN_CONTRACT={id:ID,width:WIDTH,height:HEIGHT,anchors:ANCHORS,skins:SKINS,check,resolve,guide};
})(typeof window!=='undefined'?window:globalThis);