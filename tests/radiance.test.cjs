'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const game = {id:'live',state:'in'};
const context = vm.createContext({scoreState:'connected',livefieldSummaries:new Map([['live',{time:100000}]]),livefieldFailures:new Set(),legGame:(l,b)=>l.game||b.game,findEvent:g=>g,statusOfGame:g=>g.state});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app-views.js'),'utf8'),context);
const leg = () => ({kind:'receiving_yards',target:100});
const live = value => ({status:'live',value});
const check = (legs,states,extra={},status='live',now=100000) => context.ticketRadiance({game,legs,...extra},{total:legs.length,states},status,now);
for (let size=1;size<=100;size++) {
  const legs=Array.from({length:size},leg), states=Array.from({length:size},()=>live(80));
  assert.equal(check(legs,states),true,`${size} legs at 80%`);
  for(let i=0;i<size;i++) {
    const changed=states.slice();changed[i]=live(79.999);
    assert.equal(check(legs,changed),false,'Every leg must qualify, not the average');
  }
}
assert(check([leg(),leg()],[{status:'hit'},live(80)]));
assert(check([leg(),leg()],[{status:'void'},live(80)]));
assert(!check([leg()],[{status:'hit'}]));
assert(!check([],[]));
for(const state of ['miss','review','unknown','pending'])assert(!check([leg()],[{status:state,value:90}]));
for(const value of [null,undefined,NaN,Infinity,-1])assert(!check([leg()],[live(value)]));
for(const kind of ['ml','spread','drive_offensive_td','unknown'])assert(!check([{kind,target:1}],[live(1)]));
assert(!check([{...leg(),side:'under'}],[live(80)]));
assert(!check([{...leg(),target:0}],[live(80)]));
assert(!check([leg()],[live(80)],{archivedAt:'now'}));
assert(!check([leg()],[live(80)],{settlement:'lost'}));
for(const status of ['open','won','lost','review'])assert(!check([leg()],[live(80)],{},status));
assert(!check([leg()],[live(80)],{},'live',190001));
context.livefieldFailures.add('live');assert(!check([leg()],[live(80)]));context.livefieldFailures.clear();
context.scoreState='failed';assert(!check([leg()],[live(80)]));context.scoreState='connected';
assert(!check([{...leg(),game:{id:'future',state:'pre'}}],[live(80)]));
assert(!check([{...leg(),game:{id:'missing',state:'in'}}],[live(80)]));
assert(!check([leg(),leg()],[live(80)]));
console.log('PASS radiance: 1–100 legs, every-leg threshold, hits/voids, unsupported markets, missing/stale/failed feeds, settlement and archive guards.');
