'use strict';
const $ = id => document.getElementById(id);
const safeRead = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
const safeWrite = (key,value) => {try {localStorage.setItem(key,JSON.stringify(value));}catch{}};
let saved = safeRead('eed-saved',[]), recent = safeRead('eed-recent',[]);
if (!Array.isArray(saved)) saved=[];
if (!Array.isArray(recent)) recent=[];
let currentWord='', audioUrl='', requestNumber=0, controller, clockTimer, stageTimer, gravityFrame, bodies=[], originals=[];
const normalize = text => text.trim().replace(/\s+/g,' ').toLowerCase();
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function button(text,action,cls='chip'){const el=node('button',text,cls);el.type='button';el.addEventListener('click',action);return el;}
function chips(){
  $('savedCount').textContent=saved.length;
  $('recent').replaceChildren(...recent.slice(0,6).map(w=>button(w,()=>search(w))));
  $('recentEmpty').hidden=recent.length>0;
  $('savedList').replaceChildren();
  if(!saved.length)$('savedList').append(node('p','No saved words yet. Save a word with the bookmark button.','special-note'));
  for(const word of saved){const row=node('div',undefined,'saved-row');row.append(button(word,()=>search(word),'plain'),button('Remove',()=>{saved=saved.filter(w=>w!==word);safeWrite('eed-saved',saved);chips();updateSave();},'plain'));$('savedList').append(row);}
}
function updateSave(){const el=$('saveWord');if(!el)return;const active=saved.includes(currentWord);el.classList.toggle('active',active);el.textContent=active?'▣':'▢';el.setAttribute('aria-label',active?'Remove saved word':'Save word');el.setAttribute('aria-pressed',String(active));}
function remember(word){recent=[word,...recent.filter(w=>w!==word)].slice(0,6);safeWrite('eed-recent',recent);chips();}
function speak(text,lang='en-US'){if(!('speechSynthesis' in window)){$('status').textContent='Speech is not available in this browser.';return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.88;const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith(lang.slice(0,2)));if(voice)u.voice=voice;speechSynthesis.speak(u);}
function pronounce(){if(audioUrl){const audio=new Audio(audioUrl);audio.play().catch(()=>speak(currentWord));}else speak(currentWord);}
function render(entries,provider){
  const root=$('entry');root.replaceChildren();
  const entry=entries[0]; currentWord=entry.word;
  audioUrl=(entries.flatMap(e=>e.phonetics||[]).find(p=>p.audio?.startsWith('https://')||p.audio?.startsWith('//'))?.audio||'').replace(/^\/\//,'https://');
  const top=node('div',undefined,'entry-top');const title=node('div');title.append(node('span','THE WORD, EXPLAINED','entry-label'),node('h2',currentWord));
  const controls=node('div',undefined,'entry-tools');const play=button('▷',pronounce,'round');play.setAttribute('aria-label','Pronounce '+currentWord);const save=button('▢',()=>{saved=saved.includes(currentWord)?saved.filter(w=>w!==currentWord):[currentWord,...saved].slice(0,100);safeWrite('eed-saved',saved);chips();updateSave();},'round');save.id='saveWord';controls.append(play,save);top.append(title,controls);root.append(top);
  const phonetic=entry.phonetic || entry.phonetics?.find(p=>p.text)?.text;
  if(phonetic)root.append(node('p',phonetic,'pronunciation'));
  for(const item of entries){for(const meaning of item.meanings||[]){const section=node('section',undefined,'meaning');section.append(node('h3',meaning.partOfSpeech||'definition','part'));
    (meaning.definitions||[]).slice(0,8).forEach((def,i)=>{const row=node('div',undefined,'definition'), content=node('div');content.append(node('p',def.definition));if(def.example)content.append(node('p','“'+def.example+'”','example'));row.append(node('span',String(i+1).padStart(2,'0'),'number'),content);section.append(row);});
    const synonyms=[...new Set([...(meaning.synonyms||[]),...(meaning.definitions||[]).flatMap(d=>d.synonyms||[])])].slice(0,8);
    if(synonyms.length){const related=node('div',undefined,'related');related.append(node('span','Related words'));synonyms.forEach(w=>related.append(button(w,()=>search(w))));section.append(related);}root.append(section);
  }}
  const source=node('div',undefined,'source');source.append(node('span',provider+' · '));
  const sources=[...new Set(entries.flatMap(e=>e.sourceUrls||[]))];for(const url of sources.slice(0,3)){if(!/^https:\/\//.test(url))continue;const a=node('a','Source ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';source.append(a);}
  for(const license of entries.map(e=>e.license).filter(Boolean).slice(0,1)){if(/^https:\/\//.test(license.url||'')){const a=node('a',license.name||'License');a.href=license.url;a.target='_blank';a.rel='noopener noreferrer';source.append(a);}}
  root.append(source);updateSave();
}
function special(title,value,note){$('entry').replaceChildren(node('span','AN UNEXPECTED DEFINITION','secret-tag'),node('h2',title),node('p',value,'special-value'),node('p',note,'special-note'));}
function clearEffects(){clearInterval(clockTimer);clearTimeout(stageTimer);$('surpriseStage').hidden=true;if('speechSynthesis' in window)speechSynthesis.cancel();}
async function search(raw){
  const word=raw.trim();if(!word)return;
  resetGravity();clearEffects();controller?.abort();controller=new AbortController();const number=++requestNumber;
  $('query').value=word;$('status').textContent='';$('searchButton').removeAttribute('aria-busy');$('searchHint').textContent='Follow your curiosity.';
  const key=normalize(word);
  if(key==='time'){special('time','','The present moment, wherever you happen to be.');const tick=()=>{const now=new Date();$('entry').querySelector('.special-value').textContent=now.toLocaleTimeString('en-US');$('entry').querySelector('.special-note').textContent=now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})+' · '+Intl.DateTimeFormat().resolvedOptions().timeZone;};tick();clockTimer=setInterval(tick,1000);return;}
  if(key==='the creator of this website'){special('the creator of this website','Lucas Li','The person behind this little corner of the internet.');return;}
  if(key==='gravity'){special('gravity','What goes up…','Apparently, dictionaries are not exempt. Drag the pieces around, or put everything back.');startGravity();return;}
  if(key==='mario'){special('Mario','Mamma mia!','Some definitions are better explained in motion.');mario();return;}
  if(key==='place'){special('place','Looking around…','Only your public connection address. Nothing is saved.');try{const response=await fetch('/api/place',{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(number!==requestNumber)return;$('entry').querySelector('.special-value').textContent=data.ip;$('entry').querySelector('.special-note').textContent='Your public IP address. A VPN or proxy may show its exit address. This is not your physical location.';}catch(error){if(error.name!=='AbortError'&&number===requestNumber)$('entry').querySelector('.special-value').textContent='Address unavailable';}return;}
  $('status').textContent='Looking up your word…';$('searchButton').setAttribute('aria-busy','true');
  const timeout=setTimeout(()=>controller.abort(),19000);
  try{
    const response=await fetch('/api/dictionary?word='+encodeURIComponent(word),{signal:controller.signal});const data=await response.json();if(number!==requestNumber)return;
    if(!response.ok||!Array.isArray(data.entries)||!data.entries.length)throw Error(data.error||'No entry found.');
    render(data.entries,data.provider||'Dictionary');remember(data.entries[0].word);$('status').textContent='';
  }catch(error){if(number!==requestNumber)return;$('entry').replaceChildren(node('span','KEEP EXPLORING','entry-label'),node('h2',word),node('p',error.name==='AbortError'?'The lookup took too long. Please try again.':error.message,'special-note'));$('status').textContent='';}
  finally{clearTimeout(timeout);if(number===requestNumber)$('searchButton').removeAttribute('aria-busy');}
}
function mario(){
  const stage=$('surpriseStage');stage.replaceChildren();const scene=node('div',undefined,'mario-scene');
  // An original pixel illustration. No remote images or audio files are loaded.
  scene.innerHTML='<svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mario jumping" shape-rendering="crispEdges"><path fill="#d83b33" d="M5 1h6v1H4v2h10V3h-2V2H5zM4 10h3v2h4v-2h2v2h2v3H2v-3h2z"/><path fill="#f5ba80" d="M5 4h7v1h2v4h-3v1H6V9H4V6h1zM0 11h3v3H0zM13 11h3v3h-3z"/><path fill="#643b2c" d="M4 4h4v1H6v3H4zM5 8h3v1H5zM10 5h1v2h-1zM9 8h5v1H9z"/><path fill="#2770bb" d="M5 10h2v3h3v-3h2v6h-1v2H8v-2H5v2H2v-3h3z"/><path fill="#ffe59a" d="M6 13h1v1H6zM10 13h1v1h-1z"/><path fill="#55392a" d="M1 18h4v2H0v-1h1zM9 18h4v2H8v-1h1z"/></svg>';
  scene.append(node('h2','Mamma mia!'));stage.append(scene);stage.hidden=false;speak('Mamma mia!','it-IT');
  try{const context=new(window.AudioContext||window.webkitAudioContext)();[523.25,659.25,783.99,1046.5].forEach((frequency,i)=>{const o=context.createOscillator(),g=context.createGain();o.type='square';o.frequency.value=frequency;g.gain.setValueAtTime(.025,context.currentTime+i*.12);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+i*.12+.1);o.connect(g);g.connect(context.destination);o.start(context.currentTime+i*.12);o.stop(context.currentTime+i*.12+.12);});setTimeout(()=>context.close(),1000);}catch{}
  stageTimer=setTimeout(()=>{stage.hidden=true;},6000);
}
function startGravity(){
  const els=[...document.querySelectorAll('[data-fall]')].filter(el=>!el.hidden&&el.getBoundingClientRect().height>0);
  const rects=els.map(el=>el.getBoundingClientRect());originals=els.map(el=>({el,style:el.getAttribute('style')}));
  document.body.classList.add('gravity-on');$('resetGravity').hidden=false;
  bodies=els.map((el,i)=>{const r=rects[i],w=Math.min(r.width,innerWidth-12),h=Math.min(r.height,innerHeight*.7);el.classList.add('falling');el.style.cssText+=';left:0;top:0;width:'+w+'px;height:'+h+'px;margin:0;';return{el,x:Math.min(Math.max(0,r.left),innerWidth-w),y:Math.max(-h,r.top),w,h,vx:(Math.random()-.5)*150,vy:-Math.random()*100,angle:0,spin:(Math.random()-.5)*30,drag:false};});
  let last=performance.now();const frame=now=>{const dt=Math.min((now-last)/1000,.025);last=now;for(const b of bodies){if(b.drag)continue;b.vy+=800*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.spin*dt;const floor=innerHeight-b.h-5;if(b.y>floor){b.y=floor;b.vy=-Math.abs(b.vy)*.48;b.vx*=.985;b.spin*=.95;if(Math.abs(b.vy)<20)b.vy=0;}if(b.x<0){b.x=0;b.vx=Math.abs(b.vx)*.8;}if(b.x+b.w>innerWidth){b.x=innerWidth-b.w;b.vx=-Math.abs(b.vx)*.8;}b.el.style.transform='translate('+b.x+'px,'+b.y+'px) rotate('+b.angle+'deg)';}gravityFrame=requestAnimationFrame(frame);};gravityFrame=requestAnimationFrame(frame);
  for(const b of bodies){b.el.onpointerdown=e=>{if(e.target.closest('button,input,a'))return;b.drag=true;b.dx=e.clientX-b.x;b.dy=e.clientY-b.y;b.el.setPointerCapture(e.pointerId);b.el.classList.add('dragging');};b.el.onpointermove=e=>{if(!b.drag)return;b.x=e.clientX-b.dx;b.y=e.clientY-b.dy;b.vx=0;b.vy=0;b.el.style.transform='translate('+b.x+'px,'+b.y+'px) rotate('+b.angle+'deg)';};b.el.onpointerup=b.el.onpointercancel=()=>{b.drag=false;b.el.classList.remove('dragging');};}
}
function resetGravity(){cancelAnimationFrame(gravityFrame);for(const{el,style}of originals){el.classList.remove('falling','dragging');if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);el.onpointerdown=el.onpointermove=el.onpointerup=el.onpointercancel=null;}originals=[];bodies=[];document.body.classList.remove('gravity-on');$('resetGravity').hidden=true;}
$('resetGravity').addEventListener('click',resetGravity);window.addEventListener('resize',resetGravity);
$('searchForm').addEventListener('submit',event=>{event.preventDefault();search($('query').value);});
document.querySelectorAll('[data-word]').forEach(el=>el.addEventListener('click',()=>search(el.dataset.word)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){resetGravity();clearEffects();}if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('about').open){event.preventDefault();$('query').focus();}});
$('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');safeWrite('eed-dark',document.body.classList.contains('dark'));});
if(safeRead('eed-dark',false))document.body.classList.add('dark');
$('savedToggle').addEventListener('click',()=>{$('savedPanel').hidden=!$('savedPanel').hidden;});$('closeSaved').addEventListener('click',()=>{$('savedPanel').hidden=true;});
$('aboutButton').addEventListener('click',()=>$('about').showModal());document.querySelector('.close-dialog').addEventListener('click',()=>$('about').close());
$('today').textContent=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
render([{word:'curiosity',phonetic:'/ˌkjʊə.riˈɒs.ə.ti/',meanings:[{partOfSpeech:'noun',definitions:[{definition:'A strong desire to know or learn something.',example:'A little curiosity can take you somewhere unexpected.'},{definition:'An unusual or interesting object or fact.'}],synonyms:['inquisitiveness','interest','wonder']}]}],'Editorial welcome entry');chips();
