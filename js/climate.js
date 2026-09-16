const AIR_URL="https://air-quality-api.open-meteo.com/v1/air-quality";
const CLIMATE_URL="https://climate-api.open-meteo.com/v1/climate";
const CITIES={
  phl:{name:"Philadelphia",lat:39.9526,lon:-75.1652},
  del:{name:"New Delhi",lat:28.6139,lon:77.2090}
};

const $=id=>document.getElementById(id);
const fmt=(value,digits=1)=>Number.isFinite(Number(value))?Number(value).toFixed(digits):"—";

async function loadN2O(){
  try{
    const res=await fetch("data/n2o.json",{cache:"no-cache"});
    if(!res.ok)throw new Error("N2O cache unavailable");
    const data=await res.json();
    if(data.latest?.value!=null){
      $("n2o-value").textContent=Number(data.latest.value).toFixed(2);
      $("n2o-date").textContent=`${data.latest.label || data.latest.date} · globally averaged marine surface`;
      if(data.year_ago?.value!=null){
        const delta=Number(data.latest.value)-Number(data.year_ago.value);
        $("n2o-change").textContent=`${delta>=0?"↑":"↓"} ${Math.abs(delta).toFixed(2)} ppb from the same month one year earlier`;
      } else {
        $("n2o-change").textContent="Latest NOAA globally averaged monthly mean";
      }
    }
    drawN2OChart(Array.isArray(data.series)?data.series:[]);
  }catch(err){
    $("n2o-change").textContent="Live cache will populate after the GitHub data workflow runs.";
  }
}

function drawN2OChart(series){
  const svg=$("n2o-chart");if(!svg)return;
  const valid=series.filter(d=>Number.isFinite(Number(d.value))).slice(-180);
  if(valid.length<2){svg.innerHTML='<text x="16" y="90">Trend line populates on the first data refresh.</text>';return;}
  const W=640,H=180,pad={l:20,r:18,t:18,b:24};
  const values=valid.map(d=>Number(d.value)),min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const x=i=>pad.l+i*(W-pad.l-pad.r)/(valid.length-1);
  const y=v=>pad.t+(max-v)*(H-pad.t-pad.b)/range;
  let d=`M ${x(0).toFixed(1)} ${y(values[0]).toFixed(1)}`;
  for(let i=1;i<values.length;i++)d+=` L ${x(i).toFixed(1)} ${y(values[i]).toFixed(1)}`;
  const grid=[.25,.5,.75].map(f=>`<line class="grid" x1="${pad.l}" x2="${W-pad.r}" y1="${(pad.t+f*(H-pad.t-pad.b)).toFixed(1)}" y2="${(pad.t+f*(H-pad.t-pad.b)).toFixed(1)}"/>`).join("");
  const first=valid[0].date?.slice(0,4)||"";const last=valid.at(-1).date?.slice(0,4)||"";
  svg.innerHTML=`${grid}<path class="line" d="${d}"/><circle class="dot" cx="${x(values.length-1)}" cy="${y(values.at(-1))}" r="3"/><text x="${pad.l}" y="${H-3}">${first}</text><text x="${W-pad.r}" y="${H-3}" text-anchor="end">${last}</text><text x="${pad.l}" y="12">${max.toFixed(1)} ppb</text>`;
}

async function loadAir(cityKey="phl"){
  const city=CITIES[cityKey];
  $("air-place").textContent=`${city.name} · current modelled surface air quality`;
  document.querySelectorAll("[data-city]").forEach(b=>b.classList.toggle("active",b.dataset.city===cityKey));
  try{
    const params=new URLSearchParams({latitude:city.lat,longitude:city.lon,current:"us_aqi,pm2_5,nitrogen_dioxide,ozone,methane",timezone:"auto"});
    const res=await fetch(`${AIR_URL}?${params}`);if(!res.ok)throw new Error(`Air API ${res.status}`);
    const data=await res.json(),c=data.current||{};
    $("air-aqi").textContent=fmt(c.us_aqi,0);$("air-pm25").textContent=fmt(c.pm2_5);$("air-no2").textContent=fmt(c.nitrogen_dioxide);$("air-o3").textContent=fmt(c.ozone);
    $("air-time").textContent=`Open-Meteo / CAMS · ${c.time?new Date(c.time).toLocaleString([], {month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"current"}`;
    const aqi=Math.max(0,Math.min(200,Number(c.us_aqi)||0));$("air-line-fill").style.width=`${Math.min(100,aqi/2)}%`;
  }catch(err){
    ["air-aqi","air-pm25","air-no2","air-o3"].forEach(id=>$(id).textContent="—");
    $("air-time").textContent="Live air data unavailable right now";
  }
}

