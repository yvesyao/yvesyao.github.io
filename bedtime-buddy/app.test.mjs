import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {lesson,outfits} from './lesson.js';

// Exercise the real event handlers and animation loop with a small synthetic
// DOM/renderer. The Three.js scene is covered separately by scene.test.mjs.
function player(){
  const elements=new Map(),poses=[];
  let loop,preferenceChange,cancellations=0;
  function element(){return {
    children:[],attributes:{},firstChild:{textContent:''},style:{},classList:{toggle(){}},
    append(child){this.children.push(child);},addEventListener(){},
    setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},
    getBoundingClientRect(){return {width:800,height:600};}
  };}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const world={pose(...args){poses.push(args);},resize(){},setOutfit(){}};
  const context={
    document:{hidden:false,getElementById:get,createElement:element,addEventListener(){},
      querySelectorAll:selector=>get(selector==='.step'?'steps':'outfits').children},
    matchMedia:()=>({matches:false,addEventListener(type,fn){preferenceChange=fn;}}),
    window:{speechSynthesis:{},addEventListener(){}},
    speechSynthesis:{cancel(){cancellations++;}},
    ResizeObserver:class{observe(){}},
    THREE:{WebGLRenderer:class{constructor(){this.shadowMap={};this.domElement=element();}setPixelRatio(){}setAnimationLoop(fn){loop=fn;}render(){}}},
    createStoryWorld:()=>world,lesson,outfits,guideMarkup:'',sourcesMarkup:'',
    devicePixelRatio:1,console,performance:{now:()=>0}
  };
  const source=readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  runInNewContext(source,context);
  return {get,frame:time=>loop(time),pose:()=>poses.at(-1),cancellations:()=>cancellations,
    preference:value=>preferenceChange({matches:value})};
}

test('turning reduced motion on and off preserves active playback and progress',()=>{
  const p=player();p.get('playButton').onclick();p.frame(10);p.frame(60);
  const start=p.pose()[1],speechStops=p.cancellations();
  p.get('motionButton').onclick();p.frame(110);
  assert.equal(p.get('playButton').attributes['aria-label'],'暂停动画');
  assert.equal(p.pose()[2],true);
  assert.ok(p.pose()[1]>start,'the story timeline keeps advancing');
  const reducedProgress=p.pose()[1];
  p.get('motionButton').onclick();p.frame(160);
  assert.equal(p.pose()[2],false);
  assert.ok(p.pose()[1]>reducedProgress,'normal motion resumes at current progress');
  assert.equal(p.cancellations(),speechStops,'motion preference does not interrupt narration');
});

test('motion toggle preserves a deliberate pause and labels both states',()=>{
  const p=player();p.get('seek').oninput({target:{value:'42'}});p.frame(10);
  const start=p.pose()[1];
  p.get('motionButton').onclick();p.frame(60);
  assert.equal(p.get('motionButton').textContent,'轻动：开');
  p.get('motionButton').onclick();p.frame(110);
  assert.equal(p.get('motionButton').textContent,'轻动：关');
  assert.equal(p.get('playButton').attributes['aria-label'],'播放动画');
  assert.equal(p.pose()[1],start);
});

test('system reduced-motion changes preserve playback while updating the scene',()=>{
  const p=player();p.get('playButton').onclick();p.frame(10);
  p.preference(true);p.frame(60);
  assert.equal(p.pose()[2],true);
  assert.equal(p.get('playButton').attributes['aria-label'],'暂停动画');
  p.preference(false);p.frame(110);
  assert.equal(p.pose()[2],false);
  assert.equal(p.get('playButton').attributes['aria-label'],'暂停动画');
});
