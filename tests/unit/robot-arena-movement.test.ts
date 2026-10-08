import test from "node:test";
import assert from "node:assert/strict";
import { initialRobot, repositionObstacle, type Obstacle } from "../../src/lib/robot-arena";

const blocks:Obstacle[] = [
 {id:1,x:0,z:0,size:22},
 {id:2,x:50,z:0,size:22}
];
test("moving a block preserves other obstacles and supports fine coordinates",()=>{
 const moved=repositionObstacle(blocks,1,8,12,initialRobot);
 assert.deepEqual(moved[0],{id:1,x:8,z:12,size:22});
 assert.deepEqual(moved[1],blocks[1]);
 assert.deepEqual(blocks[0],{id:1,x:0,z:0,size:22});
});
test("moving an obstacle cannot collide with robot or another block",()=>{
 assert.equal(repositionObstacle(blocks,1,50,0,initialRobot),blocks);
 assert.equal(repositionObstacle(blocks,1,0,65,initialRobot),blocks);
 assert.equal(repositionObstacle(blocks,999,0,20,initialRobot),blocks);
 assert.equal(repositionObstacle(blocks,1,NaN,20,initialRobot),blocks);
});
test("moved obstacles stay inside editable arena bounds",()=>{
 const moved=repositionObstacle(blocks,1,-500,-500,initialRobot);
 assert.deepEqual([moved[0].x,moved[0].z],[-78,-78]);
});
