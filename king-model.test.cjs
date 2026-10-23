const assert=require('node:assert/strict'),M=require('./king-model.js');
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
approx(M.points(150,3,'won'),13.2);approx(M.points(150,3,'lost'),-8.8);assert.equal(M.points(500,6,'pending'),null);assert.equal(M.points(500,6,'void'),0);
for(const odds of [-1000,-200,100,150,500,100000])for(const legs of [1,3,6,20]){const p=M.implied(odds),w=M.points(odds,legs,'won'),l=M.points(odds,legs,'lost');approx(p*w+(1-p)*l,0);assert.ok(Math.abs(w)<=25&&Math.abs(l)<=25);}
assert.equal(M.week('2026-10-22'),'2026-10-22');assert.equal(M.week('2026-10-26'),'2026-10-22');assert.equal(M.week('2026-10-28'),'2026-10-22');assert.equal(M.week('2026-10-29'),'2026-10-29');assert.equal(M.season('2027-01-15'),'2026');
const bets=[],entries=[];
for(const owner of ['Trey','Rodman'])for(let i=0;i<3;i++){const id=owner+i;bets.push({id,owner,stake:owner==='Trey'?1:1000,game:{date:'2026-10-22'},legs:[{},{},{}]});entries.push({betId:id,firstKickoff:'2026-10-23T00:15:00Z',nominatedAt:'2026-10-22T18:00:00Z',baseOdds:150,oddsVerified:true,effectiveLegs:3,result:'won',settledAt:'2026-10-23T04:00:00Z'});}
const cfg={entries,closedWeeks:['2026-10-22']};
let r=M.standings(cfg,bets,'2026-10-27');assert.equal(r.weekendRows[0].weekendPoints,39.6);assert.equal(r.seasonRows[0].seasonPoints,42.1);assert.equal(r.seasonRows[1].seasonPoints,42.1);assert.equal(r.seasonRows[0].bonus,2.5);assert.equal(r.seasonRows[0].seasonEligible,true);assert.equal(r.issues.length,0);
const empty=M.standings({entries:[],closedWeeks:[]},bets,'2026-10-27');assert.ok(empty.seasonRows.every(x=>x.seasonPoints===0));assert.equal(empty.events.length,0);
let copy=structuredClone(cfg);copy.entries[0].nominatedAt='2026-10-23T01:00:00Z';r=M.standings(copy,bets,'2026-10-27');assert.equal(r.seasonRows.find(x=>x.name==='Trey').seasonPoints,0);assert.ok(r.issues.length);assert.equal(r.seasonRows.find(x=>x.name==='Rodman').bonus,0);
copy=structuredClone(cfg);copy.entries[0].result='pending';r=M.standings(copy,bets,'2026-10-27');assert.ok(r.seasonRows.every(x=>x.bonus===0));
copy=structuredClone(cfg);copy.entries[0].result='lost';r=M.standings(copy,bets,'2026-10-27');assert.equal(r.seasonRows.find(x=>x.name==='Trey').weekendPoints,17.6);assert.equal(r.seasonRows.find(x=>x.name==='Rodman').bonus,5);
copy=structuredClone(cfg);copy.entries[0].oddsVerified=false;r=M.standings(copy,bets,'2026-10-27');assert.equal(r.seasonRows.find(x=>x.name==='Trey').seasonEntries,0);
copy=structuredClone(cfg);copy.entries[0].betId=copy.entries[1].betId;r=M.standings(copy,bets,'2026-10-27');assert.equal(r.seasonRows.find(x=>x.name==='Trey').seasonEntries,0);
console.log('PASS: stake neutrality, odds balancing, length caps, Eastern week boundaries, season rollover, no retroactive points, late/duplicate/unverified exclusions, pending grades, corrections and tied weekend bonuses.');
