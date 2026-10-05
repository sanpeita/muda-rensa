import {createGame,moveDrone,release,step,continueGame} from './game.js';
import {GestureInput} from './input.js';
import {GameRenderer} from './render.js';
import {loadSession,saveSession} from './persistence.js';
const $=id=>document.getElementById(id),canvas=$('game');
let storage;
try{storage=window.localStorage;}catch{storage=null;}
const loaded=loadSession(storage);
let state=loaded.status==='ok'?loaded.state:createGame(),renderer,blocked=loaded.status==='invalid';
let saveMessage=loaded.status==='ok'?'続きから再開しました':loaded.status==='unavailable'?'この端末では続きの保存ができません':'続きはこの端末に保存されます';
let lastSave=performance.now(),lastSignature='';
function persist(){
 if(blocked)return;
 const result=saveSession(storage,state);if(!result.ok)saveMessage=result.message||'この端末では続きの保存ができません';
 lastSave=performance.now();lastSignature=state.score+'|'+state.shots+'|'+state.phase+'|'+state.continued;
}
try{renderer=new GameRenderer(canvas);}catch(e){$('overlay').hidden=false;$('overlay-title').textContent='描画を開始できません';$('overlay-text').textContent='WebGL対応ブラウザで開いてください。'+e.message;throw e;}
const input=new GestureInput(canvas,{
 onMove(dx,dy){if(blocked)return;const p=renderer.screenDeltaToWorld(dx,dy);moveDrone(state,p.x,p.z);},
 onCharge(){},onHyper(){},onCancel(){},onRelease(hyper){if(!blocked){release(state,hyper);persist();}}
});
$('continue-button').onclick=()=>{continueGame(state);input.cancel();persist();};
$('restart-button').onclick=()=>{state=createGame();blocked=false;input.cancel();displayScore=0;saveMessage='続きはこの端末に保存されます';previous=performance.now();persist();};
let previous=performance.now(),hidden=document.hidden,displayScore=state.score;
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;previous=performance.now();input.cancel();if(hidden)persist();});
window.addEventListener('pagehide',()=>{input.cancel();persist();});
window.addEventListener('pageshow',()=>{previous=performance.now();});
window.addEventListener('blur',()=>input.cancel());
function frame(now){
 const realDt=Math.max(0,(now-previous)/1000),dt=Math.min(0.04,realDt);previous=now;
 if(!hidden){
  if(!blocked)input.update(now);else input.cancel();
  let budget=Math.min(.5,realDt),first=true;
  while(!blocked&&budget>0){const slice=Math.min(.025,budget);step(state,slice,{charging:input.mode==='charging',clockDelta:first?realDt:0});budget-=slice;first=false;}
  renderer.update(state,{charging:input.mode==='charging',hyper:input.hyper},dt);
 }
 if(state.phase!=='playing')input.cancel();
 const signature=state.score+'|'+state.shots+'|'+state.phase+'|'+state.continued;
 if(!blocked&&(signature!==lastSignature||now-lastSave>=1000))persist();
 $('save-status').textContent=saveMessage;
 displayScore+=(state.score-displayScore)*Math.min(1,dt*10);if(Math.abs(displayScore-state.score)<1)displayScore=state.score;
 $('score').textContent=Math.floor(displayScore).toLocaleString('ja-JP');$('energy').textContent=Math.floor(state.drone.energy);
 $('energy-fill').style.width=state.drone.energy/180*100+'%';$('hp').textContent=Math.ceil(state.target.hp)+' / '+state.target.maxHp;$('hp-fill').style.width=state.target.hp/state.target.maxHp*100+'%';
 const seconds=Math.max(0,Math.ceil(300-state.elapsedSeconds));$('time').textContent=state.continued?'続行 '+Math.floor(state.elapsedSeconds/60)+':'+String(Math.floor(state.elapsedSeconds%60)).padStart(2,'0'):Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 $('mode').textContent=input.hyper?'HYPER READY · 離して放出':input.mode==='charging'?'CYCLONE · 指で円を描く':input.mode==='moving'?'MOVE · 止めてためる':'DRAG · 指をずらして移動';
 $('mode').dataset.hyper=input.hyper;
 $('overlay').hidden=!blocked&&state.phase==='playing';$('continue-button').hidden=blocked||state.phase!=='continue';
 if(state.phase==='continue'){$('overlay-title').textContent='つづける？';$('overlay-text').textContent='5分の一区切り。もう少し吸い込んで、撃破まで。';}
 if(state.phase==='won'){$('overlay-title').textContent='撃破。ムダ、完了。';$('overlay-text').textContent='SCORE '+Math.floor(state.score).toLocaleString('ja-JP')+' / HYPER '+state.hyperShots+'回';}
 if(blocked){$('overlay-title').textContent='続きのデータを読み込めません';$('overlay-text').textContent='保存データを残したまま停止しました。「はじめから」で新しいプレイに置き換えます。';}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
