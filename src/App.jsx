import React,{useEffect,useMemo,useState}from"react";
import{Bell,BookOpen,Brain,CheckCircle2,Clock3,Flame,Mail,Pause,Play,Plus,RotateCcw,Settings,Target,Trash2,X}from"lucide-react";

const SUBJECTS=["C Programming","Data Structures & Algorithms","DBMS","Operating Systems","Computer Networks","COA","TOC","Compiler Design","Discrete Mathematics","Digital Logic","Engineering Mathematics","General Aptitude"];
const DEFAULT_TASKS=[
{id:1,title:"Complete today's primary GATE target",subject:"Data Structures & Algorithms",minutes:90,done:false},
{id:2,title:"Solve 20 topic-wise PYQs",subject:"DBMS",minutes:60,done:false},
{id:3,title:"Revise mistakes + short notes",subject:"Operating Systems",minutes:45,done:false}
];
const defaultProgress=Object.fromEntries(SUBJECTS.map((s,i)=>[s,{percent:i<3?70:i<6?45:20}]));
const API=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function base64ToUint8Array(base64){const padding="=".repeat((4-base64.length%4)%4),raw=atob((base64+padding).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function registerPush(){if(!("serviceWorker"in navigator)||!("PushManager"in window))throw new Error("Push notifications are not supported by this browser.");if(!API)throw new Error("Notification backend is not configured.");const reg=await navigator.serviceWorker.ready;const config=await fetch(API+"/api/config").then(r=>r.json());if(!config.publicKey)throw new Error("Push server is not configured yet.");let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToUint8Array(config.publicKey)});return sub}
async function getPushSubscription(){const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription()}

function App(){
const[tasks,setTasks]=useState(()=>load("pp_tasks",DEFAULT_TASKS));
const[progress,setProgress]=useState(()=>load("pp_progress",defaultProgress));
const[times,setTimes]=useState(()=>{const t=load("pp_times",{morning:"04:00",evening:"17:30",night:"21:30"});return t.morning==="06:30"?{...t,morning:"04:00"}:t});
const[email,setEmail]=useState(()=>localStorage.getItem("pp_email")||"");
const[notifications,setNotifications]=useState(()=>localStorage.getItem("pp_notifications")==="true");
const[mistakes,setMistakes]=useState(()=>load("pp_mistakes",[]));
const[showSettings,setShowSettings]=useState(false),[showMistakes,setShowMistakes]=useState(false),[newTask,setNewTask]=useState(""),[newMistake,setNewMistake]=useState({subject:"DBMS",topic:"",note:""}),[toast,setToast]=useState(""),[testing,setTesting]=useState(false);
const[timerSeconds,setTimerSeconds]=useState(50*60),[timerRunning,setTimerRunning]=useState(false),[timerPreset,setTimerPreset]=useState(50);
useEffect(()=>localStorage.setItem("pp_tasks",JSON.stringify(tasks)),[tasks]);useEffect(()=>localStorage.setItem("pp_progress",JSON.stringify(progress)),[progress]);useEffect(()=>localStorage.setItem("pp_times",JSON.stringify(times)),[times]);useEffect(()=>localStorage.setItem("pp_email",email),[email]);useEffect(()=>localStorage.setItem("pp_notifications",String(notifications)),[notifications]);useEffect(()=>localStorage.setItem("pp_mistakes",JSON.stringify(mistakes)),[mistakes]);useEffect(()=>{if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})},[]);
useEffect(()=>{if(!timerRunning)return;const id=setInterval(()=>setTimerSeconds(s=>{if(s<=1){setTimerRunning(false);setToast("Study session complete. Take a short break and update your progress.");return 0}return s-1}),1000);return()=>clearInterval(id)},[timerRunning]);

const completed=tasks.filter(t=>t.done).length,doneMinutes=tasks.filter(t=>t.done).reduce((a,t)=>a+t.minutes,0),overall=Math.round(Object.values(progress).reduce((a,x)=>a+x.percent,0)/SUBJECTS.length);
const daysLeft=useMemo(()=>{const d=new Date("2027-02-01T00:00:00+05:30");return Math.max(0,Math.ceil((d-new Date())/86400000))},[]);
const recommendation=useMemo(()=>{const incomplete=tasks.find(t=>!t.done);if(incomplete)return{title:incomplete.title,detail:incomplete.subject+" · "+incomplete.minutes+" min"};const weak=[...SUBJECTS].sort((a,b)=>(progress[a]?.percent||0)-(progress[b]?.percent||0))[0];return{title:"Revise "+weak,detail:(progress[weak]?.percent||0)+"% progress · start with PYQs"}} , [tasks,progress]);

