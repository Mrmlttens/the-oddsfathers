
(() => {
'use strict';
const el=id=>document.getElementById(id);
let imageData='',busy=false,selection=0,config={endpoint:'',requiresAccessCode:true};
const allowed=['image/jpeg','image/png','image/webp'];
const ready=()=>{el('analystRun').disabled=busy||!imageData||!config.endpoint;el('analystClear').disabled=busy;el('analystFile').disabled=busy;el('analystQuestion').disabled=busy;el('analystCode').disabled=busy;};
function clear(){selection++;imageData='';el('analystFile').value='';el('analystPreview').removeAttribute('src');el('analystPreview').hidden=true;el('analystClear').hidden=true;el('analystFileInfo').textContent='';el('analystResults').textContent='Your analysis will appear here.';el('analystStatus').textContent=config.endpoint?'Choose a bet-slip image.':'AI analysis is awaiting activation.';ready();}
async function choose(file){
 if(busy||!file)return;
 clear();const token=selection;
 if(!allowed.includes(file.type)){el('analystStatus').textContent='Use a JPG, PNG or WebP image.';return;}
 if(!file.size||file.size>8*1024*1024){el('analystStatus').textContent='Choose an image smaller than 8 MB.';return;}
 try{
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read that image.'));reader.readAsDataURL(file);});
 const probe=new Image();probe.src=data;await probe.decode();
 if(token!==selection)return;
 imageData=data;el('analystPreview').src=data;el('analystPreview').hidden=false;el('analystClear').hidden=false;el('analystFileInfo').textContent=file.name+' · '+(file.size/1024/1024).toFixed(1)+' MB';
 el('analystStatus').textContent=config.endpoint?'Ready to analyze.':'Image ready. AI analysis is awaiting activation.';ready();
 }catch{if(token===selection)el('analystStatus').textContent='That image could not be opened. Try another screenshot.';}
}
el('analystFile').addEventListener('change',e=>choose(e.target.files[0]));
el('analystClear').addEventListener('click',clear);
const drop=el('analystDrop');
['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragging');}));
['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragging');}));
drop.addEventListener('drop',e=>choose(e.dataTransfer.files[0]));
el('analystRun').addEventListener('click',async()=>{
 if(busy||!imageData||!config.endpoint)return;
 const code=el('analystCode').value.trim();
 if(config.requiresAccessCode&&!code){el('analystStatus').textContent='Enter the crew access code first.';el('analystCode').focus();return;}
 busy=true;ready();el('analystStatus').textContent='Reading your slip and reviewing the legs…';el('analystResults').textContent='';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{
 const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(code?{'X-Crew-Code':code}:{})},body:JSON.stringify({image:imageData,question:el('analystQuestion').value.trim()}),signal:controller.signal,credentials:'omit'});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Analysis unavailable. Please try again.');
 if(typeof result.analysis!=='string'||!result.analysis.trim())throw Error('No readable analysis returned. Try a clearer screenshot.');
 el('analystResults').textContent=result.analysis;el('analystStatus').textContent='Analysis complete · Verify all extracted lines against your slip.';
 }catch(error){el('analystStatus').textContent=error.name==='AbortError'?'Analysis timed out. Try again.':error.message;}
 finally{clearTimeout(timer);busy=false;ready();}
});
fetch('./analyst-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{
 if(!c.endpoint)return;
 const url=new URL(c.endpoint);if(url.protocol!=='https:')throw Error();
 config={endpoint:url.href,requiresAccessCode:c.requiresAccessCode!==false};
 el('analystConnection').textContent='AI ANALYST';el('analystAccess').hidden=!config.requiresAccessCode;el('analystStatus').textContent=imageData?'Ready to analyze.':'Choose a bet-slip image.';ready();
}).catch(()=>{el('analystStatus').textContent='AI connection unavailable. Image preview still works.';});
})();

