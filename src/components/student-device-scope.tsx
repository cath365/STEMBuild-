"use client";
import { useEffect } from "react";
import { setActiveOfflineLearner } from "@/lib/offline-client";
export function StudentDeviceScope({learnerId}:{learnerId:string}) { useEffect(()=>{setActiveOfflineLearner(learnerId).catch(()=>undefined)},[learnerId]); return null; }