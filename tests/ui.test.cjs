'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),records=JSON.parse(fs.readFileSync(path.join(root,'king.json'))),data=JSON.parse(fs.readFileSync(path.join(root,'bets.json'))),G=require('../game-model.js');
const events=new Map(records.games.map(g=>[g.key,g.event]));for(const r of records.registrations){const key=G.gameKey(r.game);if(!events.has(key)){const competitors=[{team:{displayName:r.game.away,abbreviation:'AWY'},homeAway:'away',score:'0'},{team:{displayName:r.game.home,abbreviation:'HME'},homeAway:'home',score:'0'}],status={type:{state:'pre',shortDetail:'Pregame'}};events.set(key,{id:r.eventId||'pre-'+key,date:r.kickoff,status,competitions:[{competitors,status}]});}}
class Local extends ResourceLoader{fetch(url){const u=new URL(url);if(u.hostname!=='odds.test')return null;const p=path.join(root,u.pathname.replace(/^\//,''));return fs.existsSync(p)?Promise.resolve(fs.readFileSync(p)):null;}}
let failed=false;const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://odds.test/',resources:new Local(),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.CSS={escape:s=>s.replace(/[^a-z0-9_-]/gi,'')};w.fetch=async input=>{const u=new URL(input,'https://odds.test/');if(failed&&u.hostname!=='odds.test')throw Error('Network down');let body;if(u.pathname.endsWith('bets.json'))body=data;else if(u.pathname.endsWith('king.json'))body=records;else if(u.pathname.endsWith('/scoreboard')){const date=u.searchParams.get('dates');body={events:[...events.values()].filter(e=>!date||new Date(e.date).toLocaleDateString('en-CA',{timeZone:'America/New_York'}).replaceAll('-','')===date)};}else if(u.pathname.endsWith('/summary')){const event=[...events.values()].find(e=>String(e.id)===u.searchParams.get('event'));body={header:{...event},boxscore:{players:[],teams:[]},drives:{}};}else throw Error('Unhandled fetch '+u);return {ok:true,json:async()=>structuredClone(body)};};}});
async function delay(ms=50){await new Promise(r=>setTimeout(r,ms));}
(async()=>{await new Promise(r=>dom.window.addEventListener('load',r));await delay(250);const w=dom.window,d=w.document,call=code=>w.eval(code);
 assert.equal(errors.length,0,errors.join('\n'));assert(d.querySelectorAll('#ticketGrid .ticket').length>=8);assert.equal(d.getElementById('closestPanel'),null);

 assert.equal(d.querySelector('.shell').dataset.view,'dashboard','Initial screen should use compact War Room styling');
 for(const el of d.querySelectorAll('#ticketGrid .ticket')){
  for(const cls of ['.ticket-title','.teamchips','.ticket-bottom','.progressbox','.ticket-buttons','.ticket-odds','.ticket-no','.ticket-owner','.matchup'])
   assert(el.querySelector(cls),'Micro ticket missing '+cls);
  assert.equal(w.getComputedStyle(el.querySelector('.ticket-content')).display,'grid','Micro ticket must have compact grid layout');
  assert(el.querySelector('[data-action="expand"]'),'Tracking details must remain accessible');
  assert(el.querySelector('[data-action="share"]'),'Sharing must remain available');
  assert(el.querySelector('.p-dot'),'Leg-level status indicators must remain');
  assert.equal(el.querySelectorAll('.teamchip').length,2,'Both teams remain shown');
 }
 d.querySelector('[data-tab="profiles"]').click();assert.equal(d.getElementById('profilesView').hidden,false);assert.equal(d.getElementById('dashboardView').hidden,true);assert(d.getElementById('profileDetail').textContent.includes('Trey'));assert.equal(d.getElementById('livefield').hidden,true);assert.equal(d.getElementById('upcomingGames').hidden,true);
 for(const name of ['Gabe','Jeff','Rodman','Trey']){const el=d.getElementById('profileSelect');el.value=name;el.dispatchEvent(new w.Event('change'));assert(d.querySelector('#profileDetail .profile-hero h3').textContent.includes(name));assert(!d.getElementById('profileDetail').textContent.includes('NaN'));}

 assert.equal(d.querySelector('.shell').dataset.view,'profiles');
 assert(d.querySelector('#profileDetail > .profile-focus-stage'),'Profile XP hero missing');
 assert.equal(d.querySelectorAll('#profileDetail > details.profile-drilldown').length,4);
 assert([...d.querySelectorAll('#profileDetail > details.profile-drilldown')].every(el=>!el.open),'Advanced panels should default collapsed');
 assert.equal(d.querySelectorAll('#profileDetail > .profile-focus-stage .feature-stat').length,4);
 d.querySelector('#profileDetail > details[data-profile-panel="badges"]').open=true;
 call('renderProfiles()');
 assert(d.querySelector('#profileDetail > details[data-profile-panel="badges"]').open,'Expanded profile details must survive rerender');
 d.querySelector('[data-tab="history"]').click();assert.equal(d.getElementById('historyView').hidden,false);assert.equal(d.querySelectorAll('#historyList details').length,call('bets.filter(b=>b.archivedAt||isFinalTicket(b)).length'));
 assert.equal(d.querySelector('.shell').dataset.view,'history');
 assert.equal(d.querySelectorAll('#historySummary > div').length,4,'Missing mini summary');
 assert(d.querySelectorAll('#historyList .history-date').length>0,'Missing date grouping');
 assert(/WON|LOST|REVIEW/.test(d.querySelector('#historyList .history-ticket .hist-pay').textContent),'Archive should lead with status');
 const history=d.querySelector('#historyList details');history.open=true;call('render()');assert(d.querySelector('#historyList details').open);assert(d.querySelector('#historyList .leg').textContent.length>0);
 d.getElementById('historyOwner').value='Trey';d.getElementById('historyOwner').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('#historyList details').length,call("bets.filter(b=>b.owner==='Trey'&&(b.archivedAt||isFinalTicket(b))).length"));
 d.querySelector('[data-tab="leaderboard"]').click();assert.equal(d.querySelectorAll('#kingWeekendRows .king-person').length,new Set(data.bets.map(b=>b.owner)).size);assert(!d.getElementById('kingStatus').textContent.includes('First 10'));assert(!d.getElementById('kingStatus').textContent.includes('pending approval'));
 assert(d.querySelectorAll('#kingWeekendRows .king-meter-fill').length===new Set(data.bets.map(b=>b.owner)).size,'Weekend rating graphic missing');
 assert(d.querySelectorAll('#kingSeasonRows .king-meter-fill').length===new Set(data.bets.map(b=>b.owner)).size,'Season rating graphic missing');
 assert(d.querySelector('#kingWeekendRows .king-meter-fill').getAttribute('style').includes('width:'));
 assert.equal(d.querySelector('details.king-wagers').open,false,'Money board should start collapsed');
 assert(d.getElementById('kingStatus').textContent.includes('5 graded picks'));
 assert.equal(d.querySelector('.shell').dataset.view,'leaderboard','King must have a scoped clean-screen layout');
 assert.equal(d.getElementById('kingWeekendPanel').hidden,false,'Weekend chart starts visible');
 assert.equal(d.getElementById('kingSeasonPanel').hidden,true,'Season chart starts hidden');
 assert.equal(d.getElementById('kingWeekendToggle').getAttribute('aria-pressed'),'true');
 const seasonStandings=call('KingModel.standings(kingConfig,bets,boardDate(),kingEvaluations()).seasonRows');
 d.getElementById('kingSeasonToggle').click();
 assert.equal(d.getElementById('kingWeekendPanel').hidden,true,'Weekend panel collapses when selecting Season');
 assert.equal(d.getElementById('kingSeasonPanel').hidden,false,'Season chart visible');
 assert.equal(d.getElementById('kingSeasonToggle').getAttribute('aria-pressed'),'true');
 assert(d.getElementById('kingSeasonHint').textContent.length>15,'Season has a plain-language explanation');
 for(const row of Array.from(d.querySelectorAll('#kingSeasonRows .king-person'))){
   const name=row.querySelector('.profile-link').textContent,entry=seasonStandings.find(r=>r.name===name);
   if(entry.seasonWeeks===0){
     if(entry.graded>=5){
       assert(row.classList.contains('king-preview'),'Current-week scores must be visibly provisional');
       assert(row.querySelector('.king-number').textContent.includes(entry.weekendPoints.toFixed(2)),'Season preview must reflect the exact weekend rating');
       assert(row.querySelector('.king-number').textContent.includes('PREVIEW'),'Preview must never be labeled official CP');
       assert(row.querySelector('.king-state').textContent.includes('LIVE PREVIEW'));
     }else{
       assert.equal(row.querySelector('.king-number').textContent.trim(),'—','No eligible preview must not be shown as 0 CP');
       assert(row.classList.contains('king-unranked'));
       assert.equal(row.querySelector('.king-meter-fill').style.width,'0%');
     }
   }
 }
 d.getElementById('kingWeekendToggle').click();
 assert.equal(d.getElementById('kingWeekendPanel').hidden,false);
 assert.equal(d.getElementById('kingSeasonPanel').hidden,true);
 assert.equal(d.getElementById('kingWeekendToggle').getAttribute('aria-pressed'),'true');

 const receipt=call("popupPointReceipts([{bet:bets[0],leg:bets[0].legs[0]}])")[0];
 assert.equal(receipt.cumulative,true);
 assert.equal(receipt.points,receipt.rating,'Popups must show true weekend rating, not fake individual-leg points');

 const before=call('KingModel.standings(kingConfig,bets,boardDate(),kingEvaluations()).weekendRows.map(r=>[r.name,r.weekendPoints])');failed=true;await call('refreshLive(true)');call('render()');assert.equal(call('scoreState'),'failed');assert(d.getElementById('feedHealthLabel').textContent.includes('OFFLINE'));assert.deepEqual(call('KingModel.standings(kingConfig,bets,boardDate(),kingEvaluations()).weekendRows.map(r=>[r.name,r.weekendPoints])'),before);
 d.querySelector('[data-tab="dashboard"]').click();d.querySelector('#ticketGrid [data-action="expand"]').click();assert(d.querySelector('#ticketGrid .legs'));assert.equal(errors.length,0,errors.join('\n'));
 // Exercise the real card renderer with live proximity changes.
 call(`(() => {
   const original={bets,evalLeg,findEvent,statusOfGame,scoreState,selectedOwner,selectedStatus};
   const id='radiance-fixture', game={date:'2026-10-26',away:'Dallas Cowboys',home:'Philadelphia Eagles'};
   let value=80;
   try {
     bets=[{id,owner:'Trey',title:'Proximity fixture',game,stake:1,payout:10,legs:[{name:'Test Player',kind:'receiving_yards',target:100}]}];
     selectedOwner='all'; selectedStatus='all'; scoreState='connected';
     evalLeg=()=>({status:'live',value}); findEvent=()=>({id}); statusOfGame=()=> 'in';
     livefieldSummaries.set(id,{time:Date.now()});
     renderTickets();
     if(!document.querySelector('#ticketGrid .ticket-radiant'))throw Error('Near ticket missing radiance');
     value=79;renderTickets();
     if(document.querySelector('#ticketGrid .ticket-radiant'))throw Error('Radiance persisted below threshold');
     value=80;livefieldFailures.add(id);renderTickets();
     if(document.querySelector('#ticketGrid .ticket-radiant'))throw Error('Failed feed retained radiance');
   } finally {
     ({bets,evalLeg,findEvent,statusOfGame,scoreState,selectedOwner,selectedStatus}=original);
     livefieldSummaries.delete(id);livefieldFailures.delete(id);renderTickets();
   }
 })()`);
 console.log('PASS UI: navigation, all 4 profiles, no redundant closest panel, completed-only expandable history, owner filters, scoring, feed outage preserving saved results, ticket expansion.');dom.window.close();
})().catch(e=>{console.error(e);console.error(errors);dom.window.close();process.exitCode=1;});

