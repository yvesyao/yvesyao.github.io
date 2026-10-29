import * as THREE from './vendor/three.module.js';
import {lesson, outfits} from './lesson.js';

const $ = id => document.getElementById(id);
const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
const smooth = t => {t=clamp(t);return t*t*(3-2*t);};
const mix = (a,b,t) => a+(b-a)*t;
const ramp = (t,a,b) => smooth((t-a)/(b-a));
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionQuery.matches;
let current=0, elapsed=0, playing=!reduced, auto=true, voice=false, idle=0, waveUntil=0;
let completed=false, dialogWasPlaying=false;
let scene, camera, renderer, child, dog, potty, basin, character, dogParts, signal, water, bubbles, tissue, pullArrows;
let shirtMat, pantsMat, shoesMat, lastTick=0;
const steps=$('steps');
lesson.forEach((s,i)=>{const b=document.createElement('button');b.className='step';b.innerHTML=`<span class="step-number">${String(i+1).padStart(2,'0')}</span><span>${s.label}</span><span class="arrow">↗</span>`;b.addEventListener('click',()=>selectStep(i));steps.append(b);});
outfits.forEach((o,i)=>{const b=document.createElement('button');b.className='outfit';b.style.background=`#${o.shirt.toString(16)}`;b.setAttribute('aria-label',`换上${o.name}衣服`);b.title=o.name;b.setAttribute('aria-pressed',String(i===0));b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4-5 4 3 4 2-2v10h10V10l2 2 3-4-5-4q-5 5-10 0Z"/></svg>';b.onclick=()=>{if(shirtMat){shirtMat.color.setHex(o.shirt);pantsMat.color.setHex(o.pants);shoesMat.color.setHex(o.shoe);}document.querySelectorAll('.outfit').forEach((el,j)=>el.setAttribute('aria-pressed',String(j===i)));};$('outfits').append(b);});

function speak(){if(!voice||!('speechSynthesis' in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(lesson[current].say);u.lang='zh-CN';u.rate=.78;u.pitch=1.12;const voices=speechSynthesis.getVoices();const zh=voices.find(v=>v.lang==='zh-CN')||voices.find(v=>v.lang.startsWith('zh'));if(zh)u.voice=zh;speechSynthesis.speak(u);}
function stopSpeech(){if('speechSynthesis' in window)speechSynthesis.cancel();}
function selectStep(i){current=clamp(i,0,7);elapsed=0;completed=false;playing=!reduced;stopSpeech();updateUI();if(playing)speak();}
function updateUI(){const s=lesson[current];$('stepCount').textContent=`${String(current+1).padStart(2,'0')} / 08`;$('stepTitle').textContent=s.title;$('stepHint').textContent=s.hint;$('scene').setAttribute('aria-label',`${s.title}。${s.say} ${s.hint}`);document.querySelectorAll('.step').forEach((b,i)=>{b.classList.toggle('active',i===current);b.classList.toggle('completed',i<current);if(i===current)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});$('playButton').textContent=playing?'Ⅱ':'▶';$('playButton').setAttribute('aria-label',playing?'暂停动画':completed?'从头播放':'播放动画');$('playStatus').textContent=completed?'这一课学完啦':playing?'正在演示':reduced?'轻动模式':'已暂停';$('timeLabel').textContent=`第 ${current+1} 步，共 8 步`;$('nextButton').disabled=current===7;$('motionButton').setAttribute('aria-pressed',String(reduced));$('motionButton').textContent=reduced?'轻动：开':'轻动模式';}
$('playButton').onclick=()=>{if(completed){current=0;elapsed=0;completed=false;}else if(elapsed>=lesson[current].duration)elapsed=0;playing=!playing;if(playing)speak();else stopSpeech();updateUI();};
$('replayButton').onclick=()=>{elapsed=0;completed=false;playing=true;updateUI();speak();};
$('nextButton').onclick=()=>selectStep(current+1);
$('autoplay').onchange=e=>auto=e.target.checked;
$('seek').oninput=e=>{elapsed=lesson[current].duration*Number(e.target.value)/100;playing=false;completed=false;stopSpeech();updateUI();};
$('voiceButton').onclick=()=>{voice=!voice;$('voiceButton').textContent=`朗读：${voice?'开':'关'}`;$('voiceButton').setAttribute('aria-pressed',String(voice));if(voice)speak();else stopSpeech();};
if(!('speechSynthesis' in window)){$('voiceButton').disabled=true;$('voiceButton').textContent='设备不支持朗读';}
function setReduced(value){reduced=value;playing=false;stopSpeech();updateUI();}
$('motionButton').onclick=()=>setReduced(!reduced);
motionQuery.addEventListener('change',e=>setReduced(e.matches));
$('petButton').onclick=()=>{if(!playing||reduced){$('sceneMessage').firstChild.textContent='布丁说：慢慢来，我陪你。';return;}waveUntil=idle+2;};
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden){stopSpeech();if(playing){playing=false;updateUI();}}});
const sourceMarkup=`<h3>专业内容依据</h3><ul><li><a href="https://eric.org.uk/potty-training/" target="_blank" rel="noopener">ERIC · Potty training</a>：把如厕看作逐步学习的技能，适合做课程框架。</li><li><a href="https://www.nhs.uk/best-start-in-life/toddler/potty-training-your-child/" target="_blank" rel="noopener">NHS · Potty training your child</a>：准备、衣物、如厕习惯和家长配合。</li><li><a href="https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/the-right-age-to-toilet-train.aspx" target="_blank" rel="noopener">AAP / HealthyChildren · The Right Age to Potty Train</a>：身体信号、动作能力、积极引导。</li><li><a href="https://www.cdc.gov/clean-hands/about/index.html" target="_blank" rel="noopener">CDC · About Handwashing</a>：湿手、肥皂、搓洗至少 20 秒、冲净与擦干。</li></ul><h3>值得阅读的经典绘本</h3><ul><li><a href="https://www.candlewick.com/9780763644765/potty/" target="_blank" rel="noopener">Potty · Leslie Patricelli</a>（2010）：适合参考短句、清楚动作和幼儿视角。</li><li><a href="https://www.chroniclebooks.com/products/everyone-poops-hc" target="_blank" rel="noopener">Everyone Poops · 五味太郎</a>（初版 1977）：把排便讲成自然的身体活动，适合作为认知开场。</li></ul><p>以上是内容和表达的参考来源，不代表机构审核或背书。角色、造型与脚本为本演示原创，没有使用书中原画或复制原文。</p>`;
function showDialog(html){dialogWasPlaying=playing;playing=false;stopSpeech();updateUI();$('dialogContent').innerHTML=html;$('guideDialog').showModal();}
$('guideButton').onclick=()=>showDialog(`<h2>陪孩子练习，不着急考试。</h2><p>这是一段由成人陪同观看的原创教学演示，初步面向约 2–4 岁幼儿。它帮助认识步骤，实际掌握仍需要生活中的陪伴练习。</p><div class="dialog-note"><b>先记住三件事</b><p>① 不要求孩子看完就会，也不要求按动画时长排出。<br>② 没来得及、暂时没感觉，都可以温和处理。<br>③ 疼痛、硬便、持续憋便时，先寻求儿科专业帮助。</p></div><h3>白天与夜晚分开看</h3><p>白天练习如厕与夜间保持干燥是不同进程，不必同步撤掉午睡和夜间尿布。</p><h3>关于开始时间</h3><p>AAP 强调发育能力和准备信号；英国 NHS / ERIC 更强调逐步培养技能，不必等到孩子主动提出。这个演示不设置统一达标年龄，也不把“已经能报告尿意”当作学习的门槛。</p>${sourceMarkup}`);
$('detailButton').onclick=()=>showDialog(`<h2>${lesson[current].title}</h2><p class="dialog-note">${lesson[current].parent}</p><p>孩子可以只看这一小步，也可以暂停后在成人帮助下练习。不会或不愿意时，下次再试。</p>`);
$('sourcesButton').onclick=()=>showDialog(`<h2>教材与绘本清单</h2>${sourceMarkup}`);
$('closeDialog').onclick=()=>$('guideDialog').close();
$('guideDialog').addEventListener('close',()=>{playing=dialogWasPlaying;lastTick=performance.now();updateUI();});

function mat(color,roughness=.7){return new THREE.MeshStandardMaterial({color,roughness});}
function mesh(geo,material,parent,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const sphere=new THREE.SphereGeometry(1,36,24);
function ball(parent,material,pos,scale){return mesh(sphere,material,parent,pos,scale);}
function box(parent,material,pos,scale,r=.12){const g=new THREE.BoxGeometry(1,1,1);return mesh(g,material,parent,pos,scale);}
function cylinder(parent,material,a,b,r1=.07,r2=r1){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const length=start.distanceTo(end);const m=mesh(new THREE.CylinderGeometry(r1,r2,length,16),material,parent,start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;}
function tube(parent,material,points,r=.02){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(c,24,r,8,false),material,parent);}
function shadowPlane(parent,x,z,sx,sz,opacity=.12){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');const g=ctx.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,`rgba(90,55,30,${opacity})`);g.addColorStop(1,'rgba(90,55,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const m=mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}),parent,[x,.015,z]);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}

