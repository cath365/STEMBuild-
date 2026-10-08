import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
const globals=src("src/app/globals.css");
const theme=src("src/app/logo-theme.css");
const home=src("src/app/home.module.css");
const layout=src("src/app/layout.tsx");

function lum(hex:string){
 const parts=(hex.match(/[0-9a-f]{2}/gi)||[]).map(x=>parseInt(x,16)/255);
 return parts.reduce((acc,n,i)=>acc+[.2126,.7152,.0722][i]*(n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)),0);
}
function contrast(a:string,b:string) {const l=[lum(a),lum(b)].sort((x,y)=>y-x);return (l[0]+.05)/(l[1]+.05);}

test("canonical STEMBuild logo palette is defined and loaded after the legacy CSS",()=>{
 const palette={
  "--brand-navy":"#0e3462",
  "--brand-blue":"#0172e5",
  "--brand-blue-deep":"#0454aa",
  "--brand-sky":"#62c1d4",
  "--brand-teal":"#06be99",
  "--brand-orange":"#f6b14a",
  "--brand-white":"#ffffff",
 };
 for(const [token,hex] of Object.entries(palette)) assert.ok(globals.includes(token+": "+hex),token+" not mapped to logo asset");
 assert.ok(layout.indexOf('import "./logo-theme.css"')>layout.indexOf('import "./lab-modes.css"'));
 assert.ok(theme.includes("var(--logo-success)")&&theme.includes("var(--logo-highlight)"));
});

test("logo UI roles have readable text and differentiate its four main workspace hues",()=>{
 for(const [fg,bg] of [
  ["#0e3462","#ffffff"],
  ["#0172e5","#ffffff"],
  ["#ffffff","#0172e5"],
  ["#0e3462","#ddf8f1"],
  ["#0e3462","#fff0d5"],
  ["#0e3462","#62c1d4"],
  ["#0e3462","#f6b14a"],
 ] as const) assert.ok(contrast(fg,bg)>=4.5,fg+" against "+bg+" must meet 4.5:1 contrast");
 for(const color of ["#0b3d91","#b52163","#ffd24c","#eee5ef"]) {
  assert.ok(!globals.includes(color)&&!home.includes(color),color+" is a legacy off-brand UI colour");
 }
 for(const selector of [".electronics",".programming",".sensors",".robotics"])assert.ok(home.includes(selector),selector+" must keep a distinct logo-colour topic treatment");
});
