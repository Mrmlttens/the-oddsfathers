/* PumpQuest 1.3 — CANONICAL masks shared by every front/back art skin.
   Paths are calibrated to the original Stormhorn front/back illustration in a 941 × 1672 viewBox.
   Maps reflect workout LOGGING RECENCY, not actual muscle recovery or medical readiness. */
(function(root){'use strict';
 const FRONT={
  upperChest:'M368 365 Q418 363 467 378 L468 419 Q430 402 381 426 L345 411Z M484 379 Q542 361 591 368 L610 412 Q562 399 485 421Z',
  lowerChest:'M347 422 Q402 426 470 427 L469 492 Q429 506 386 483Z M487 428 Q562 422 607 422 L576 487 Q530 511 485 494Z',
  frontDelts:'M309 349 Q264 341 229 383 Q209 414 230 471 L303 459 Q323 422 345 390Z M624 381 Q659 342 702 362 Q746 387 729 457 L657 460 Q641 418 624 381Z',
  sideDelts:'M224 385 Q189 403 186 468 L215 507 L237 471Z M729 395 Q772 411 772 473 L740 507 L731 468Z',
  biceps:'M223 492 Q260 473 294 489 L283 603 Q263 654 224 633 L199 577Z M652 494 Q684 473 720 488 L747 578 Q733 638 697 637 L670 605Z',
  forearms:'M188 616 Q217 624 257 641 L225 744 L157 768 Q135 731 149 692Z M689 640 Q733 617 762 613 L790 692 Q806 727 785 761 L714 744Z',
  abs:'M419 495 L470 512 L470 696 Q434 686 405 661 L399 552Z M486 512 L532 493 L559 545 L545 659 Q518 689 485 693Z',
  obliques:'M367 498 Q388 516 401 541 L400 637 L368 613 L350 552Z M556 535 Q574 511 597 495 L616 548 L585 616 L553 641Z',
  quads:'M311 823 Q377 790 441 826 L438 1044 Q423 1135 345 1149 Q295 1104 282 1003Z M516 829 Q571 786 646 817 L673 1007 Q655 1101 605 1144 Q533 1136 520 1051Z',
  adductors:'M439 836 L464 845 L465 1071 L441 1025Z M492 846 L516 832 L515 1026 L493 1071Z',
  calves:'M288 1162 Q336 1148 377 1163 L373 1302 L337 1346 L294 1285Z M575 1161 Q625 1145 672 1162 L656 1300 L615 1343 L576 1277Z'
 };
 const BACK={
  traps:'M404 325 Q456 359 481 378 Q514 360 553 324 L551 420 Q508 433 479 455 Q447 435 409 424Z',
  rearDelts:'M382 350 Q346 351 322 389 L308 466 L392 463 L415 420Z M551 414 L574 355 Q622 348 653 398 L654 463 L572 468Z',
  sideDelts:'M320 398 Q295 411 291 455 L317 499 L348 460Z M641 397 Q674 414 673 454 L644 501 L620 455Z',
  triceps:'M306 495 Q341 466 373 490 L361 607 L302 625 L284 567Z M590 494 Q627 465 658 491 L684 570 L654 623 L600 609Z',
  forearms:'M288 624 L358 630 L332 765 L279 782 Q255 738 273 695Z M620 628 L674 620 L703 694 Q719 740 692 787 L641 768Z',
  lats:'M381 471 L433 483 L432 659 L376 716 Q356 621 365 542Z M520 484 L574 471 L591 549 Q596 643 577 713 L520 662Z',
  midBack:'M437 454 Q480 484 519 453 L520 634 L481 668 L437 633Z',
  lowerBack:'M420 662 L479 685 L539 663 L556 750 L407 749Z',
  glutes:'M378 774 L474 770 L470 866 L383 877Z M485 770 L582 772 L583 875 L487 869Z',
  hamstrings:'M369 880 Q415 857 469 874 L464 1052 L401 1115 L360 1037Z M486 877 Q541 854 588 881 L600 1041 L558 1109 L493 1051Z',
  calves:'M362 1120 L420 1124 L409 1276 L369 1321 L343 1271Z M547 1125 L605 1119 L616 1264 L582 1327 L550 1279Z'
 };
 const statusClass=s=>['hot','warm','neutral','cold','untracked'].includes(s)?s:'untracked';
 function draw({side='front',skin='stormhorn',zones={},selected='',demo=false,active=true}={}){
  const isBack=side==='back',contract=root.PQ_SKIN_CONTRACT;
  const registered=contract?.resolve(skin);const art=registered?.[side]||'./assets/champion-stormhorn-'+side+'.webp';
  const qa=!!(root.location?.search||'').match(/(?:\?|&)artQA=1(?:&|$)/);
  const region=isBack?BACK:FRONT;
  const paths=Object.entries(region).map(([id,d])=>{
   let z=zones[id]||{label:id,status:'untracked'};let status=statusClass(z.status);
   const title=(z.label||id)+': '+(status==='cold'?`${z.days} days since last logged session`:status==='untracked'?'no logged sets':status+' · '+(z.days??0)+' days');
   return `<g class="pq-anatomy-region state-${status} ${selected===id?'is-active':''}" data-action="artZone" data-zone="${id}" role="button" tabindex="0" aria-label="${title}" style="cursor:pointer"><path class="pq-muscle-aura" d="${d}"/><path class="pq-muscle-fill" d="${d}"/><title>${title}</title></g>`;
  }).join('');
  return `<div class="pq-art-scene pq-art-${side}" aria-label="Cinematic front-and-back Stormhorn illustration with directly highlighted muscles"><svg class="pq-art-svg" viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Tap a highlighted body region to inspect its logged training history"><defs><filter id="pq-heat-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter><linearGradient id="pq-back-edge-fade"><stop offset="0%" stop-color="black"/><stop offset="13%" stop-color="white"/><stop offset="87%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><mask id="pq-back-sides" maskUnits="userSpaceOnUse"><rect width="941" height="1672" fill="url(#pq-back-edge-fade)"/></mask><radialGradient id="pq-sheen"><stop stop-color="#b4f8ff" stop-opacity=".65"/><stop offset="1" stop-color="#37aaff" stop-opacity="0"/></radialGradient></defs><image href="${skin==='stormhorn'&&root.PQ_ART_ASSETS?.[side]||art}" width="941" height="1672" x="0" y="0" preserveAspectRatio="none"/><g class="pq-heatmap ${active?'':'pq-heatmap-off'}">${paths}</g>${!isBack?'<g class="pq-eye-lights" aria-hidden="true"><ellipse cx="447" cy="250" rx="16" ry="9" fill="url(#pq-sheen)"/><ellipse cx="514" cy="249" rx="16" ry="9" fill="url(#pq-sheen)"/></g>':''}${qa&&contract?contract.guide(side):''}</svg><div class="pq-air-particles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>${demo?'<div class="pq-demo-watermark">VISUAL DEMO · NO WORKOUT ADDED</div>':''}</div>`;
 }
 root.PQ_ART={draw,FRONT,BACK,rigId:'pq-19-region-art-v1'};
})(typeof window!=='undefined'?window:globalThis);