function buildChild(){child=new THREE.Group();scene.add(child);const skin=mat(0xf3bc94),hair=mat(0x584035),dark=mat(0x392c26),cream=mat(0xfff5d9),cheek=mat(0xf09788);shirtMat=mat(outfits[0].shirt);pantsMat=mat(outfits[0].pants);shoesMat=mat(outfits[0].shoe);
  const torso=new THREE.Group();child.add(torso);ball(torso,shirtMat,[0,1.20,0],[.39,.37,.29]);ball(torso,shirtMat,[0,.91,.0],[.39,.12,.29]);ball(torso,skin,[0,1.54,0],[.16,.19,.17]);
  const emblem=ball(torso,cream,[0,1.18,.288],[.13,.13,.017]);ball(emblem,mat(0xe9a84f),[0,0,.7],[.53,.53,.3]);
  const head=new THREE.Group();head.position.y=2.02;torso.add(head);ball(head,skin,[0,0,0],[.64,.63,.54]);ball(head,skin,[-.62,-.025,0],[.13,.18,.12]);ball(head,skin,[.62,-.025,0],[.13,.18,.12]);
  const cap=mesh(new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,1.3),hair,head,[0,.04,-.05],[.66,.62,.56]);
  [[-.37,.36,.32,.26,.16,.22],[-.10,.46,.43,.24,.15,.19],[.13,.49,.41,.24,.14,.20],[.39,.37,.31,.20,.23,.20]].forEach(p=>ball(head,hair,p.slice(0,3),p.slice(3)));
  const eyes=[];for(const side of [-1,1]){ball(head,cheek,[side*.38,-.14,.425],[.11,.065,.025]);const e=ball(head,dark,[side*.22,.025,.503],[.048,.069,.025]);eyes.push(e);ball(head,cream,[side*.22-.012,.046,.527],[.013,.017,.008]);tube(head,hair,[[side*.15,.16,.509],[side*.23,.18,.5],[side*.29,.16,.478]],.016);}
  ball(head,skin,[0,-.08,.55],[.065,.058,.06]);tube(head,dark,[[-.083,-.22,.498],[0,-.245,.52],[.083,-.22,.498]],.018);
  const hips=ball(child,skin,[0,.82,-.01],[.32,.15,.24]);
  const legs=[];for(const side of [-1,1]){
    const upper=mesh(new THREE.CylinderGeometry(.12,.12,1,20),skin,child);
    const lower=mesh(new THREE.CylinderGeometry(.105,.12,1,20),skin,child);
    const knee=ball(child,skin,[0,0,0],[.12,.12,.12]);
    const hip=ball(child,skin,[0,0,0],[.125,.125,.125]);
    const foot=new THREE.Group();child.add(foot);ball(foot,shoesMat,[0,-.02,.075],[.15,.105,.22]);ball(foot,cream,[0,-.07,.075],[.15,.045,.22]);
    legs.push({upper,lower,knee,hip,foot,side});
  }
  const trousers=buildGarment(pantsMat,cream,.164,false);
  const under=buildGarment(mat(0xfff7eb),cream,.143,true);
  const hands=[],arms=[];for(const side of [-1,1]){const sleeve=ball(torso,shirtMat,[side*.39,1.32,.0],[.18,.20,.19]);const upper=mesh(new THREE.CylinderGeometry(.105,.11,1,16),skin,torso);const lower=mesh(new THREE.CylinderGeometry(.09,.105,1,16),skin,torso);const hand=ball(torso,skin,[side*.5,.85,.12],[.115,.13,.12]);hands.push(hand);arms.push({upper,lower,side,sleeve});}
  const bodyPivot=new THREE.Group();child.add(bodyPivot);bodyPivot.position.y=.83;bodyPivot.add(torso);torso.position.y=-.83;
  pullArrows=new THREE.Group();child.add(pullArrows);const arrowMat=mat(0xeeb537);for(const side of [-1,1]){cylinder(pullArrows,arrowMat,[side*.61,.84,.42],[side*.61,.46,.42],.023);const tip=mesh(new THREE.ConeGeometry(.075,.13,3),arrowMat,pullArrows,[side*.61,.41,.42]);tip.rotation.z=Math.PI;tip.rotation.y=.2;}pullArrows.visible=false;
  character={torso,bodyPivot,head,eyes,hands,arms,legs,trousers,under,hips};
}
function positionBone(m,a,b){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);m.position.copy(va).add(vb).multiplyScalar(.5);m.scale.y=va.distanceTo(vb);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());}
function solveJoint(start,end,upper,lower,pole){
  const delta=end.clone().sub(start),distance=clamp(delta.length(),.02,upper+lower-.0001),direction=delta.normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  const height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
  return start.clone().addScaledVector(direction,along).addScaledVector(bend,height);
}
function buildGarment(material,edge,radius,short){
  const group=new THREE.Group();child.add(group);
  const waist=mesh(new THREE.TorusGeometry(.29,.027,12,64),edge,group);waist.rotation.x=Math.PI/2;
  const bridge=ball(group,material,[0,0,0],[.33,.10,.23]);
  const legs=[-1,1].map(()=>({upper:mesh(new THREE.CylinderGeometry(radius,radius,1,24),material,group),lower:mesh(new THREE.CylinderGeometry(radius,radius,1,24),material,group),knee:ball(group,material,[0,0,0],[radius,radius,radius])}));
  return {group,waist,bridge,legs,radius,short,grips:[]};
}
function pointOnLeg(points,fraction){const split=.36/.75;if(fraction<=split)return points[0].clone().lerp(points[1],fraction/split);return points[1].clone().lerp(points[2],(fraction-split)/(1-split));}
function dressLegs(garment,paths,drop){
  const split=.36/.75,start=drop*.89,end=garment.short?Math.min(1,start+.24):1;
  const tops=[];
  paths.forEach((points,i)=>{
    const part=garment.legs[i],top=pointOnLeg(points,start);tops.push(top);
    part.upper.visible=start<split&&end>0;
    if(part.upper.visible)positionBone(part.upper,top.toArray(),pointOnLeg(points,Math.min(split,end)).toArray());
    part.lower.visible=end>split;
    if(part.lower.visible)positionBone(part.lower,pointOnLeg(points,Math.max(split,start)).toArray(),pointOnLeg(points,end).toArray());
    part.knee.visible=start<split&&end>split;part.knee.position.copy(points[1]);
  });
  const center=tops[0].clone().add(tops[1]).multiplyScalar(.5);
  garment.waist.position.copy(center).add(new THREE.Vector3(0,.025,.015));garment.waist.scale.set((Math.abs(tops[1].x-tops[0].x)*.5+garment.radius)/.29,(garment.radius+.045)/.29,1);
  garment.bridge.position.copy(center).add(new THREE.Vector3(0,-.035,0));garment.bridge.scale.set(Math.abs(tops[1].x-tops[0].x)*.5+garment.radius,.075*(1-drop)+.035,garment.radius+.015);
  garment.grips=tops.map((v,i)=>v.clone().add(new THREE.Vector3((i===0?-1:1)*.09,.035,.14)).toArray());
}
function arm(i,hand){
  // A two-bone solve keeps upper arm and forearm lengths fixed in every pose.
  const {side,upper,lower}=character.arms[i],c=character;
  const toChild=new THREE.Matrix4().multiplyMatrices(c.bodyPivot.matrix,c.torso.matrix);
  const toTorso=toChild.clone().invert();
  const shoulder=new THREE.Vector3(side*.40,1.32,.01).applyMatrix4(toChild);
  const desired=new THREE.Vector3(...hand),direction=desired.clone().sub(shoulder);
  const distance=clamp(direction.length(),.10,.635);direction.normalize();
  const end=shoulder.clone().addScaledVector(direction,distance);
  const upperLength=.33,lowerLength=.31;
  const along=(upperLength**2-lowerLength**2+distance**2)/(2*distance);
  const bend=Math.sqrt(Math.max(0,upperLength**2-along**2));
  const pole=new THREE.Vector3(side*.9,-.15,.45);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
  const a=shoulder.applyMatrix4(toTorso),b=elbow.applyMatrix4(toTorso),h=end.applyMatrix4(toTorso);
  positionBone(upper,a.toArray(),b.toArray());positionBone(lower,b.toArray(),h.toArray());c.hands[i].position.copy(h);
}

