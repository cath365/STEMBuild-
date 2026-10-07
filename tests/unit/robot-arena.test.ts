import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRobot,rayDistance,stepRobot,collides,robotSketch} from '../../src/lib/robot-arena';
test('ultrasonic ray finds the nearest obstacle face and ignores objects behind it',()=>{
 assert.equal(rayDistance(0,65,Math.PI,[{id:1,x:0,z:0,size:20}]),55);
 assert.equal(rayDistance(0,65,0,[{id:1,x:0,z:0,size:20}]),35);
});
test('robot moves in an open path and turns before entering an obstacle',()=>{
 const moved=stepRobot(initialRobot,[],.05,25);assert.ok(moved.z<initialRobot.z);assert.equal(moved.action,'Forward');
 const blocked=stepRobot({...initialRobot,z:35},[{id:1,x:0,z:0,size:20}],.05,25);
 assert.equal(blocked.z,35);assert.equal(blocked.action,'Avoiding');assert.ok(blocked.heading>Math.PI);
});
test('collision guard and bounded frame time prevent tunnelling on a paused tab',()=>{
 assert.equal(collides(91,0,[]),true);assert.equal(collides(0,0,[{id:1,x:0,z:0,size:20}]),true);
 const s=stepRobot(initialRobot,[],500,25);assert.ok(Math.abs(s.z-initialRobot.z)<=1.11);
});
test('export uses the chosen threshold and stops on missing echo',()=>{
 const code=robotSketch(32);assert.match(code,/STOP_CM=32/);assert.match(code,/pulse==0/);assert.match(code,/TRIG=9, ECHO=8, IN1=4, IN2=5, IN3=6, IN4=7/);
});
