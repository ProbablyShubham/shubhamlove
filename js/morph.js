const SVG_NS = "http://www.w3.org/2000/svg";
const SEGMENTS = 110;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resample(points, count = SEGMENTS) {
  if (!points.length) return Array.from({ length: count }, () => [210, 210]);
  if (points.length === 1) points = [points[0], points[0]];
  const distances = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    distances.push(total);
  }
  if (!total) return Array.from({ length: count }, () => [...points[0]]);
  const output = [];
  let j = 1;
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    while (j < distances.length - 1 && distances[j] < target) j++;
    const span = distances[j] - distances[j - 1] || 1;
    const t = (target - distances[j - 1]) / span;
    output.push([
      points[j - 1][0] + (points[j][0] - points[j - 1][0]) * t,
      points[j - 1][1] + (points[j][1] - points[j - 1][1]) * t
    ]);
  }
  return output;
}

function ellipse(cx, cy, rx, ry, start = 0, end = Math.PI * 2, steps = 100) {
  const p = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + (end - start) * (i / steps);
    p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return p;
}

function arc(x0, y0, x1, y1, bow = 0, steps = 70) {
  const p = [];
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    p.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
  }
  return p;
}

function wave(x0, x1, y, amp, cycles, steps = 100) {
  const p = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    p.push([x0 + (x1 - x0) * t, y + amp * Math.sin(Math.PI * 2 * cycles * t)]);
  }
  return p;
}

function helix(amp = 68, cycles = 2.4) {
  const a = [], b = [], r = [];
  const y0 = 68, y1 = 352, span = y1 - y0, cx = 210;
  const A = t => [cx + amp * Math.sin(Math.PI * 2 * cycles * t), y0 + span * t];
  const B = t => [cx - amp * Math.sin(Math.PI * 2 * cycles * t), y0 + span * t];
  for (let i = 0; i <= 150; i++) { a.push(A(i / 150)); b.push(B(i / 150)); }
  for (let i = 0; i < 10; i++) {
    const t = (i + .5) / 10;
    r.push(A(t), B(t));
  }
  return [a, b, r];
}

