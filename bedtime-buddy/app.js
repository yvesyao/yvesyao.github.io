import * as THREE from '../potty-buddy/vendor/three.module.js';
import {createStoryWorld} from './scene.js';
import {lesson,outfits,guideMarkup,sourcesMarkup} from './lesson.js';
const $=id=>document.getElementById(id);
const media=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=media.matches,playing=false,autoplay=true,voice=false,current=0,elapsed=0,completed=false,last=0,pet=0;
let renderer,world,resumeAfterDialog=false;
const stopSpeech=()=>{if('speechSynthesis' in window)speechSynthesis.cancel();};
function speak(){stopSpeech();if(!voice||!('speechSynthesis' in window))return;const utterance=new SpeechSynthesisUtterance(lesson[current].say);utterance.lang='zh-CN';utterance.rate=.78;utterance.pitch=1.08;const preferred=speechSynthesis.getVoices().find(v=>v.lang==='zh-CN');if(preferred)utterance.voice=preferred;speechSynthesis.speak(utterance);}
function update(){
 const item=lesson[current];
 $('stepCount').textContent=`${String(current+1).padStart(2,'0')} / ${lesson.length}`;
 $('stepTitle').textContent=item.title;$('stepHint').textContent=item.hint;$('sceneMessage').firstChild.textContent=item.say;
 $('scene').setAttribute('aria-label',`${item.title}。${item.say} ${item.hint}`);
 document.querySelectorAll('.step').forEach((b,i)=>{b.classList.toggle('active',i===current);if(i===current)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 $('playButton').textContent=playing?'Ⅱ':'▶';$('playButton').setAttribute('aria-label',playing?'暂停动画':completed?'从头播放':'播放动画');
 $('playStatus').textContent=completed?'一起说晚安':playing?'正在演示':reduced?'轻动模式':'准备好就开始';
 $('timeLabel').textContent=`第 ${current+1} 步，共 ${lesson.length} 步`;
 $('nextButton').disabled=current===lesson.length-1;
 $('motionButton').textContent=reduced?'轻动：开':'轻动模式';$('motionButton').setAttribute('aria-pressed',String(reduced));
 $('stepSummary').textContent=`${item.title}。${item.hint}`;
}
function selectStep(i){current=Math.max(0,Math.min(lesson.length-1,i));elapsed=0;completed=false;playing=!reduced&&!!renderer;stopSpeech();update();if(playing)speak();}
lesson.forEach((s,i)=>{const b=document.createElement('button');b.className='step';b.innerHTML=`<span class="step-number">${String(i+1).padStart(2,'0')}</span><span>${s.label}</span><span class="arrow">↗</span>`;b.onclick=()=>selectStep(i);$('steps').append(b);});
outfits.forEach((o,i)=>{const b=document.createElement('button');b.className='outfit';b.style.background=`#${o.shirt.toString(16)}`;b.setAttribute('aria-label',`换上${o.name}睡衣`);b.setAttribute('aria-pressed',String(i===0));b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4-5 4 3 4 2-2v10h10V10l2 2 3-4-5-4q-5 5-10 0Z"/></svg>';b.onclick=()=>{world?.setOutfit(o);document.querySelectorAll('.outfit').forEach((x,j)=>x.setAttribute('aria-pressed',String(i===j)));};$('outfits').append(b);});
$('playButton').onclick=()=>{if(completed){current=0;elapsed=0;completed=false;}else if(elapsed>=lesson[current].duration)elapsed=0;playing=!playing;if(playing)speak();else stopSpeech();update();};
$('replayButton').onclick=()=>{elapsed=0;completed=false;playing=!!renderer;speak();update();};
$('nextButton').onclick=()=>selectStep(current+1);
$('autoplay').onchange=e=>autoplay=e.target.checked;
$('seek').oninput=e=>{elapsed=lesson[current].duration*Number(e.target.value)/100;playing=false;completed=false;stopSpeech();update();};
function setMotion(value){reduced=value;playing=false;stopSpeech();update();}
$('motionButton').onclick=()=>setMotion(!reduced);media.addEventListener('change',e=>setMotion(e.matches));
$('voiceButton').onclick=()=>{voice=!voice;$('voiceButton').textContent=`朗读：${voice?'开':'关'}`;$('voiceButton').setAttribute('aria-pressed',String(voice));if(voice)speak();else stopSpeech();};
if(!('speechSynthesis' in window)){$('voiceButton').disabled=true;$('voiceButton').textContent='设备不支持朗读';}
$('petButton').onclick=()=>{pet=2;$('sceneMessage').firstChild.textContent='布丁也在这里，陪你慢慢来。';};
function showDialog(html){resumeAfterDialog=playing;playing=false;stopSpeech();update();$('dialogContent').innerHTML=html;$('guideDialog').showModal();}
$('guideButton').onclick=()=>showDialog(guideMarkup);
$('detailButton').onclick=()=>showDialog(`<h2>${lesson[current].title}</h2><p class="dialog-note">${lesson[current].parent}</p><p>只练习这一小步也可以；动画不设置达标期限。</p>`);
$('sourcesButton').onclick=()=>showDialog(`<h2>这课的科学依据</h2>${sourcesMarkup}`);
$('closeDialog').onclick=()=>$('guideDialog').close();
$('guideDialog').addEventListener('close',()=>{playing=resumeAfterDialog&&!document.hidden;last=performance.now();update();});
$('printButton').onclick=()=>{playing=false;stopSpeech();update();window.print();};
window.addEventListener('beforeprint',()=>{playing=false;stopSpeech();update();});
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){playing=false;resumeAfterDialog=false;stopSpeech();update();}});
function frame(now){const delta=Math.min((now-(last||now))/1000,.05);last=now;
 if(playing&&!document.hidden&&!$('guideDialog').open){elapsed+=delta;pet=Math.max(0,pet-delta);
 if(elapsed>=lesson[current].duration){elapsed=lesson[current].duration;if(autoplay&&current<lesson.length-1){current++;elapsed=0;update();speak();}else{playing=false;completed=current===lesson.length-1;stopSpeech();update();}}}
 const progress=elapsed/lesson[current].duration;
 world.pose(current,progress,reduced,pet);$('progressFill').style.transform=`scaleX(${progress})`;$('seek').value=String(Math.round(progress*100));renderer.render(world.scene,world.camera);
}
try{
 world=createStoryWorld();renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 $('scene').append(renderer.domElement);
 new ResizeObserver(()=>{const {width,height}=$('scene').getBoundingClientRect();renderer.setSize(width,height);world.resize(width,height);}).observe($('scene'));
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();playing=false;resumeAfterDialog=false;stopSpeech();$('renderError').hidden=false;$('playButton').disabled=$('replayButton').disabled=true;update();});
 renderer.setAnimationLoop(frame);
}catch(error){console.error('Bedtime scene could not start:',error);$('renderError').hidden=false;$('playButton').disabled=$('replayButton').disabled=true;playing=false;}
update();
