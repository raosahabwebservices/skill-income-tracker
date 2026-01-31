// ===== SKILL TO INCOME TRACKER | PREMIUM STRICT SCRIPT =====

// ---------- STORAGE ----------
let skills = JSON.parse(localStorage.getItem("skills") || "[]");
let weeklyLogs = JSON.parse(localStorage.getItem("weeklyLogs") || "[]");
let actionPlans = JSON.parse(localStorage.getItem("actionPlans") || "[]");

// ---------- DOM ----------
const skillNameInput = document.getElementById('skillName');
const addSkillBtn = document.getElementById('addSkillBtn');
const skillsList = document.getElementById('skillsList');

const workedLayerInput = document.getElementById('workedLayer');
const effortLevelInput = document.getElementById('effortLevel');
const blockerReasonSelect = document.getElementById('blockerReason');
const notesInput = document.getElementById('notes');
const addLogBtn = document.getElementById('addLogBtn');
const logsList = document.getElementById('logsList');

const currentLayerEl = document.getElementById('currentLayer');
const readinessScoreEl = document.getElementById('readinessScore');
const flagsEl = document.getElementById('flags');
const verdictPanel = document.getElementById('verdict-panel');
const verdictEl = document.getElementById('verdict');

const actionPlanForm = document.getElementById('action-plan-form');
const backBtn = document.getElementById('back-btn');
const skipBtn = document.getElementById('skip-btn');
const nextBtn = document.getElementById('next-btn');

// ---------- SAVE ----------
function saveData() {
    localStorage.setItem("skills", JSON.stringify(skills));
    localStorage.setItem("weeklyLogs", JSON.stringify(weeklyLogs));
    localStorage.setItem("actionPlans", JSON.stringify(actionPlans));
}

// ---------- CORE ----------
function getActiveSkill() {
    return skills.find(s => s.active) || null;
}

function addSkillExclusive(name) {
    skills.forEach(s => s.active = false);
    skills.push({ skill_id: crypto.randomUUID(), skill_name: name, start_date: new Date().toISOString(), active: true });
    saveData();
}

// ---------- WEEK LOG ----------
function createWeeklyLog(skillId, layer, effort, blocker, notes) {
    return { log_id: crypto.randomUUID(), skill_id: skillId, week_start_date: new Date().toISOString(), worked_layer: layer, effort_level: effort, blocker_reason: blocker, notes: notes.slice(0,200) };
}

// ---------- DERIVED METRICS & VERDICT ----------
function layerWeight(layer) {
    return { KNOWLEDGE:10,PRACTICE:20,OUTPUT:30,REAL_USAGE:25,INCOME_ATTEMPT:15 }[layer] || 0;
}

function calculateMetrics(skillId) {
    const logs = weeklyLogs.filter(l => l.skill_id === skillId);
    if (!logs.length) return { current_layer:"-", readiness_score:"-", stuck_flag:false, illusion_flag:false, verdict:"-", severity:"low" };

    const currentLayer = logs[logs.length-1].worked_layer;
    let sameLayerWeeks = 0;
    for (let i = logs.length-1; i>=0; i--) { if(logs[i].worked_layer===currentLayer) sameLayerWeeks++; else break; }
    const incomeAttempts = logs.filter(l => l.worked_layer==="INCOME_ATTEMPT").length;
    const stuckFlag = sameLayerWeeks>=4;
    const illusionFlag = logs.length>=8 && incomeAttempts===0;
    const avgEffort = logs.reduce((a,b)=>a+b.effort_level,0)/logs.length;

    let verdict="Progressing normally.", severity="low";

    if(illusionFlag){ verdict="Skill illusion detected. Zero income attempts."; severity="critical"; }
    else if(stuckFlag){ verdict="Stuck in same layer 4+ weeks."; severity="high"; }
    else if(avgEffort>=4 && incomeAttempts===0){ verdict="High effort, no real-world use."; severity="medium"; }

    return { current_layer: currentLayer, readiness_score: layerWeight(currentLayer), stuck_flag:stuckFlag, illusion_flag:illusionFlag, verdict, severity, incomeAttempts };
}

// ---------- ENFORCEMENT ----------
let weekState = "OPEN"; // OPEN or LOCKED

