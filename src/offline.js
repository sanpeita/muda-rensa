export async function prepareOffline(element){
 if(!document.querySelector('meta[name="offline-build"]')){element.textContent='オフライン起動は準備前';return;}
 if(!('serviceWorker' in navigator)||!window.isSecureContext){element.textContent='この接続ではオフライン起動を準備できません';return;}
 element.textContent='通信なしでの起動を準備中…';
 try{
  const registration=await navigator.serviceWorker.register('/sw.js');
  const check=()=>{
   const worker=navigator.serviceWorker.controller;
   if(!worker)return;
   const channel=new MessageChannel();
   const timer=setTimeout(()=>{element.textContent='オフライン準備を確認できません';channel.port1.close();},5000);
   channel.port1.onmessage=event=>{clearTimeout(timer);element.textContent=event.data.complete?'通信なしで起動できます':'オフライン準備は未完了です';channel.port1.close();};
   worker.postMessage('offline-status',[channel.port2]);
  };
  navigator.serviceWorker.addEventListener('controllerchange',check);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='redundant')element.textContent='オフライン準備は未完了です';});});
  let readyTimeout;
  try{
   await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{readyTimeout=setTimeout(()=>reject(new Error('Offline preparation timed out')),15000);})]);
   check();
  }finally{clearTimeout(readyTimeout);}
 }catch{element.textContent='オフライン準備は未完了です';}
}
