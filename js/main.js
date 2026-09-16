import { initMorph } from "./morph.js";
import { initClimate } from "./climate.js";

initMorph();
initClimate();

document.getElementById("year").textContent=new Date().getFullYear();

const navToggle=document.querySelector(".nav-toggle");
const nav=document.getElementById("site-nav");
navToggle?.addEventListener("click",()=>{const open=nav.classList.toggle("open");navToggle.setAttribute("aria-expanded",String(open));});
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");navToggle?.setAttribute("aria-expanded","false");}));

const sections=[...document.querySelectorAll("[data-section]")];
const navLinks=[...document.querySelectorAll(".site-nav a")];
const navObserver=new IntersectionObserver(entries=>{
  const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top-innerHeight*.35)-Math.abs(b.boundingClientRect.top-innerHeight*.35));
  if(!visible[0])return;
  const id=visible[0].target.id;
  document.body.dataset.activeSection=id;
  navLinks.forEach(a=>a.classList.toggle("active",a.getAttribute("href")===`#${id}`));
},{rootMargin:"-28% 0px -62% 0px",threshold:0});
sections.forEach(s=>navObserver.observe(s));

function heartAt(x,y){
  const ns="http://www.w3.org/2000/svg";const svg=document.createElementNS(ns,"svg");svg.classList.add("heart-burst");svg.setAttribute("viewBox","-30 -20 60 60");svg.style.left=`${x}px`;svg.style.top=`${y}px`;
  const p=document.createElementNS(ns,"path");p.setAttribute("d","M0,-2 C-7,-12 -22,-9 -22,3 C-22,14 -9,21 0,29 C9,21 22,14 22,3 C22,-9 7,-12 0,-2 Z");svg.appendChild(p);document.body.appendChild(svg);
  const len=p.getTotalLength();p.style.strokeDasharray=len;p.style.strokeDashoffset=len;p.style.transition="stroke-dashoffset .8s cubic-bezier(.5,0,.2,1)";requestAnimationFrame(()=>p.style.strokeDashoffset=0);setTimeout(()=>{svg.style.transition="opacity .4s";svg.style.opacity=0;setTimeout(()=>svg.remove(),420);},1100);
}
document.querySelector(".surname")?.addEventListener("click",e=>heartAt(e.clientX,e.clientY));

async function loadLatest(){
  try{const res=await fetch("data/latest-post.json",{cache:"no-cache"});if(!res.ok)return;const data=await res.json();if(!data.title||!data.link)return;const a=document.getElementById("latest-link");a.textContent=data.title;a.href=data.link;if(data.date){document.getElementById("latest-date").textContent=new Date(data.date).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});}}catch(_){/* static fallback remains */}
}
loadLatest();

const overlay=document.getElementById("molecule-overlay");
const chemStepNo=document.getElementById("chem-step-no");
const chemStepName=document.getElementById("chem-step-name");
const chemEquation=document.getElementById("chem-equation");
const chemExplain=document.getElementById("chem-explain");
const chemReplay=document.getElementById("chem-replay");
const chemProgress=[...(overlay?.querySelectorAll(".chem-progress li")||[])];
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let chemTimers=[];
let previousFocus=null;

const chemStages=[
  {
    name:"Long-lived gas",
    equation:"N₂O",
    text:"N₂O is stable enough in the lower atmosphere to persist for decades and be transported upward."
  },
  {
    name:"Reaches the stratosphere",
    equation:"N₂O  ↑",
    text:"Because it is not readily destroyed in the troposphere, some N₂O eventually reaches the stratosphere."
  },
  {
    name:"Reactive-oxygen branch",
    equation:"N₂O + O(¹D) → 2 NO",
    text:"Most stratospheric N₂O is removed by photolysis. A smaller, ozone-relevant branch reacts with excited atomic oxygen, O(¹D), and produces nitric oxide."
  },
  {
    name:"Ozone is consumed",
    equation:"NO + O₃ → NO₂ + O₂",
    text:"The NO produced from N₂O can react with ozone, converting O₃ to ordinary molecular oxygen."
  },
  {
    name:"NO is regenerated",
    equation:"NO₂ + O → NO + O₂",
    text:"NO is regenerated rather than permanently consumed, allowing the NOₓ catalytic cycle to continue."
  },
  {
    name:"Net effect",
    equation:"O₃ + O → 2 O₂",
    text:"Across the two catalytic steps, ozone and atomic oxygen are converted to O₂ while NO acts as a catalyst."
  }
];

function clearChemTimers(){chemTimers.forEach(clearTimeout);chemTimers=[];}
function setChemStage(index){
  if(!overlay)return;
  const stage=chemStages[index]||chemStages[0];
  overlay.dataset.stage=String(index);
  if(chemStepNo)chemStepNo.textContent=String(index+1).padStart(2,"0");
  if(chemStepName)chemStepName.textContent=stage.name;
  if(chemEquation)chemEquation.textContent=stage.equation;
  if(chemExplain)chemExplain.textContent=stage.text;
  chemProgress.forEach((li,i)=>li.classList.toggle("active",i===index));
  if(chemReplay)chemReplay.hidden=index!==chemStages.length-1;
}
function playChemistry(){
  clearChemTimers();
  setChemStage(0);
  if(reducedMotion){setChemStage(5);return;}
  [2100,4300,6800,9200,11600].forEach((delay,i)=>{
    chemTimers.push(setTimeout(()=>setChemStage(i+1),delay));
  });
}
function openMolecule(){
  if(!overlay)return;
  previousFocus=document.activeElement;
  overlay.classList.add("on");
  overlay.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  playChemistry();
  overlay.querySelector(".molecule-close")?.focus();
}
function closeMolecule(){
  if(!overlay)return;
  clearChemTimers();
  overlay.classList.remove("on");
  overlay.setAttribute("aria-hidden","true");
  overlay.dataset.stage="0";
  document.body.style.overflow="";
  if(previousFocus instanceof HTMLElement)previousFocus.focus();
}
document.querySelectorAll("[data-n2o-trigger]").forEach(el=>el.addEventListener("click",openMolecule));
overlay?.querySelector(".molecule-close")?.addEventListener("click",closeMolecule);
chemReplay?.addEventListener("click",playChemistry);
overlay?.addEventListener("click",e=>{if(e.target===overlay)closeMolecule();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay?.classList.contains("on"))closeMolecule();});
