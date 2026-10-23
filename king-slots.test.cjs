'use strict';
const assert=require('node:assert/strict'),K=require('./king-model.js');let count=0;
const game={date:'2026-10-22',away:'A',home:'B',sport:'NFL'},start='2026-10-23T00:15:00Z';
const bet=(i,owner='A',extra={})=>({id:'b'+String(i).padStart(3,'0'),owner,game,createdAt:new Date(Date.parse(start)-3600000+i*1000).toISOString(),legs:[{kind:'rushing_yards',name:'Player'+i,team:'A',target:50}],...extra});
const conf=()=>({version:1,rulesVersion:K.RULES,registrations:[],results:[]});
const evals=(bets,status='hit',gameState='post')=>bets.flatMap(b=>b.legs.map((l,i)=>({betId:b.id,legIndex:i,gameStart:start,gameState,status,observedAt:start})));
const score=(bets,e=evals(bets),cfg=conf())=>K.liveLegAwards(cfg,bets,e).length;
function test(name,fn){fn();count++;console.log('PASS '+name)}
test('wager absent and placement false still score',()=>{assert.equal(score([bet(0,'Gabe',{stake:null,placed:false})]),1)});
test('cap is ten attempts, not ten hits',()=>{const bs=Array.from({length:100},(_,i)=>bet(i)),e=evals(bs);e.slice(0,10).forEach(x=>x.status='miss');assert.equal(score(bs,e),0)});
test('late entries never take scoring slots',()=>{const b=bet(0,'A',{createdAt:'2026-10-23T00:16:00Z'});assert.equal(score([b]),0);assert.match(K.scoringReport(conf(),[b],evals([b])).decisions[0].reason,/kickoff/)});
test('missing kickoff explained and awards no points',()=>{const b=bet(0),e=evals([b]);e[0].gameStart=null;assert.equal(score([b],e),0);assert.equal(K.standings(conf(),[b],game.date,e).issues.length,1)});
test('duplicate slips count once',()=>{const bs=Array.from({length:20},(_,i)=>bet(i,'A',{legs:bet(0).legs}));assert.equal(score(bs),1)});
test('lower later threshold cannot replace missed original',()=>{const a=bet(0),b=bet(1,'A',{legs:[{...a.legs[0],target:20}]});const e=evals([a,b]);e[0].status='miss';assert.equal(score([a,b],e),0)});
test('separate player stats count separately',()=>{const a=bet(0);a.legs.push({...a.legs[0],kind:'any_td',target:1});assert.equal(score([a]),2)});
test('opposing moneylines share a family',()=>{const a=bet(0,'A',{legs:[{kind:'ml',team:'A'}]}),b=bet(1,'A',{legs:[{kind:'ml',team:'B'}]});assert.equal(score([a,b]),1)});
test('opposing player stat picks share a family',()=>{const a=bet(0),b=bet(1,'A',{legs:[{...a.legs[0],side:'under'}]});assert.equal(score([a,b]),1)});
test('void consumes a slot; no eleventh replacement',()=>{const bs=Array.from({length:11},(_,i)=>bet(i)),e=evals(bs);e[0].status='void';assert.equal(score(bs,e),9)});
test('correction at cap drops to nine',()=>{const bs=Array.from({length:11},(_,i)=>bet(i)),e=evals(bs);assert.equal(score(bs,e),10);e[0].status='miss';assert.equal(score(bs,e),9)});
test('immutable snapshots survive ticket deletion and target edits',()=>{const a=bet(0),cfg=conf();cfg.registrations=K.registrations(cfg,[a]).map(r=>({...r,kickoff:start}));const edited=bet(0,'A',{legs:[{kind:'rushing_yards',name:'Other player',target:1}]});assert.equal(K.scoringReport(cfg,[edited],evals([a])).selected[0].leg.target,50);assert.equal(K.scoringReport(cfg,[],evals([a])).selected.length,1)});
test('saved final points survive feed expiry; live corrections override',()=>{const a=bet(0),cfg=conf();cfg.registrations=K.registrations(cfg,[a]).map(r=>({...r,kickoff:start}));cfg.results=[{registrationId:'b000:0',status:'hit',gameState:'post',sourceVerified:true}];assert.equal(score([],[],cfg),1);assert.equal(score([],evals([a],'miss'),cfg),0)});
test('manual hits never fabricate scoring awards',()=>{const a=bet(0),e=evals([a]);e[0].source='manual';assert.equal(score([a],e),0)});
test('live points provisional; final points confirmed',()=>{const a=bet(0);assert.equal(K.liveLegAwards(conf(),[a],evals([a],'hit','in'))[0].confirmed,false);assert.equal(K.liveLegAwards(conf(),[a],evals([a]))[0].confirmed,true)});
test('identical names across owners count independently',()=>{assert.equal(score([bet(0,'A'),bet(1,'B',{legs:bet(0).legs})]),2)});
test('reverse board ordering does not change selections',()=>{const bs=Array.from({length:15},(_,i)=>bet(i));const cfg=conf();assert.deepEqual(K.scoringReport(cfg,bs,evals(bs)).selected.map(x=>x.id),K.scoringReport(cfg,bs.slice().reverse(),evals(bs)).selected.map(x=>x.id))});
test('tie crown splits five season points only after week ends',()=>{const bs=[bet(0,'A'),bet(1,'B'),bet(2,'C')],e=evals(bs);let view=K.standings(conf(),bs,'2026-10-23',e);assert(view.seasonRows.every(r=>r.bonus===0));view=K.standings(conf(),bs,'2026-10-29',e);assert(Math.abs(view.seasonRows.reduce((s,r)=>s+r.bonus,0)-5)<1e-10);assert(view.seasonRows.every(r=>r.weekendPoints===0))});
test('unresolved participant blocks crown finalization',()=>{const bs=[bet(0,'A'),bet(1,'B')],e=evals(bs);e[1].status='review';assert(K.standings(conf(),bs,'2026-10-29',e).seasonRows.every(r=>r.bonus===0))});
test('one entrant or all misses receives no crown bonus',()=>{assert.equal(K.standings(conf(),[bet(0)],'2026-10-29',evals([bet(0)])).seasonRows[0].bonus,0);const bs=[bet(0,'A'),bet(1,'B')];assert(K.standings(conf(),bs,'2026-10-29',evals(bs,'miss')).seasonRows.every(r=>r.bonus===0))});
test('week boundaries include Monday and reset Thursday',()=>{assert.equal(K.week('2026-10-26'),'2026-10-22');assert.equal(K.week('2026-10-28'),'2026-10-22');assert.equal(K.week('2026-10-29'),'2026-10-29')});
// Enumerate every hit/miss outcome for the ten slots; extra winners cannot change it.
for(let mask=0;mask<1024;mask++){const bs=Array.from({length:10},(_,i)=>bet(i)),e=evals(bs);e.forEach((x,i)=>x.status=mask&(1<<i)?'hit':'miss');const expected=score(bs,e);for(const n of [20,50,100]){const extra=Array.from({length:n},(_,i)=>bet(i));assert.equal(score(extra,[...e,...evals(extra.slice(10))]),expected)}}
console.log('PASS '+count+' scenario tests and 3072 exhaustive volume comparisons');
