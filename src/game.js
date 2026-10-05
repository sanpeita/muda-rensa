import {CONFIG as C} from './config.js';
export function createGame(seed=1927){
 let n=seed>>>0;const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const objects=[];
 for(let i=0;i<165;i++){const x=(rand()*26-13),z=(rand()*26-13);if(Math.hypot(x,z)<3){i--;continue;}objects.push({id:i,kind:['tree','car','crate'][i%3],x,z,value:3+i%5,state:'available',absorbProgress:0,respawnAt:0});}
 return {schemaVersion:1,seed,phase:'playing',elapsedSeconds:0,continued:false,drone:{x:0,z:8,heading:{x:0,z:-1},energy:0},target:{x:0,z:0,hp:C.targetHp,maxHp:C.targetHp},score:0,objects,projectiles:[],nextProjectileId:1,shots:0,hyperShots:0};
}
export function moveDrone(s,dx,dz){
 if(s.phase!=='playing')return;const len=Math.hypot(dx,dz);if(len<0.00001)return;
 const ax=s.drone.x,az=s.drone.z;
 s.drone.x=Math.max(-C.bounds,Math.min(C.bounds,ax+dx));s.drone.z=Math.max(-C.bounds,Math.min(C.bounds,az+dz));s.drone.heading={x:dx/len,z:dz/len};
 const vx=s.drone.x-ax,vz=s.drone.z-az,length2=vx*vx+vz*vz;
 for(const o of s.objects){if(o.state==='gone')continue;const t=length2?Math.max(0,Math.min(1,((o.x-ax)*vx+(o.z-az)*vz)/length2)):0;if(Math.hypot(o.x-ax-t*vx,o.z-az-t*vz)<C.passRadius)collect(s,o);}
}
function collect(s,o){if(o.state==='gone')return;o.state='gone';o.respawnAt=s.elapsedSeconds+C.respawnSeconds;o.absorbProgress=0;s.drone.energy=Math.min(C.energyCap,s.drone.energy+o.value);s.score+=o.value;}
function damage(s,amount){const actual=Math.min(s.target.hp,amount);s.target.hp=Math.max(0,s.target.hp-actual);s.score+=Math.round(actual*13);if(s.target.hp<=0)s.phase='won';}
export function release(s,hyper=false){
 if(s.phase!=='playing'||s.drone.energy<=0)return false;
 const energy=s.drone.energy,mult=hyper?C.hyperMultiplier:1;s.drone.energy=0;s.shots++;if(hyper)s.hyperShots++;
 damage(s,energy*C.baseDamage*mult);
 const count=Math.min(90,Math.max(5,Math.ceil(energy/2))),heading=s.drone.heading;
 for(let i=0;i<count;i++){const spread=Math.sin(i*2.4)*(hyper?0.17:0.1),a=Math.atan2(heading.z,heading.x)+spread; s.projectiles.push({id:s.nextProjectileId++,x:s.drone.x,z:s.drone.z,dx:Math.cos(a),dz:Math.sin(a),damage:energy*mult/count,life:C.projectileLife,hyper});}
 return true;
}
export function step(s,dt,{charging=false,clockDelta=dt}={}){
 if(s.phase!=='playing')return;s.elapsedSeconds+=clockDelta;
 for(const o of s.objects){
  if(o.state==='gone'){if(s.elapsedSeconds>=o.respawnAt)o.state='available';else continue;}
  const dist=Math.hypot(o.x-s.drone.x,o.z-s.drone.z);
  if(charging&&dist<C.suctionRadius){o.state='absorbing';o.absorbProgress+=dt/C.suctionSeconds;if(o.absorbProgress>=1)collect(s,o);}
  else if(dist<C.passRadius)collect(s,o);
  else if(o.state==='absorbing'){o.absorbProgress=Math.max(0,o.absorbProgress-dt);if(o.absorbProgress===0)o.state='available';}
 }
 const alive=[];
 for(const p of s.projectiles){p.x+=p.dx*C.projectileSpeed*dt;p.z+=p.dz*C.projectileSpeed*dt;p.life-=dt;if(Math.hypot(p.x-s.target.x,p.z-s.target.z)<2){damage(s,p.damage);}else if(p.life>0)alive.push(p);}
 s.projectiles=alive;
 if(s.phase==='playing'&&!s.continued&&s.elapsedSeconds>=C.limitSeconds)s.phase='continue';
}
export function continueGame(s){if(s.phase==='continue'){s.phase='playing';s.continued=true;}}