function buildPotty(parent){
  // Original mesh referencing the one-piece silhouette of IKEA LILLA.
  // The seat is an actual open bowl, not stacked closed ellipsoids.
  const teal=mat(0x65b7b3,.38),inner=mat(0x3d9999,.42),base=mat(0x6b8f89,.65);
  const rings=[
    [.56,.65,()=>.035],[.55,.64,()=>.075],
    [.49,.59,h=>h-.06],[.48,.58,h=>h],
    [.44,.53,h=>h+.008],[.32,.40,(_,v)=>.49+.08*Math.max(v,0)**6],
    [.28,.35,()=>.31],[.20,.25,()=>.17],[.008,.01,()=>.16]
  ];
  const verts=[],indices=[],segments=128;
  rings.forEach(([rx,rz,height],j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,v=Math.cos(a);const h=.49+.36*Math.max(-v,0)**4+.12*Math.max(v,0)**6;verts.push(Math.sin(a)*rx,height(h,v),v*rz);if(j&&i){const k=j*(segments+1)+i;indices.push(k,k-1,k-segments-1,k-1,k-segments-2,k-segments-1);}}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();teal.side=THREE.DoubleSide;mesh(g,teal,parent);
  const rimPoints=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;rimPoints.push([Math.sin(a)*.555,.035,Math.cos(a)*.65]);}tube(parent,base,rimPoints,.023);
  // Front carry recess is readable from the teaching camera.
  ball(parent,inner,[0,.255,.605],[.17,.075,.012]);
  const lip=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;lip.push([Math.sin(a)*.174,.255+Math.cos(a)*.078,.608]);}tube(parent,teal,lip,.012);
}