async function meanClimate(lat,lon,start,end){
  const params=new URLSearchParams({latitude:lat.toFixed(3),longitude:lon.toFixed(3),start_date:start,end_date:end,models:"EC_Earth3P_HR",daily:"temperature_2m_mean",temperature_unit:"celsius",timeformat:"iso8601"});
  const res=await fetch(`${CLIMATE_URL}?${params}`);if(!res.ok)throw new Error(`Climate API ${res.status}`);
  const data=await res.json();
  const values=(data.daily?.temperature_2m_mean||[]).filter(v=>Number.isFinite(Number(v))).map(Number);
  if(!values.length)throw new Error("No climate values");
  return values.reduce((a,b)=>a+b,0)/values.length;
}

async function showClimate(lat,lon,label="Selected grid cell"){
  const empty=$("climate-empty"),result=$("climate-result"),status=$("climate-status");
  empty.hidden=true;result.hidden=false;$("climate-base").textContent="…";$("climate-future").textContent="…";$("climate-delta").textContent="Fetching two model periods…";
  $("climate-coord").textContent=`${label} · ${Math.abs(lat).toFixed(2)}° ${lat>=0?"N":"S"} · ${Math.abs(lon).toFixed(2)}° ${lon>=0?"E":"W"}`;
  const key=`climate-v1:${lat.toFixed(1)}:${lon.toFixed(1)}`;
  try{
    const cached=JSON.parse(localStorage.getItem(key)||"null");
    let base,future;
    if(cached&&Date.now()-cached.saved<1000*60*60*24*30){base=cached.base;future=cached.future;}
    else{
      [base,future]=await Promise.all([meanClimate(lat,lon,"1991-01-01","2000-12-31"),meanClimate(lat,lon,"2040-01-01","2049-12-31")]);
      try{localStorage.setItem(key,JSON.stringify({base,future,saved:Date.now()}));}catch(_){/* storage optional */}
    }
    $("climate-base").textContent=base.toFixed(1);$("climate-future").textContent=future.toFixed(1);
    const delta=future-base;$("climate-delta").textContent=`${delta>=0?"+":""}${delta.toFixed(1)} °C in this model comparison`;
    status.textContent="EC-Earth3P-HR, statistically downscaled by Open-Meteo. An exploratory climate projection, not a weather forecast.";
  }catch(err){
    $("climate-base").textContent="—";$("climate-future").textContent="—";$("climate-delta").textContent="Could not retrieve the climate model right now.";
  }
}

function initClimateControls(){
  document.querySelectorAll("[data-city]").forEach(btn=>btn.addEventListener("click",()=>loadAir(btn.dataset.city)));
  document.querySelectorAll("[data-climate-preset]").forEach(btn=>btn.addEventListener("click",()=>{const city=CITIES[btn.dataset.climatePreset];showClimate(city.lat,city.lon,city.name);}));
  $("use-location")?.addEventListener("click",()=>{
    if(!navigator.geolocation){$("climate-status").textContent="This browser does not provide geolocation. Try a preset city instead.";return;}
    $("climate-status").textContent="Requesting approximate browser location…";
    navigator.geolocation.getCurrentPosition(pos=>showClimate(pos.coords.latitude,pos.coords.longitude,"Your grid cell"),()=>{$("climate-status").textContent="Location was not shared. Try Philadelphia or New Delhi instead.";},{enableHighAccuracy:false,timeout:9000,maximumAge:1000*60*60});
  });
}

export function initClimate(){loadN2O();loadAir("phl");initClimateControls();}
