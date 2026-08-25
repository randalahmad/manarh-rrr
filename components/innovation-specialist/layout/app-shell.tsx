"use client";
import { useState,type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
export function AppShell({children}:{children:ReactNode}){const[open,setOpen]=useState(false);return <div className="min-h-screen"><Sidebar open={open} onClose={()=>setOpen(false)}/><div className="lg:mr-72"><Topbar onMenu={()=>setOpen(true)}/><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>}
