import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStoryWorld} from './scene.js';

test('all story poses preserve fixed limb lengths and finite transforms, including backwards seeking',()=>{
  const world=createStoryWorld();
  for(const step of [9,0,8,1,7,2,6,3,5,4]) for(let tick=0;tick<=40;tick++) {
    world.pose(step,tick/40,false,0);
    world.scene.updateMatrixWorld(true);
    world.scene.traverse(object=>{
      for(const n of object.matrixWorld.elements) assert.ok(Number.isFinite(n),object.name);
      if(object.userData.boneLength){
        assert.ok(Math.abs(object.scale.y-object.userData.boneLength)<1e-6,object.name);
        let person=object.parent;while(person&&!['child','caregiver'].includes(person.name))person=person.parent;
        assert.ok(person,'bone belongs to a character');
        const m=object.matrixWorld.elements;
        assert.ok(Math.abs(Math.hypot(m[4],m[5],m[6])-object.userData.boneLength*person.scale.x)<1e-6,'world limb length stays fixed');
      }
    });
  }
});

test('reduced motion renders an identical pose regardless of time or pet animation',()=>{
  const world=createStoryWorld();
  const capture=()=>{world.scene.updateMatrixWorld(true);const a=[];world.scene.traverse(o=>a.push(...o.matrixWorld.elements));return a;};
  for(let i=0;i<10;i++){
    world.pose(i,0,true,0);const a=capture();
    world.pose(i,.9,true,9);assert.deepEqual(capture(),a);
  }
});