const toggleTask=id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
const addTask=()=>{if(!newTask.trim())return;setTasks(ts=>[...ts,{id:Date.now(),title:newTask.trim(),subject:"General Aptitude",minutes:45,done:false}]);setNewTask("")};
const resetDay=()=>setTasks(ts=>ts.map(t=>({...t,done:false})));
const setSubject=(s,v)=>setProgress(p=>({...p,[s]:{percent:Number(v)}}));
const chooseTimer=m=>{setTimerPreset(m);setTimerSeconds(m*60);setTimerRunning(false)};
const timerText=`${String(Math.floor(timerSeconds/60)).padStart(2,"0")}:${String(timerSeconds%60).padStart(2,"0")}`;
const addMistake=()=>{if(!newMistake.topic.trim()||!newMistake.note.trim())return;setMistakes(ms=>[{id:Date.now(),...newMistake,createdAt:new Date().toLocaleDateString()},...ms]);setNewMistake({subject:"DBMS",topic:"",note:""});setToast("Mistake saved for revision.")};
const deleteMistake=id=>setMistakes(ms=>ms.filter(m=>m.id!==id));

const enableNotifications=async()=>{try{if(!("Notification"in window)){setToast("This browser does not support notifications.");return}const p=await Notification.requestPermission();if(p!=="granted"){setToast("Notification permission was not granted.");return}const sub=await registerPush();await fetch(API+"/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscription:sub,times})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).error||"Could not connect to push server.")});setNotifications(true);new Notification("PrepPulse",{body:"Mobile push reminders are connected."});setToast("Push reminders connected successfully.")}catch(e){setToast(e.message||"Could not enable push reminders.")}};
const testNotification=async()=>{setTesting(true);try{if(!("Notification"in window))throw new Error("This browser does not support notifications.");if(Notification.permission!=="granted")throw new Error("Enable mobile push first.");const sub=await getPushSubscription();if(!sub)throw new Error("No push subscription found. Tap Enable mobile push first.");if(!API)throw new Error("Notification backend is not configured.");const r=await fetch(API+"/api/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Test notification failed.");setToast("Test notification sent. Check your phone/browser notifications.")}catch(e){setToast(e.message||"Test notification failed.")}finally{setTesting(false)}};
const saveSettings=async()=>{setShowSettings(false);if(notifications&&API){try{const sub=await navigator.serviceWorker.ready.then(r=>r.pushManager.getSubscription());if(sub)await fetch(API+"/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscription:sub,times})})}catch{}}setToast("Settings saved.")};

return <div className="app">
<header className="topbar"><div className="brand"><div className="logo">P</div><div><strong>PrepPulse</strong><span>GATE 2027 study assistant</span></div></div><button className="iconBtn" onClick={()=>setShowSettings(true)}><Settings size={20}/></button></header>
<main>
<section className="hero"><div><p className="eyebrow">YOUR DAILY GATE COMMAND CENTER</p><h1>Stay consistent.<br/><em>Finish strong.</em></h1><p className="muted">One focused plan, smart revision, and daily reminders — without unnecessary noise.</p></div><div className="countdown"><span>GATE 2027</span><b>{daysLeft}</b><small>days to Feb 1</small></div></section>

<section className="stats"><div><Flame/><b>{completed}/{tasks.length}</b><span>tasks done</span></div><div><Clock3/><b>{doneMinutes}m</b><span>study completed</span></div><div><Target/><b>{overall}%</b><span>overall progress</span></div></section>

<section className="smart card"><div><p className="label">WHAT SHOULD I STUDY NOW?</p><h2>{recommendation.title}</h2><p className="muted">{recommendation.detail}</p></div><button className="primary smartBtn" onClick={()=>setToast("Focus now: "+recommendation.title)}><Brain size={17}/>Start focus</button></section>

<section className="grid">
<div className="card plan"><div className="cardHead"><div><p className="label">TODAY</p><h2>Your study target</h2></div><button className="ghost" onClick={resetDay}><RotateCcw size={16}/>Reset</button></div><div className="taskList">{tasks.map(t=><label className={`task ${t.done?"done":""}`} key={t.id}><button className="check" onClick={()=>toggleTask(t.id)}>{t.done?<CheckCircle2 size={21}/>:<span/>}</button><div><b>{t.title}</b><small>{t.subject} · {t.minutes} min</small></div></label>)}</div><div className="addTask"><input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Add a study task…"/><button onClick={addTask}><Plus size={18}/></button></div></div>

<div className="card timer"><div className="cardHead"><div><p className="label">FOCUS SESSION</p><h2>Study timer</h2></div><Clock3 size={20}/></div><div className="timerValue">{timerText}</div><div className="timerPresets">{[25,50,90].map(m=><button className={timerPreset===m?"selected":""} key={m} onClick={()=>chooseTimer(m)}>{m}m</button>)}</div><button className="primary" onClick={()=>setTimerRunning(v=>!v)}>{timerRunning?<><Pause size={17}/>Pause</>:<><Play size={17}/>Start session</>}</button><button className="ghost resetTimer" onClick={()=>chooseTimer(timerPreset)}><RotateCcw size={15}/>Reset timer</button></div>
</section>

<section className="grid">
<div className="card alerts"><div className="cardHead"><div><p className="label">ALERTS</p><h2>Three daily nudges</h2></div><Bell size={20}/></div>{[["Morning",times.morning,"Start today's target"],["Evening",times.evening,"Begin your second session"],["Night",times.night,"Close the day & update progress"]].map(([n,t,msg])=><div className="alertRow" key={n}><div className="alertIcon"><Bell size={17}/></div><div><b>{n}</b><small>{msg}</small></div><time>{t}</time></div>)}<button className="primary" onClick={enableNotifications}><Bell size={17}/>{notifications?"Push reminders connected":"Enable mobile push"}</button>{notifications&&<button className="ghost testBtn" onClick={testNotification} disabled={testing}><Bell size={16}/>{testing?"Sending test…":"Send Test Notification"}</button>}<p className="hint">Free Web Push. No paid SMS and no sound/alarm is required.</p></div>

<div className="card mistakes"><div className="cardHead"><div><p className="label">MISTAKE NOTEBOOK</p><h2>{mistakes.length} saved mistakes</h2></div><BookOpen size={20}/></div><p className="muted">Save the reason behind every wrong PYQ so revision targets the actual weakness.</p><button className="primary" onClick={()=>setShowMistakes(true)}><Plus size={17}/>Add mistake</button>{mistakes.slice(0,2).map(m=><div className="mistakeMini" key={m.id}><b>{m.subject} · {m.topic}</b><small>{m.note}</small></div>)}</div>
</section>

<section className="card"><div className="cardHead"><div><p className="label">PREPARATION</p><h2>Subject progress</h2></div><span className="pill">{overall}% average</span></div><div className="subjects">{SUBJECTS.map(s=><div className="subject" key={s}><div><span>{s}</span><b>{progress[s]?.percent||0}%</b></div><input type="range" min="0" max="100" value={progress[s]?.percent||0} onChange={e=>setSubject(s,e.target.value)}/></div>)}</div></section>

<section className="bottomGrid"><div className="card focus"><p className="label">DEADLINE</p><h2>Preparation target: February 1.</h2><p className="muted">Use February 1 as the completion deadline. Keep February 2–6 reserved for final revision, mistakes, formulas and exam readiness before GATE on February 7.</p></div><div className="card"><p className="label">QUICK SETUP</p><div className="setupLine"><Mail size={18}/><span>{email||"Add your email in Settings"}</span></div><div className="setupLine"><Clock3 size={18}/><span>IST · {times.morning} / {times.evening} / {times.night}</span></div></div></section>
</main>

{showMistakes&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowMistakes(false)}><div className="modal"><div className="modalHead"><div><p className="label">MISTAKE NOTEBOOK</p><h2>Add a PYQ mistake</h2></div><button className="iconBtn" onClick={()=>setShowMistakes(false)}><X size={20}/></button></div><label>Subject<select value={newMistake.subject} onChange={e=>setNewMistake(m=>({...m,subject:e.target.value}))}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></label><label>Topic<input value={newMistake.topic} onChange={e=>setNewMistake(m=>({...m,topic:e.target.value}))} placeholder="e.g. Normalization"/></label><label>Why was it wrong?<textarea value={newMistake.note} onChange={e=>setNewMistake(m=>({...m,note:e.target.value}))} placeholder="Write the concept or mistake to remember…"/></label><button className="primary" onClick={addMistake}>Save mistake</button><div className="mistakeList">{mistakes.map(m=><div className="mistakeItem" key={m.id}><div><b>{m.subject} · {m.topic}</b><small>{m.note}</small></div><button className="iconBtn" onClick={()=>deleteMistake(m.id)}><Trash2 size={16}/></button></div>)}</div></div></div>}

{showSettings&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowSettings(false)}><div className="modal"><div className="modalHead"><div><p className="label">SETTINGS</p><h2>PrepPulse alerts</h2></div><button className="iconBtn" onClick={()=>setShowSettings(false)}><X size={20}/></button></div><label>Email for daily reminders<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><div className="timeGrid">{Object.entries(times).map(([k,v])=><label key={k}>{k}<input type="time" value={v} onChange={e=>setTimes(t=>({...t,[k]:e.target.value}))}/></label>)}</div><div className="notice"><Mail size={18}/><span>Morning is 4:00 AM. Feb 1 is the preparation completion target; Feb 2–6 is reserved for final revision before the Feb 7 exam.</span></div><button className="primary" onClick={saveSettings}>Save settings</button></div></div>}
{toast&&<button className="toast" onClick={()=>setToast("")}>{toast}</button>}
</div>
}
export default App;