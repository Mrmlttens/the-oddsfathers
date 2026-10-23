const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/celebrations-v2.js','utf8');
function harness(){
 const storage=new Map(),nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',innerHTML:'',setAttribute(){},classList:{toggle(){},add(){},remove(){}},focus(){},addEventListener(){},querySelector(selector){return node(selector);}});return nodes.get(id);};
 const c={Date,Map,Set,Math,Number,String,Object,Array,console,localStorage:{setItem:(k,v)=>storage.set(k,v)},readJSON:(k,f)=>storage.has(k)?JSON.parse(storage.get(k)):f,now:()=>new Date().toISOString(),norm:s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),esc:s=>String(s||'').replace(/[<>&"']/g,'_'),money:v=>Number.isFinite(v)?'$'+v.toFixed(2):'N/A',boardDate:()=> '2026-10-22',document:{hidden:false,activeElement:null,addEventListener(){},getElementById:node},$:node,setTimeout:()=>1,clearTimeout(){},celebrationTimer:null,winEvents:{},renderRecentHits(){},findEvent:()=>({id:'game'}),statsByEvent:new Map([['game',new Map()]]),livefieldFailures:new Set(),bets:[],statusOfGame:()=> 'in',evalLeg:leg=>({status:leg.hit?'hit':'live',value:leg.hit?leg.target:0}),ticketStatus:bet=>bet.result||'open',legText:leg=>leg.name+' '+leg.target+'+ '+leg.kind};
 vm.createContext(c);vm.runInContext(source,c);return {c,storage,nodes,get:s=>vm.runInContext(s,c)};
}
const game={date:'2026-10-22',home:'Chicago Bears',away:'New England Patriots'};
const bet=(id,owner,placed=true)=>({id,owner,placed,title:'Sample ticket',game,stake:1,payout:25.38,legs:[{kind:'any_td',name:"D'Andre Swift",target:1,hit:false}],settlement:'auto'});
{
 const h=harness();h.c.bets=[bet('t','Trey'),bet('r','Rodman',false)];h.c.checkLegMilestones();assert.equal(h.get('popupCurrent'),null);
 h.c.bets.forEach(b=>b.legs[0].hit=true);h.c.checkLegMilestones();assert.equal(h.get('popupCurrent.title'),'TOUCHDOWN!');assert.deepEqual(Array.from(h.get('popupCurrent.owners')),['Trey','Rodman (unconfirmed)']);
 h.c.checkLegMilestones();assert.equal(h.get('popupQueue.length'),0);h.c.dismissCelebration();h.c.checkLegMilestones();assert.equal(h.get('popupCurrent'),null);
 console.log('PASS: one grouped TD alert, names and unconfirmed label, no repeat on refresh.');
}
{
 const h=harness();h.c.bets=[bet('one','Trey'),bet('two','Rodman'),bet('unplaced','Gabe',false)];h.c.bets.forEach(b=>{b.result='won';b.legs[0].hit=true;});h.c.checkWinners();
 assert.equal(h.get('popupCurrent.betId'),'one');assert.equal(h.get('popupQueue.length'),1);assert.equal(h.get('popupCurrent.stats[0].value'),'1 / 1');assert.equal(h.get('popupCurrent.stats[1].value'),'$25.38');assert.equal(h.get('popupCurrent.stats[2].value'),'+$24.38');
 h.c.dismissCelebration();assert.equal(h.get('popupCurrent.betId'),'two');h.c.dismissCelebration();h.c.checkWinners();assert.equal(h.get('popupCurrent'),null);assert.ok(!h.get('winEvents.unplaced'));
 console.log('PASS: simultaneous wins queue, correct return/profit, unplaced tickets excluded.');
}
{
 const h=harness();const b=bet('old','Trey');b.legs[0].hit=true;h.c.bets=[b];h.c.checkLegMilestones();assert.equal(h.get('popupCurrent.type'),'catchup');assert.equal(h.get('popupCurrent.title'),'ALREADY HIT');
 console.log('PASS: first-load hits use a catch-up card, not a fake new TD.');
}
{
 const h=harness(),before=JSON.stringify([...h.storage]);h.c.previewCelebration('td');assert.equal(h.get('popupCurrent.demo'),true);assert.equal(h.nodes.get('.celebration-label').textContent,'PREVIEW · SAMPLE RESULT');h.c.dismissCelebration();h.c.previewCelebration('win');assert.equal(h.get('popupCurrent.stats[0].value'),'6 / 6');assert.equal(JSON.stringify([...h.storage]),before);assert.equal(h.c.bets.length,0);
 console.log('PASS: both demo buttons work without changing board data or stored results.');
}
{
 const h=harness();h.c.bets=[bet('one','Trey'),bet('two','Rodman')];h.c.bets.forEach(b=>{b.result='won';b.legs[0].hit=true;});h.c.checkWinners();h.c.bets[1].result='lost';h.c.dismissCelebration();assert.equal(h.get('popupCurrent'),null);
 console.log('PASS: a corrected win is removed from the queue before display.');
}
{
 const h=harness(),b=bet('unknown','Trey');b.payout=null;b.stake=null;assert.equal(h.c.ticketPopup(b).stats[2].value,'N/A');b.payout=361.64;b.stake=25;assert.equal(h.c.ticketPopup(b).stats[2].value,'+$336.64');assert.ok(h.c.ticketPopup(b).note.includes('before fees'));
 console.log('PASS: unknown cash stays N/A; fee exclusion is explicit.');
}