function enforceVerdict(metrics){
    verdictPanel.className = metrics.severity;
    verdictPanel.style.display = "block";
    verdictPanel.textContent = metrics.verdict;

    if(metrics.severity==="medium" || metrics.severity==="high" || metrics.severity==="critical"){
        weekState = "LOCKED";
        showActionPlan();
    } else {
        weekState = "OPEN";
        hideActionPlan();
    }
}

function showActionPlan(){
    actionPlanForm.style.display="block";
    nextBtn.disabled=true;
}

function hideActionPlan(){
    actionPlanForm.style.display="none";
    nextBtn.disabled=false;
}

// ---------- UI ----------
function updateSkillUI(){
    skillsList.innerHTML="";
    skills.forEach(s=>{
        const li=document.createElement('li');
        li.textContent=s.skill_name+(s.active?" [ACTIVE]":"");
        skillsList.appendChild(li);
    });
    addSkillBtn.disabled = skills.length>=1;
    skillNameInput.disabled = skills.length>=1;
}

function updateLogsUI(){
    logsList.innerHTML="";
    weeklyLogs.forEach(l=>{
        const skill = skills.find(s=>s.skill_id===l.skill_id);
        const li=document.createElement('li');
        li.textContent=`[${skill?skill.skill_name:"?"}] ${l.week_start_date.slice(0,10)} | ${l.worked_layer} | Effort ${l.effort_level} | ${l.blocker_reason}`;
        logsList.appendChild(li);
    });
}

function updateMetricsUI(){
    const activeSkill=getActiveSkill();
    if(!activeSkill) return;
    const m = calculateMetrics(activeSkill.skill_id);
    currentLayerEl.textContent="Current Layer: "+m.current_layer;
    readinessScoreEl.textContent="Readiness Score: "+m.readiness_score;
    flagsEl.textContent=`Flags: stuck=${m.stuck_flag}, illusion=${m.illusion_flag}`;
    verdictEl.textContent=m.verdict;
    enforceVerdict(m);
}

// ---------- EVENTS ----------
addSkillBtn.addEventListener('click',()=>{
    const name=skillNameInput.value.trim();
    if(!name) return alert("Skill name required");
    addSkillExclusive(name);
    updateSkillUI();
    updateMetricsUI();
    skillNameInput.value="";
});

addLogBtn.addEventListener('click',()=>{
    if(weekState==="LOCKED"){ alert("Resolve verdict / action plan first."); return; }

    const activeSkill=getActiveSkill();
    if(!activeSkill) return alert("No active skill to log.");

    const layer=workedLayerInput.value;
    const effort=parseInt(effortLevelInput.value);
    const blocker=blockerReasonSelect.value;
    const notes=notesInput.value;

    if(!layer || !effort || !blocker) { alert("All fields required"); return; }

    weeklyLogs.push(createWeeklyLog(activeSkill.skill_id,layer,effort,blocker,notes));
    saveData();
    updateLogsUI();
    updateMetricsUI();

    workedLayerInput.value="";
    effortLevelInput.value="";
    blockerReasonSelect.value="";
    notesInput.value="";
});

// ---------- ACTION PLAN ----------
actionPlanForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    const form = e.target;
    const activeSkill = getActiveSkill();
    if(!activeSkill) return;

    actionPlans.push({
        skill_id: activeSkill.skill_id,
        next_week_goal: form.next_week_goal.value,
        risk_taken: form.risk_taken.value,
        measurable_outcome: form.measurable_outcome.value,
        date: new Date().toISOString()
    });

    saveData();
    form.reset();
    hideActionPlan();
    weekState="OPEN";
    updateMetricsUI();
});

// ---------- NAVIGATION BUTTONS ----------
backBtn.addEventListener('click',()=>{ alert("Back disabled in premium strict mode."); });
skipBtn.addEventListener('click',()=>{ alert("Skip disabled until action plan complete."); });
nextBtn.addEventListener('click',()=>{
    if(weekState==="LOCKED"){ alert("Complete action plan first."); return; }
    alert("Ready for next week!");
});

// ---------- INIT ----------
updateSkillUI();
updateLogsUI();
updateMetricsUI();

