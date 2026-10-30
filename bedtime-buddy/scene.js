import * as THREE from '../potty-buddy/vendor/three.module.js';
const outfits=[{shirt:0xffcf54,pants:0x80a8ad,shoe:0xe8ae8a}];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
// The first story's original toy character and fixed-length joints are reused
// locally. No change to the published potty lesson or its animation contracts.
export function createStoryWorld(){
 const scene=new THREE.Scene();
 let child,character,dog,dogParts,shirtMat,pantsMat,shoesMat,pullArrows;
function mat(color,roughness=.7){return new THREE.MeshStandardMaterial({color,roughness});}
function mesh(geo,material,parent,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const sphere=new THREE.SphereGeometry(1,36,24);
function ball(parent,material,pos,scale){return mesh(sphere,material,parent,pos,scale);}
function box(parent,material,pos,scale,r=.12){const g=new THREE.BoxGeometry(1,1,1);return mesh(g,material,parent,pos,scale);}
function cylinder(parent,material,a,b,r1=.07,r2=r1){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const length=start.distanceTo(end);const m=mesh(new THREE.CylinderGeometry(r1,r2,length,16),material,parent,start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;}
function tube(parent,material,points,r=.02){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(c,24,r,8,false),material,parent);}
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
  character={group:child,shirtMat,pantsMat,shoesMat,torso,bodyPivot,head,eyes,hands,arms,legs,trousers,under,hips};
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
  upper.userData.boneLength=.33;lower.userData.boneLength=.31;positionBone(upper,a.toArray(),b.toArray());positionBone(lower,b.toArray(),h.toArray());c.hands[i].position.copy(h);
}

function buildDog(){dog=new THREE.Group();scene.add(dog);dog.position.set(1.55,0,.44);dog.rotation.y=-.22;const tan=mat(0xdca059),white=mat(0xfff1d8),brown=mat(0x4e362a),pink=mat(0xeaa392);ball(dog,tan,[0,.42,0],[.40,.32,.65]);ball(dog,white,[0,.48,.39],[.31,.29,.25]);for(const x of [-.25,.25])for(const z of [-.37,.35]){ball(dog,tan,[x,.17,z],[.14,.20,.16]);ball(dog,white,[x,.09,z+.04],[.14,.09,.17]);}const head=new THREE.Group();head.position.set(0,.78,.42);dog.add(head);ball(head,tan,[0,0,0],[.43,.36,.36]);const earGeo=new THREE.ConeGeometry(.22,.52,3);for(const side of [-1,1]){const ear=mesh(earGeo,tan,head,[side*.29,.34,-.055],[1,1,.65]);ear.rotation.z=-side*.22;ear.rotation.y=Math.PI/6;const inset=mesh(earGeo,pink,head,[side*.29,.34,.015],[.65,.65,.45]);inset.rotation.copy(ear.rotation);ball(head,brown,[side*.18,.03,.306],[.041,.055,.028]);ball(head,white,[side*.185-.01,.045,.329],[.012,.015,.006]);}ball(head,white,[0,-.14,.29],[.27,.18,.16]);ball(head,white,[0,.12,.31],[.085,.21,.045]);ball(head,brown,[0,-.075,.44],[.08,.05,.045]);tube(head,brown,[[-.09,-.20,.425],[0,-.22,.445],[.09,-.20,.425]],.014);const tongue=ball(head,pink,[0,-.25,.43],[.047,.07,.02]);const tail=new THREE.Group();tail.position.set(0,.51,-.56);dog.add(tail);ball(tail,tan,[0,.07,-.12],[.12,.13,.24]);ball(tail,white,[0,.09,-.29],[.10,.10,.10]);dogParts={head,tail,tongue};}

 const cream=mat(0xfff1da),wood=mat(0xd5a27c),sage=mat(0x9cb6a2),peach=mat(0xe6b7a2),white=mat(0xfff8e9),blue=mat(0x84aeb7),gold=mat(0xf3ce80);
 scene.background=new THREE.Color(0xf0e0d0);
 const floor=mesh(new THREE.PlaneGeometry(200,200),mat(0xf0dfc9),scene);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 box(scene,mat(0xefd7bd),[0,2.6,-2.5],[14,5.2,.12]);
 box(scene,wood,[0,.11,-2.4],[14,.18,.10]);
 const windowFrame=new THREE.Group();windowFrame.position.set(-2.8,2.65,-2.4);scene.add(windowFrame);
 ball(windowFrame,cream,[0,0,0],[.89,1.1,.10]);ball(windowFrame,mat(0x778c99),[0,0,.06],[.77,.98,.06]);
 ball(windowFrame,gold,[-.14,.27,.14],[.31,.31,.03]);ball(windowFrame,mat(0x778c99),[0,.38,.18],[.29,.29,.035]);
 for(const [x,y] of [[.4,.5],[-.48,-.1],[.26,-.43]]){ball(windowFrame,white,[x,y,.15],[.035,.035,.015]);}
 box(windowFrame,wood,[0,-.98,.12],[1.9,.13,.35]);
 const rug=ball(scene,mat(0xdfbda5),[0,.025,.4],[2.7,.025,1.55]);
 ball(scene,mat(0xefd2b5),[0,.047,.4],[2.55,.02,1.4]);
 const bed=new THREE.Group();bed.position.set(1.45,0,-.75);scene.add(bed);
 box(bed,wood,[0,.34,0],[3.1,.26,1.44]);
 for(const x of [-1.25,1.25])for(const z of [-.5,.5])cylinder(bed,wood,[x,0,z],[x,.38,z],.08);
 ball(bed,cream,[0,.54,0],[1.55,.19,.72]);box(bed,sage,[-1.54,.73,0],[.12,1.2,1.48]);
 ball(bed,white,[-1.02,.74,0],[.39,.13,.52]);
 // A quilt drapes down to the mattress at its edges; it is not a floating oval.
 const quiltVertices=[],quiltIndices=[],quiltResolution=24;
 for(let z=0;z<=quiltResolution;z++)for(let x=0;x<=quiltResolution;x++){
   const u=x/quiltResolution*2-1,v=z/quiltResolution*2-1;
   quiltVertices.push(u,(1-Math.abs(v)**6)*(1-Math.abs(u)**8),v);
   if(x<quiltResolution&&z<quiltResolution){const a=z*(quiltResolution+1)+x,b=a+quiltResolution+1;quiltIndices.push(a,b,a+1,a+1,b,b+1);}
 }
 const quiltGeometry=new THREE.BufferGeometry();quiltGeometry.setAttribute('position',new THREE.Float32BufferAttribute(quiltVertices,3));quiltGeometry.setIndex(quiltIndices);quiltGeometry.computeVertexNormals();
 const quiltMaterial=mat(0xb4c2aa);quiltMaterial.side=THREE.DoubleSide;
 const blanket=mesh(quiltGeometry,quiltMaterial,bed,[.32,.67,0],[1.10,.11,.69]);
 for(const z of [-.4,-.1,.2,.5])tube(bed,cream,[[.95,.77,z],[1.05,.72,z],[1.10,.65,z]],.012);
 const lamp=new THREE.Group();lamp.position.set(3.5,0,-1.65);scene.add(lamp);
 cylinder(lamp,wood,[0,.1,0],[0,2.1,0],.045);ball(lamp,wood,[0,.08,0],[.35,.08,.35]);
 mesh(new THREE.CylinderGeometry(.32,.49,.54,32),mat(0xf8dba7),lamp,[0,2.15,0]);
 const painting=new THREE.Group();painting.position.set(.5,2.65,-2.4);scene.add(painting);
 box(painting,wood,[0,0,0],[.75,.93,.07]);box(painting,white,[0,0,.05],[.64,.82,.03]);
 ball(painting,gold,[0,.05,.08],[.20,.20,.02]);for(const x of [-.07,.07])ball(painting,wood,[x,.07,.105],[.013,.02,.007]);
 tube(painting,wood,[[-.06,-.025,.11],[0,-.045,.12],[.06,-.025,.11]],.008);
 buildChild();const kid=character;kid.group.name="child";kid.group.scale.setScalar(.88);
 buildChild();const grown=character;grown.group.name="caregiver";grown.group.scale.setScalar(1.10);grown.shirtMat.color.setHex(0xcaa58e);grown.pantsMat.color.setHex(0x829d96);grown.shoesMat.color.setHex(0xe3c4a3);
 // Give the caregiver a different silhouette and a low hair bun.
 ball(grown.head,mat(0x584035),[.48,.2,-.25],[.25,.26,.24]);
 buildDog();dog.scale.setScalar(.8);dog.position.set(1.6,0,1.0);dog.rotation.y=-.28;
 const props=new THREE.Group();scene.add(props);
 const bath=new THREE.Group();props.add(bath);bath.position.set(0,0,.35);
 ball(bath,white,[0,.36,0],[.9,.38,.65]);ball(bath,blue,[0,.62,0],[.73,.03,.5]);
 for(let i=0;i<12;i++)ball(bath,white,[Math.sin(i*4)*.63,.65+Math.cos(i)*.02,Math.cos(i*3)*.35],[.12,.07,.11]);
 const bathTowel=ball(kid.group,cream,[0,.99,0],[.43,.43,.32]);
 const towel=box(kid.group,cream,[.55,1.15,.39],[.20,.18,.045]);
 const diaper=new THREE.Group();props.add(diaper);diaper.position.set(.9,1.02,1.05);
 ball(diaper,white,[0,0,0],[.27,.25,.08]);box(diaper,blue,[-.25,.12,0],[.14,.10,.09]);box(diaper,blue,[.25,.12,0],[.14,.10,.09]);ball(diaper,gold,[0,.05,.09],[.07,.07,.01]);
 const lotion=new THREE.Group();props.add(lotion);lotion.position.set(.9,.44,.9);
 mesh(new THREE.CylinderGeometry(.14,.16,.39,24),peach,lotion,[0,.2,0]);box(lotion,white,[0,.43,0],[.10,.08,.09]);box(lotion,white,[.06,.48,0],[.22,.04,.07]);ball(lotion,cream,[0,.2,.157],[.085,.09,.01]);
 const brush=new THREE.Group();kid.group.add(brush);
 cylinder(brush,blue,[0,0,0],[0,.25,0],.025);box(brush,white,[0,.28,.025],[.09,.10,.055]);
 const book=new THREE.Group();props.add(book);
 const leftPage=box(book,peach,[-.21,0,0],[.43,.55,.06]);leftPage.rotation.y=.22;
 const rightPage=box(book,sage,[.21,0,0],[.43,.55,.06]);rightPage.rotation.y=-.22;
 box(book,cream,[-.20,0,.055],[.36,.47,.018]);box(book,cream,[.20,0,.055],[.36,.47,.018]);
 ball(book,gold,[-.20,.07,.08],[.10,.10,.015]);ball(book,blue,[.19,-.01,.08],[.11,.065,.015]);
 const hemisphere=new THREE.HemisphereLight(0xfff5df,0xc3a491,2);scene.add(hemisphere);
 const sun=new THREE.DirectionalLight(0xffedcd,2.6);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xe3edee,.8);fill.position.set(5,3,3);scene.add(fill);
 const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,100);
 let aspect=1.5;
 function resize(width,height){aspect=width/height;const half=aspect<.9?3.2:2.65;camera.top=half;camera.bottom=-half;camera.left=-half*aspect;camera.right=half*aspect;camera.updateProjectionMatrix();}
 function personPose(person,{x=0,y=0,z=.6,turn=0,lean=0,left=[-.5,.88,.1],right=[.5,.88,.1],eyes=1,walk=0}={}){
   child=person.group;character=person;child.position.set(x,y,z);child.rotation.set(0,turn,0);
   person.bodyPivot.position.y=.83;person.bodyPivot.rotation.set(lean,0,0);person.torso.rotation.set(0,0,0);person.torso.position.y=-.83;
   person.head.rotation.set(-lean*.35,0,0);person.eyes.forEach(e=>e.scale.y=.069*eyes);
   // Eye highlights close with the eyes rather than hovering above closed lids.
   person.head.children.filter(o=>o.geometry===sphere&&o.scale.x===.013).forEach(o=>o.visible=eyes>.4);
   person.bodyPivot.updateMatrix();person.torso.updateMatrix();
   const paths=[];
   person.legs.forEach(leg=>{
     const hip=new THREE.Vector3(leg.side*.21,.83,0),ankle=new THREE.Vector3(leg.side*.21,.14+Math.max(0,leg.side*walk)*.12,leg.side*walk*.24);
     const knee=solveJoint(hip,ankle,.36,.39,new THREE.Vector3(0,.1,1));
     positionBone(leg.upper,hip.toArray(),knee.toArray());positionBone(leg.lower,knee.toArray(),ankle.toArray());
     leg.upper.userData.boneLength=.36;leg.lower.userData.boneLength=.39;leg.knee.position.copy(knee);leg.hip.position.copy(hip);leg.foot.position.copy(ankle);paths.push([hip,knee,ankle]);
   });
   dressLegs(person.trousers,paths,0);dressLegs(person.under,paths,0);person.hips.visible=false;
   person.trousers.group.visible=true;person.under.group.visible=true;
   person.arms.forEach(a=>a.sleeve.visible=true);
   arm(0,left);arm(1,right);
 }
 function pose(step,progress,reduced=false,pet=0){
   const p=reduced?.72:clamp(progress),t=p*8;
   const wave=reduced?0:Math.sin(t*3),blink=!reduced&&Math.sin(t*1.7)>.99?.15:1;
   [bath,bathTowel,towel,diaper,lotion,brush,book].forEach(o=>o.visible=false);
   blanket.position.set(.32,.67,0);blanket.scale.set(1.10,.11,.69);
   grown.group.visible=true;
   let kidPose={x:0,z:.65,eyes:blink},parentPose={x:-1.5,z:.20,turn:.25,eyes:blink};
   if(step===0){
     kidPose.right=[.46,1.45,.30];kidPose.left=[-.3,1.05,.33];
     parentPose.right=[.58,1.30,.38];
   }
   if(step===1){bath.visible=bathTowel.visible=towel.visible=true;kidPose.y=-.22;kidPose.right=[.46,1.12+wave*.06,.37];parentPose.right=[.55,1.04,.42];parentPose.lean=.1;}
   if(step===2){diaper.visible=true;diaper.rotation.z=wave*.07;kidPose.left=[-.57,1.25,.20];kidPose.right=[.57,1.25,.20];parentPose.lean=.16;parentPose.right=[.50,.98,.39];}
   if(step===3){lotion.visible=true;kidPose.left=[-.12,1.11,.42];kidPose.right=[-.29,1.16+wave*.065,.37];}
   if(step===4){kidPose.left=[-.33,mix(1.0,1.38,ramp(p,.1,.65)),.22];kidPose.right=[.33,mix(1.0,1.38,ramp(p,.1,.65)),.22];}
   if(step===5){brush.visible=true;parentPose.x=-1.02;parentPose.z=.16;kidPose.right=[.18+wave*.025,1.55,.60];kidPose.left=[-.44,1.13,.18];parentPose.right=[.64,1.31,.47];}
   if(step===6){kidPose.left=[-.33,1.1,.38];kidPose.right=[.44,1.54,.24];parentPose.right=[.55,1.36,.35];}
   if(step===7){const hug=ramp(p,.12,.55);kidPose.x=mix(0,-.45,hug);kidPose.turn=-.32*hug;kidPose.left=[-.58,1.37,.08];kidPose.right=[.48,1.29,.32];parentPose.x=-1.5;parentPose.right=[.65,1.17,.52];parentPose.left=[.20,1.14,.52];parentPose.lean=.10*hug;}
   if(step===8){book.visible=true;book.position.set(-.18,1.08,1.03);book.rotation.set(-.22,0,0);kidPose.left=[-.3,1.14,.46];kidPose.right=[.3,1.14,.46];parentPose.x=-1.23;parentPose.lean=.09;}
   if(step===9){kidPose={x:2.22,y:1.14,z:-.75,eyes:1-ramp(p,.22,.55),left:[-.23,1.14,.33],right:[.23,1.14,.33]};parentPose={x:-.85,z:.35,turn:.20,right:[.5,1.35,.32],eyes:blink};blanket.position.set(.30,.67,0);blanket.scale.set(1.08,.87,.73);}
   personPose(kid,kidPose);personPose(grown,parentPose);
   if(step===1){kid.trousers.group.visible=false;kid.under.group.visible=false;}
   if(step===5){const h=kid.hands[1].position.clone().applyMatrix4(kid.torso.matrix).applyMatrix4(kid.bodyPivot.matrix);brush.position.copy(h);brush.rotation.set(-.12,0,-.15);}
   if(step===9){kid.group.rotation.z=Math.PI/2;}
   dogParts.tail.rotation.y=reduced?0:Math.sin(t*(pet>0?10:3))*.22;
   dogParts.head.rotation.z=reduced?0:Math.sin(t*.8)*.04;
   dog.position.set(aspect<.9?1.0:1.65,0,step===9?.9:1.2);dog.rotation.y=-.28;
   sun.intensity=step===9?mix(2.6,1.15,ramp(p,.1,.8)):2.6;
   hemisphere.intensity=step===9?mix(2,1.1,ramp(p,.1,.8)):2;
   const targetX=aspect<.9?-.1:0;
   camera.position.set(targetX+2.6,3.2,9.7);camera.lookAt(targetX,1.20,.1);
 }
 function setOutfit(outfit){kid.shirtMat.color.setHex(outfit.shirt);kid.pantsMat.color.setHex(outfit.pants);kid.shoesMat.color.setHex(outfit.shoe);}
 resize(900,600);pose(0,0);
 return {scene,camera,resize,pose,setOutfit};
}