function buildDog(){dog=new THREE.Group();scene.add(dog);dog.position.set(1.55,0,.44);dog.rotation.y=-.22;const tan=mat(0xdca059),white=mat(0xfff1d8),brown=mat(0x4e362a),pink=mat(0xeaa392);ball(dog,tan,[0,.42,0],[.40,.32,.65]);ball(dog,white,[0,.48,.39],[.31,.29,.25]);for(const x of [-.25,.25])for(const z of [-.37,.35]){ball(dog,tan,[x,.17,z],[.14,.20,.16]);ball(dog,white,[x,.09,z+.04],[.14,.09,.17]);}const head=new THREE.Group();head.position.set(0,.78,.42);dog.add(head);ball(head,tan,[0,0,0],[.43,.36,.36]);const earGeo=new THREE.ConeGeometry(.22,.52,3);for(const side of [-1,1]){const ear=mesh(earGeo,tan,head,[side*.29,.34,-.055],[1,1,.65]);ear.rotation.z=-side*.22;ear.rotation.y=Math.PI/6;const inset=mesh(earGeo,pink,head,[side*.29,.34,.015],[.65,.65,.45]);inset.rotation.copy(ear.rotation);ball(head,brown,[side*.18,.03,.306],[.041,.055,.028]);ball(head,white,[side*.185-.01,.045,.329],[.012,.015,.006]);}ball(head,white,[0,-.14,.29],[.27,.18,.16]);ball(head,white,[0,.12,.31],[.085,.21,.045]);ball(head,brown,[0,-.075,.44],[.08,.05,.045]);tube(head,brown,[[-.09,-.20,.425],[0,-.22,.445],[.09,-.20,.425]],.014);const tongue=ball(head,pink,[0,-.25,.43],[.047,.07,.02]);const tail=new THREE.Group();tail.position.set(0,.51,-.56);dog.add(tail);ball(tail,tan,[0,.07,-.12],[.12,.13,.24]);ball(tail,white,[0,.09,-.29],[.10,.10,.10]);dogParts={head,tail,tongue};shadowPlane(scene,1.55,.44,1.5,1.7,.17);}

