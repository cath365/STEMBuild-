"use client";
import { useEffect, useState } from "react";
type InstallPrompt=Event&{prompt():Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export function PwaInstallButton(){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
 useEffect(()=>{const handler=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};window.addEventListener("beforeinstallprompt",handler);return()=>window.removeEventListener("beforeinstallprompt",handler)},[]);
 if(!prompt)return null;
 return <button className="btn" type="button" onClick={async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null)}} style={{width:"100%",marginBottom:10}}>Install STEMBuild</button>;
}