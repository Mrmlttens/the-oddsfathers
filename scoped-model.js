(function(root){'use strict';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const escape=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function alias(name){const parts=String(name||'').split(/\s+/).filter(p=>! /^(jr|sr|ii|iii|iv|v)\.?$/i.test(p));return parts.length>1?parts[0][0]+'.'+parts.at(-1):name;}
function compact(raw){const drive=d=>d&&({id:d.id,team:{id:d.team?.id,displayName:d.team?.displayName,abbreviation:d.team?.abbreviation},result:d.result,offensivePlays:d.offensivePlays,end:d.end,start:d.start,plays:(d.plays||[]).map(p=>({id:p.id,sequenceNumber:p.sequenceNumber,period:p.period,type:p.type,text:p.text,statYardage:p.statYardage,isPenalty:p.isPenalty,scoringPlay:p.scoringPlay}))});return {header:{competitions:[{status:raw?.header?.competitions?.[0]?.status}]},drives:{previous:(raw?.drives?.previous||[]).map(drive),current:drive(raw?.drives?.current)}};}
function evaluate(leg,event,players,state,raw){
 const unknown={status:state==='post'?'review':state==='in'?'live':'pending',value:null,source:'period/drive feed'},scope=leg.scope;if(!scope||!raw?.drives)return unknown;
 const completeIds=new Set((raw.drives.previous||[]).map(d=>String(d.id))),all=[raw.drives.current,...(raw.drives.previous||[])].filter(Boolean),unique=[...new Map(all.map(d=>[String(d.id),d])).values()];
 const belongs=d=>norm(d.team?.displayName)===norm(leg.team)||norm(d.team?.abbreviation)===norm(leg.team);
 const offensive=d=>Number(d.offensivePlays)>0||(d.plays||[]).some(p=>/^(Pass Reception|Passing Touchdown|Rush|Rushing Touchdown|Sack|Pass Incompletion|Pass Interception Return)$/.test(p.type?.text||''));
 const drives=unique.filter(d=>belongs(d)&&offensive(d)).sort((a,b)=>Number(a.plays?.[0]?.sequenceNumber||Infinity)-Number(b.plays?.[0]?.sequenceNumber||Infinity));
 let selected=drives,finished=false;
 if(scope.drive===1){if(!drives.length)return unknown;selected=[drives[0]];finished=completeIds.has(String(drives[0].id))&&Boolean(drives[0].result);}
 else if(scope.period===1){const status=raw.header?.competitions?.[0]?.status||event?.competitions?.[0]?.status||event?.status||{};finished=state==='post'||Number(status.period)>1;}
 else return {...unknown,status:'review'};
 if(leg.kind==='drive_offensive_td'){
  if(scope.drive!==1||!selected.length)return unknown;
  const d=selected[0],td=(d.plays||[]).some(p=>/^(Passing Touchdown|Rushing Touchdown)$/.test(p.type?.text||'')&&p.scoringPlay===true);
  if(d.result==='TD'&&!td)return {...unknown,status:'review'};
  return {status:td?'hit':finished?'miss':unknown.status,value:td?1:0,scopeFinal:finished,source:'ESPN drive 1'};
 }
 if(!['passing_yards','receiving_yards','rushing_yards'].includes(leg.kind))return {...unknown,status:'review'};
 const playerName=norm(leg.name),known=players&&[...players.values()].some(p=>norm(p.name)===playerName);if(!known)return unknown;
 const names=[alias(leg.name),leg.name].map(escape).join('|'),passer=new RegExp('(?:^|[\\s)])(?:'+names+')\\s+pass\\b','i'),receiver=new RegExp('\\bto\\s+(?:'+names+')(?![a-z])','i'),rusher=new RegExp('(?:^|[\\s)])(?:'+names+')\\s+(?:left|right|up|scrambles|kneels|rushes|to\\b|for\\b)','i');
 const plays=[...new Map(selected.flatMap(d=>d.plays||[]).map(p=>[String(p.id),p])).values()].filter(p=>!scope.period||Number(p.period?.number)===scope.period);
 let value=0;
 for(const p of plays){const type=p.type?.text||'',text=p.text||'';let relevant=false;
  if(leg.kind==='passing_yards')relevant=/^(Pass Reception|Passing Touchdown)$/.test(type)&&passer.test(text);
  if(leg.kind==='receiving_yards')relevant=/^(Pass Reception|Passing Touchdown)$/.test(type)&&receiver.test(text);
  if(leg.kind==='rushing_yards')relevant=/^(Rush|Rushing Touchdown)$/.test(type)&&rusher.test(text);
  if(!relevant||/\bno play\b/i.test(text))continue;
  if(p.isPenalty||/\blateral\b|\bfumbles\b/i.test(text)||!Number.isFinite(p.statYardage))return {...unknown,status:'review'};
  value+=p.statYardage;
 }
 const target=Number(leg.target),hit=leg.side==='over'?value>target:value>=target;
 let status=hit?'hit':finished?'miss':unknown.status;
 if(leg.side==='under')status=finished?(value<target?'hit':value===target?'void':'miss'):unknown.status;
 else if(leg.side==='over'&&finished&&value===target)status='void';
 return {status,value,scopeFinal:finished,source:scope.period?'ESPN quarter 1':'ESPN drive 1'};
}
const api={alias,compact,evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScopedModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