function buildRoom(){const cream=mat(0xf8ecd5),wall=mat(0xf3dfc1),peach=mat(0xe8ba94),white=mat(0xfffae9),wood=mat(0xc99a70),sage=mat(0x9aaf8b),blue=mat(0x8ab7bd);scene.background=new THREE.Color(0xf1e3cc);
  const floor=mesh(new THREE.PlaneGeometry(200,200),mat(0xf1e0c7),scene);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.castShadow=false;
  box(scene,wall,[0,2.5,-2.2],[16,6,.18]);box(scene,cream,[0,.3,-2.03],[16,.6,.15]);box(scene,wood,[0,.62,-1.95],[16,.055,.10]);
  // A softly framed window, deliberately quiet behind the teaching action.
  const windowGroup=new THREE.Group();windowGroup.position.set(-2.5,2.5,-2.05);scene.add(windowGroup);ball(windowGroup,cream,[0,0,.01],[.92,1.05,.05]);ball(windowGroup,mat(0xd0ddce),[0,0,.065],[.77,.9,.035]);box(windowGroup,cream,[0,0,.12],[.055,1.8,.07]);box(windowGroup,cream,[0,-.05,.12],[1.54,.055,.07]);box(windowGroup,wood,[0,-.91,.1],[1.9,.13,.30]);
  const sun=ball(windowGroup,mat(0xf6d58c),[.37,.42,.13],[.18,.18,.015]);
  // Wall picture with a simple, original sunny face.
  const frame=new THREE.Group();frame.position.set(.2,2.6,-2.0);scene.add(frame);box(frame,wood,[0,0,0],[.68,.85,.08]);box(frame,white,[0,0,.06],[.58,.75,.05]);ball(frame,mat(0xe8b85c),[0,.07,.11],[.17,.17,.02]);for(const x of [-.06,.06])ball(frame,mat(0x8f6342),[x,.09,.135],[.014,.022,.01]);tube(frame,wood,[[-.05,.0,.14],[0,-.02,.14],[.05,0,.14]],.009);
  // Small rug: muted scallop-like oval, no visual obstacle on the walking path.
  ball(scene,mat(0xddb79b),[.15,.012,.5],[2.35,.015,1.35]);ball(scene,mat(0xe9c8aa),[.15,.023,.5],[2.20,.012,1.21]);
  potty=new THREE.Group();potty.position.set(.15,0,0);potty.scale.z=.8;scene.add(potty);buildPotty(potty);shadowPlane(scene,.15,.03,1.4,1.3,.18);
  basin=new THREE.Group();basin.position.set(2.80,0,-1.0);scene.add(basin);box(basin,sage,[0,.63,0],[1.05,1.25,.68]);for(const x of [-.45,.45])for(const z of [-.25,.25])cylinder(basin,wood,[x,0,z],[x,.25,z],.06);box(basin,cream,[0,.8,.36],[.85,.74,.04]);ball(basin,wood,[0,.88,.40],[.045,.045,.025]);ball(basin,white,[0,1.30,0],[.66,.13,.43]);ball(basin,blue,[0,1.38,.02],[.43,.025,.28]);tube(basin,mat(0xb4c1b2,.3),[[0,1.38,-.24],[0,1.72,-.24],[0,1.75,.25],[0,1.64,.25]],.04);ball(basin,mat(0xebbb79),[.43,1.45,-.07],[.09,.12,.08]);box(basin,white,[.43,1.58,-.07],[.12,.035,.04]);
  water=cylinder(basin,new THREE.MeshStandardMaterial({color:0xc7e5df,transparent:true,opacity:.65,roughness:.1}),[0,1.61,.25],[0,1.4,.25],.025);water.visible=false;
  // Footstool for supported, supervised handwashing.
  box(scene,wood,[2.8,.12,-.12],[.95,.24,.65]);box(scene,cream,[2.8,.25,-.12],[1,.06,.7]);
  // Folded hand towel and toilet-paper roll: readable props, few distractions.
  const paper=new THREE.Group();paper.position.set(.94,.48,-.45);scene.add(paper);mesh(new THREE.CylinderGeometry(.12,.12,.26,28),white,paper,[0,0,0]);box(paper,white,[.07,-.11,.1],[.12,.18,.025]);
  box(scene,wood,[3.57,1.46,-1.4],[.03,.04,.50]);box(scene,mat(0xf0c293),[3.57,1.22,-1.29],[.04,.43,.32]);
  const pot=new THREE.Group();pot.position.set(-3.2,0,-1.25);scene.add(pot);mesh(new THREE.CylinderGeometry(.26,.20,.4,28),peach,pot,[0,.20,0]);for(const [x,y,z,rz] of [[-.18,.64,0,-.6],[.12,.83,0,.4],[0,1.03,-.06,.05]]){const leaf=ball(pot,sage,[x,y,z],[.13,.34,.05]);leaf.rotation.z=rz;}
  signal=new THREE.Group();scene.add(signal);const ringMat=new THREE.MeshBasicMaterial({color:0xf1b64e,transparent:true,opacity:.4,depthWrite:false});for(let i=0;i<2;i++){const ring=mesh(new THREE.TorusGeometry(.24+i*.15,.018,8,48),ringMat.clone(),signal);ring.castShadow=false;}
  bubbles=new THREE.Group();scene.add(bubbles);for(let i=0;i<8;i++){const b=ball(bubbles,new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.7,roughness:.3}),[0,0,0],[.045,.045,.045]);}
  tissue=box(child,white,[.6,1.05,.24],[.22,.17,.015]);tissue.visible=false;
}

