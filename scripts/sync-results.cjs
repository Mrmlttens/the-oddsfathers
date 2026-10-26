'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),G=require('../game-model.js'),K=require('../king-model.js');
const BASE='https://site.api.espn.com/apis/site/v2/sports/football/nfl';
async function json(url){let error;for(let n=0;n<2;n++){try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){error=e;}}throw error;}
async function pool(values,run){let cursor=0;await Promise.all(Array.from({length:Math.min(3,values.length)},async()=>{while(cursor<values.length){const i=cursor++;await run(values[i]);}}));}
async function sync(){
 const bets=JSON.parse(fs.readFileSync(path.join(root,'bets.json'),'utf8')).bets,config=JSON.parse(fs.readFileSync(path.join(root,'king.json'),'utf8')),before=JSON.stringify(config);
 config.rulesVersion=K.RULES;config.registrations=K.registrations(config,bets);config.games=config.games||[];config.results=config.results||[];config.corrections=config.corrections||[];config.recordStatus='active';
 const errors=[],events=[],dates=[...new Set(config.registrations.filter(r=>Date.now()-Date.parse(r.game.date+'T12:00:00Z')<14*86400000||!r.kickoff||!config.results.some(x=>x.registrationId===r.id)).map(r=>r.game.date))];
 await pool(dates,async date=>{try{const raw=await json(BASE+'/scoreboard?dates='+date.replaceAll('-',''));events.push(...raw.events||[]);}catch(e){errors.push(date+': '+e.message);}});
 const matching=g=>events.find(e=>{const teams=e.competitions?.[0]?.competitors?.map(c=>G.norm(c.team?.displayName))||[];const date=new Date(e.date).toLocaleDateString('en-CA',{timeZone:'America/New_York'});return date===g.date&&teams.includes(G.norm(g.away))&&teams.includes(G.norm(g.home));});
 for(const r of config.registrations){const e=matching(r.game);if(e&&!r.kickoff){r.kickoff=e.date;r.eventId=String(e.id);}}
 const finals=[...new Map(config.registrations.map(r=>matching(r.game)).filter(e=>e&&(e.competitions?.[0]?.status?.type?.state||e.status?.type?.state)==='post').map(e=>[String(e.id),e])).values()];
 let saved=0,corrected=0;
 await pool(finals,async event=>{try{
  const raw=await json(BASE+'/summary?event='+event.id);if(String(raw.header?.id)!==String(event.id))throw Error('Mismatched summary');
  const state=raw.header?.competitions?.[0]?.status?.type?.state;if(state!=='post')throw Error('Summary not final');
  const players=G.extractGameStats(raw),observedAt=new Date().toISOString(),url=BASE+'/summary?event='+event.id;
  const regs=config.registrations.filter(r=>matching(r.game)?.id===event.id),game=regs[0]?.game;if(!game)return;
  const compact={id:event.id,date:event.date,name:event.name,status:event.status,competitions:[{status:event.competitions[0].status,competitors:event.competitions[0].competitors.map(c=>({team:{displayName:c.team.displayName,name:c.team.name,abbreviation:c.team.abbreviation},score:c.score,homeAway:c.homeAway}))}]};
  const stored={key:G.gameKey(game),game,eventId:String(event.id),event:compact,players:Object.fromEntries(players),source:'ESPN',sourceUrl:url,sourceVerified:true,observedAt};
  const gi=config.games.findIndex(x=>x.key===stored.key);if(gi<0)config.games.push(stored);else if(JSON.stringify(config.games[gi].players)!==JSON.stringify(stored.players)||JSON.stringify(config.games[gi].event)!==JSON.stringify(stored.event))config.games[gi]=stored;
  for(const r of regs){const v=G.evaluate({...r.leg,override:null},compact,players,'post');if(!['hit','miss','void'].includes(v.status))continue;
   const result={registrationId:r.id,status:v.status,value:v.value,gameState:'post',gameStart:event.date,eventId:String(event.id),source:'ESPN',sourceUrl:url,sourceVerified:true,observedAt};
   const i=config.results.findIndex(x=>x.registrationId===r.id);if(i<0){config.results.push(result);saved++;}else if(config.results[i].status!==v.status||config.results[i].value!==v.value){config.corrections.push({registrationId:r.id,previous:config.results[i],correctedAt:observedAt});config.results[i]=result;corrected++;}
  }
 }catch(e){errors.push(String(event.id)+': '+e.message);}});
 const previous=JSON.parse(before);
 const changed=JSON.stringify({...config,syncStatus:null})!==JSON.stringify({...previous,syncStatus:null})||JSON.stringify(previous.syncStatus?.errors||[])!==JSON.stringify(errors);
 if(changed)config.syncStatus={checkedAt:new Date().toISOString(),source:'ESPN',errors};
 if(JSON.stringify(config)!==before)fs.writeFileSync(path.join(root,'king.json'),JSON.stringify(config,null,2)+'\n');
 console.log(JSON.stringify({registrations:config.registrations.length,finalResults:config.results.length,games:config.games.length,saved,corrected,errors}));
 if(errors.length&&config.games.length===0)process.exitCode=1;
}
if(require.main===module)sync().catch(e=>{console.error(e);process.exitCode=1;});module.exports={sync};