function star(cx, cy, r, arms = 4) {
  const p = [];
  for (let i = 0; i <= arms * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / arms;
    const rr = i % 2 ? r * .18 : r;
    p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return p;
}

function S(points, options = {}) {
  return { pts: resample(points), opacity: options.opacity ?? 1, width: options.width ?? 1.35, dash: options.dash ?? "none" };
}
const dot = (x = 210, y = 210) => S([[x, y], [x, y]], { opacity: 0 });

const shapes = {
  baseline: {
    label: "baseline / research",
    make: () => [S(wave(48, 372, 210, 13, 1.35)), dot(), dot(), dot()]
  },
  map: {
    label: "projects / spatial",
    make: () => {
      const india = [[188,58],[207,70],[220,94],[242,107],[251,130],[238,153],[246,174],[231,192],[226,218],[245,242],[237,270],[218,291],[205,329],[190,353],[181,329],[169,303],[153,287],[146,258],[132,238],[141,211],[127,183],[143,163],[149,135],[165,112],[172,84],[188,58]];
      const river = [[181,104],[196,139],[187,178],[205,215],[197,254],[209,300]];
      return [S(india), S(river,{opacity:.55,width:1}), S(arc(125,125,285,276,46),{opacity:.45,dash:"2 8"}), dot()];
    }
  },
  nitrogen: {
    label: "nitrogen / n₂o",
    make: () => [S(ellipse(210,210,112,48)),S(ellipse(210,210,48,112),{opacity:.72}),S(ellipse(210,210,94,94),{opacity:.4,dash:"2 7"}),S([[128,270],[168,235],[210,250],[252,216],[292,147]],{width:1.7})]
  },
  nexus: {
    label: "energy ↔ agriculture",
    make: () => [S([[65,210],[155,210],[172,190],[188,230],[205,174],[225,246],[244,210],[355,210]]),S(arc(92,150,328,150,45),{opacity:.55}),S(arc(328,270,92,270,45),{opacity:.55}),dot()]
  },
  packages: {
    label: "open source / outputs",
    make: () => [S([[76,302],[76,112],[344,112]]),S([[92,285],[145,259],[176,267],[220,211],[260,218],[305,164],[342,145]],{width:1.8}),S([[305,164],[342,145],[325,181]],{opacity:.7}),S([[97,323],[326,323]],{opacity:.3,dash:"2 7"})]
  },
  helix: {
    label: "biotechnology / origin",
    make: () => { const h=helix(); return [S(h[0]),S(h[1]),S(h[2],{opacity:.35,width:.8}),dot()]; }
  },
  policy: {
    label: "policy / institutions",
    make: () => [S([[70,300],[70,145],[350,145],[350,300],[70,300]]),S([[105,300],[105,180],[315,180],[315,300]],{opacity:.6}),S([[70,145],[210,76],[350,145]],{opacity:.8}),S([[55,320],[365,320]],{opacity:.5})]
  },
  globe: {
    label: "penn / environmental studies",
    make: () => [S(ellipse(210,210,118,118)),S(ellipse(210,210,118,34),{opacity:.65}),S(ellipse(210,210,42,118),{opacity:.65}),S([[92,210],[328,210]],{opacity:.45})]
  },
  route: {
    label: "del → phl / 2024",
    make: () => [S(arc(82,295,330,112,70),{dash:"3 9"}),S(ellipse(82,295,12,12)),S(ellipse(330,112,12,12)),S([[310,126],[330,112],[322,137]],{opacity:.8})]
  },
  atmosphere: {
    label: "observatory / atmosphere",
    make: () => [S(ellipse(210,210,124,124)),S(ellipse(210,210,92,92),{opacity:.72}),S(ellipse(210,210,60,60),{opacity:.48}),S(arc(80,270,340,150,56),{dash:"2 8",opacity:.65})]
  },
  rules: {
    label: "notes / writing",
    make: () => [S([[72,145],[348,145]]),S([[72,197],[348,197]],{opacity:.7}),S([[72,249],[286,249]],{opacity:.45}),S([[72,301],[240,301]],{opacity:.26})]
  },
  stars: {
    label: "elsewhere / night sky",
    make: () => [S(star(145,146,42)),S(star(283,122,25),{opacity:.75}),S(star(255,267,34),{opacity:.86}),S(star(126,296,20),{opacity:.55})]
  },
  tiger: {
    label: "first project / tiger",
    make: () => [S([[108,245],[126,185],[160,142],[210,126],[260,142],[294,185],[312,245],[280,296],[232,316],[188,314],[140,294],[108,245]]),S([[147,160],[123,111],[174,137]],{opacity:.7}),S([[273,160],[297,111],[246,137]],{opacity:.7}),S([[170,232],[190,250],[210,236],[230,250],[250,232],[210,294],[170,232]],{opacity:.7})]
  },
  signature: {
    label: "sign-off / sl",
    make: () => {
      const sig=[[153,145],[137,128],[112,130],[99,148],[108,169],[138,183],[155,199],[153,221],[133,238],[108,234],[92,216],[112,240],[144,225],[167,196],[191,159],[218,130],[242,125],[250,143],[241,170],[220,198],[211,228],[220,245],[246,247],[283,228],[322,205]];
      return [S(sig,{width:1.7}),S(arc(78,276,340,266,12),{opacity:.45}),dot(),dot()];
    }
  }
};

function cloneStrands(strands){return strands.map(s=>({pts:s.pts.map(p=>[...p]),opacity:s.opacity,width:s.width,dash:s.dash}));}
function pathData(points){return "M"+points.map((p,i)=>`${i?"L":""}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join("");}
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}

export function initMorph(){
  const paths=[0,1,2,3].map(i=>document.getElementById(`strand-${i}`));
  const label=document.getElementById("plate-state");
  if(paths.some(p=>!p)) return;
  let current=cloneStrands(shapes.baseline.make());
  let currentName="baseline", raf=null;

  const paint=(strands)=>strands.forEach((s,i)=>{paths[i].setAttribute("d",pathData(s.pts));paths[i].setAttribute("opacity",s.opacity);paths[i].setAttribute("stroke-width",s.width);paths[i].setAttribute("stroke-dasharray",s.dash);});
  paint(current);

  function setShape(name){
    if(!shapes[name]||name===currentName)return;
    const from=cloneStrands(current),to=shapes[name].make();
    currentName=name;if(label)label.textContent=shapes[name].label;
    if(reduceMotion){current=cloneStrands(to);paint(current);return;}
    cancelAnimationFrame(raf);
    const start=performance.now(),duration=820;
    const tick=(now)=>{
      const p=Math.min(1,(now-start)/duration),e=ease(p);
      for(let i=0;i<4;i++){
        for(let k=0;k<current[i].pts.length;k++){
          current[i].pts[k][0]=from[i].pts[k][0]+(to[i].pts[k][0]-from[i].pts[k][0])*e;
          current[i].pts[k][1]=from[i].pts[k][1]+(to[i].pts[k][1]-from[i].pts[k][1])*e;
        }
        current[i].opacity=from[i].opacity+(to[i].opacity-from[i].opacity)*e;
        current[i].width=from[i].width+(to[i].width-from[i].width)*e;
        current[i].dash=to[i].dash;
      }
      paint(current);if(p<1)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }

  const candidates=[...document.querySelectorAll("[data-shape]")];
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top-innerHeight*.45)-Math.abs(b.boundingClientRect.top-innerHeight*.45));
    if(visible[0])setShape(visible[0].target.dataset.shape);
  },{rootMargin:"-38% 0px -38% 0px",threshold:0});
  candidates.forEach(el=>observer.observe(el));

  return {setShape};
}