function setup(){scene=new THREE.Scene();const el=$('scene');renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;el.append(renderer.domElement);camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,100);camera.position.set(4.2,3.8,9);camera.lookAt(.25,1.05,0);scene.add(new THREE.HemisphereLight(0xfffbef,0xd0b395,1.8));const sun=new THREE.DirectionalLight(0xfff5da,2.6);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);const fill=new THREE.DirectionalLight(0xe9f5ee,.9);fill.position.set(5,3,1);scene.add(fill);buildChild();buildDog();buildRoom();shadowPlane(scene,-1.45,.55,1.25,1.1,.13);
  function resize(){const {width,height}=el.getBoundingClientRect();renderer.setSize(width,height);const aspect=width/height;const halfH=aspect<.9?3.05:2.6;camera.top=halfH;camera.bottom=-halfH;camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(el);resize();renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;$('renderError').hidden=false;updateUI();});renderer.setAnimationLoop(frame);
}

function pose(t){const c=character;let x=-1.43,z=.65,y=0,ry=.1,lean=0,walk=0,sit=0,pants=0,under=0,crouch=0;let left=[-.5,.87,.12],right=[.5,.87,.12],bubble=lesson[current].say;
  if(current===0){const p=Math.sin(t*1.5)*.025;lean=p;left=[-.19,1.02,.37];right=[.18,1.03,.38];bubble='咦，身体在提醒我！';}
  if(current===1){right=[.60,1.83,.15+Math.sin(t*3)*.04];bubble='我想上厕所，请帮帮我。';}
  if(current===2){const p=ramp(t,1,5.6);x=mix(-1.43,.15,p);z=mix(.65,1.02,p);walk=p>0&&p<1?Math.sin(t*5)*.38:0;y=Math.abs(walk)*.06;ry=p<.85?.55:mix(.55,.03,ramp(t,4.6,6.3));bubble=t<4?'小马桶在这里。':'到了，再脱裤裤。';}
  if(current>=3&&current<=6){x=.15;z=1.02;ry=0;}
  if(current===3){
    pants=ramp(t,1.2,4);under=ramp(t,5.1,7.7);
    let low=.88;
    if(t<4.2){crouch=pants;low=mix(.88,.25,pants);}
    else if(t<5.1){const reach=ramp(t,4.2,5.1);crouch=1-reach;low=mix(.25,.86,reach);}
    else if(t<7.9){crouch=under;low=mix(.86,.27,under);}
    else{const rise=ramp(t,7.9,9.4);crouch=1-rise;low=mix(.27,.87,rise);}
    left=[-.32,low,.24];right=[.32,low,.24];bubble=t<1.2?'两只手，抓住裤腰。':t<4.2?'弯弯膝盖，裤裤拉到脚踝。':t<7.9?'干净拉拉裤，也拉低。':'松开手，慢慢站稳。';
  }
  if(current===4){pants=under=1;sit=ramp(t,.6,3.2);y=-sit*.26;z=mix(1.02,.18,sit);left=[-.28,.91,.34];right=[.28,.91,.34];bubble=t<3?'小脚在外面，慢慢坐。':'轻轻呼吸，不用使劲。';}
  if(current===5){pants=under=1;sit=1;y=-.26;z=.18;right=[.58,1.50,.18];bubble='我好了，请帮我擦一擦。';}
  if(current===6){
    sit=1-ramp(t,.2,1.5);y=-sit*.26;z=mix(1.02,.18,sit);
    under=1-ramp(t,2.4,4);pants=1-ramp(t,5.2,7.2);
    let low=.87;
    if(t<1.5){left=[-.38,.92,.2];right=[.38,.92,.2];}
    else if(t<2.4){crouch=ramp(t,1.5,2.4);low=mix(.87,.27,crouch);}
    else if(t<4){crouch=under;low=mix(.86,.27,under);}
    else if(t<5.2){crouch=ramp(t,4.2,5.2);low=mix(.88,.25,crouch);}
    else{crouch=pants;low=mix(.88,.25,pants);}
    if(t>=1.5){left=[-.32,low,.24];right=[.32,low,.24];}
    bubble=t<1.5?'擦干净了，扶稳站起来。':t<4.2?'干净小内裤，拉上来。':'再拉好外裤，站稳啦。';
  }
  if(current===7){const p=ramp(t,0,3);x=mix(.15,2.8,p);z=mix(1.02,-.31,p);walk=p>0&&p<1?Math.sin(t*6)*.35:0;ry=mix(1.1,Math.PI,ramp(t,2.5,3.8));y=p*.28;left=[-.17,1.12,.42];right=[.17,1.12,.42];if(t>=4&&t<24){left[0]+=.06*Math.sin(t*7);right[0]-=.06*Math.sin(t*7);left[1]+=.025*Math.cos(t*7);right[1]-=.025*Math.cos(t*7);}bubble=t<4?'打湿小手，用上肥皂。':t<24?`手心、手背、指缝，搓一搓。 ${Math.min(20,Math.floor(t-4)+1)} / 20`:t<26?'用清水，冲干净。':'擦干小手，今天练习完成！';if(t>26){ry=mix(Math.PI,.18,ramp(t,26,27));right=[.55,1.65,.15];}}
  if(walk){left=[-.48,.94+walk*.1,.12+walk*.4];right=[.48,.94-walk*.1,.12-walk*.4];}
  if(reduced){walk=0;lean=0;}
  child.position.set(x,y,z);child.rotation.y=ry;
  const crouchAngle=crouch*.78,hipHeight=.14+.69*Math.cos(crouchAngle);
  c.bodyPivot.position.y=hipHeight;c.bodyPivot.rotation.x=crouch*1.0;
  c.torso.rotation.z=lean;c.torso.position.y=-.83+(reduced?0:Math.sin(idle*1.7)*.008);c.head.rotation.z=current===0?-.045:current===1?-.055:0;c.head.rotation.x=-crouch*.45;
  c.bodyPivot.updateMatrix();c.torso.updateMatrix();
  const blink=(!reduced&&Math.sin(idle*1.2)> .998)?.12:1;c.eyes.forEach(e=>e.scale.y=.069*blink);
  const paths=[];
  for(let i=0;i<2;i++){
    const leg=c.legs[i],side=leg.side;
    const hip=new THREE.Vector3(side*.21,hipHeight,0);
    // Ankles stay outside the pot shell for the entire sitting transition.
    const ankle=new THREE.Vector3(side*mix(.21,.58,sit),.14-(sit>0?y:0)+Math.max(0,side*walk)*.15,sit>0?mix(1.02,.65,sit)-z:side*walk*.55);
    const knee=solveJoint(hip,ankle,.36,.39,new THREE.Vector3(side*mix(.05,.9,sit),.12,1));
    positionBone(leg.upper,hip.toArray(),knee.toArray());positionBone(leg.lower,knee.toArray(),ankle.toArray());leg.hip.position.copy(hip);leg.knee.position.copy(knee);leg.foot.position.copy(ankle);
    paths.push([hip,knee,ankle]);
  }
  dressLegs(c.trousers,paths,pants);dressLegs(c.under,paths,under);
  const blend=(a,b,p)=>a.map((v,i)=>mix(v,b[i],p));
  for(let i=0;i<2;i++){
    const rest=i===0?left:right,pg=c.trousers.grips[i],ug=c.under.grips[i];let hand=rest;
    if(current===3){if(t<4.2)hand=pg;else if(t<5.1)hand=blend(pg,ug,ramp(t,4.2,5.1));else if(t<7.9)hand=ug;else hand=blend(ug,rest,ramp(t,7.9,9.4));}
    if(current===6&&t>=1.5){if(t<2.4)hand=blend(rest,ug,ramp(t,1.5,2.4));else if(t<4.2)hand=ug;else if(t<5.2)hand=blend(ug,pg,ramp(t,4.2,5.2));else if(t<7.2)hand=pg;else hand=blend(pg,rest,ramp(t,7.2,8));}
    arm(i,hand);
  }
  pullArrows.visible=current===3&&t>1.2&&t<7.8;pullArrows.position.y=reduced?0:-((t*.45)%1)*.06;
  // Neutral toy geometry and a long shirt cover the pelvis throughout the lesson.
  c.hips.visible=false;
  signal.visible=current===0;signal.position.set(x,1.03+y,z+.38);signal.rotation.y=ry;signal.children.forEach((r,i)=>{const pulse=reduced?0:((idle*.7+i*.4)%1);r.scale.setScalar(.7+pulse*.35);r.material.opacity=.55*(1-pulse);});
  dogParts.tail.rotation.y=reduced?0:Math.sin(idle*(idle<waveUntil?15:4))*.32;dogParts.head.rotation.z=reduced?0:Math.sin(idle*.9)*.065;dogParts.head.rotation.y=current>=3&&current<=6?-.14:0;dog.position.y=idle<waveUntil&&!reduced?Math.abs(Math.sin(idle*7))*.12:0;
  water.visible=current===7&&(t>=3&&t<4||t>=24&&t<26);
  bubbles.visible=current===7&&t>=4&&t<24;bubbles.position.set(x,y+1.10,z-.43);for(let i=0;i<bubbles.children.length;i++){const b=bubbles.children[i];const p=reduced?.5:(idle*.4+i/8)%1;b.position.set(Math.sin(i*3)*.19,p*.22,Math.cos(i*4)*.1);b.scale.setScalar(.035+Math.sin(i)*.012);}
  tissue.visible=current===5;tissue.position.set(.59,1.36,.19);
  $('sceneMessage').firstChild.textContent=bubble;
  // Keep the same teaching subject in view on narrow tablet / phone screens.
  const narrow=$('scene').clientWidth/$('scene').clientHeight<.9;
  const targetX=narrow?(current===7?1.8:0):.32;
  camera.position.set(targetX+3.1,3.5,9.4);camera.lookAt(targetX,1.23,0);
}
function frame(now){const dt=Math.min((now-(lastTick||now))/1000,.05);lastTick=now;if(playing&&!document.hidden&&!$('guideDialog').open){elapsed+=dt;idle+=dt;if(elapsed>=lesson[current].duration){elapsed=lesson[current].duration;if(auto&&current<7){current++;elapsed=0;updateUI();speak();}else{playing=false;completed=current===7;updateUI();stopSpeech();}}}
  // Reduced-motion mode uses a representative static pose per step. Explicit
  // playback advances the text/step timing without adding decorative movement.
  pose(reduced?[3,3,7,8,5,3,7,10][current]:elapsed);const progress=elapsed/lesson[current].duration;$('progressFill').style.transform=`scaleX(${progress})`;$('seek').value=String(Math.round(progress*100));renderer.render(scene,camera);
}
updateUI();
try{setup();}catch(error){console.error('Scene could not start:',error);$('renderError').hidden=false;playing=false;updateUI();}
