<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Idol1st — Admin Panel</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #0d0d10; --surface: #16161d; --border: #26263a;
            --accent: #7c6aff; --text: #e0e0f0; --muted: #666680;
            --success: #3dd68c; --error: #ff5f5f;
        }
        body { background: var(--bg); color: var(--text); font: 13px/1.5 'SF Mono', monospace; }
        .layout { display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 210px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1rem 0; overflow-y: auto; }
        .logo { padding: 0 1rem 1rem; font-size: 0.8rem; font-weight: 700; color: var(--accent); border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .nav-section { padding: 0.3rem 1rem; font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.5rem; }
        .nav-item { padding: 0.4rem 1rem; font-size: 0.78rem; cursor: pointer; color: var(--muted); border-left: 2px solid transparent; }
        .nav-item:hover { color: var(--text); }
        .nav-item.active { color: var(--accent); border-left-color: var(--accent); background: rgba(124,106,255,0.08); }
        .logout-wrap { margin-top: auto; padding: 1rem; border-top: 1px solid var(--border); }
        .logout-wrap button { width: 100%; padding: 0.4rem; background: transparent; border: 1px solid var(--border); border-radius: 5px; color: var(--muted); font-size: 0.72rem; cursor: pointer; }
        .logout-wrap button:hover { border-color: var(--error); color: var(--error); }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { padding: 0.6rem 1.2rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; background: var(--surface); }
        .topbar h1 { font-size: 0.85rem; font-weight: 600; }
        .token-badge { margin-left: auto; font-size: 0.68rem; color: var(--muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .panels { flex: 1; display: flex; overflow: hidden; }
        .req-panel { width: 320px; flex-shrink: 0; border-right: 1px solid var(--border); overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
        .resp-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .resp-bar { padding: 0.45rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.72rem; color: var(--muted); display: flex; align-items: center; gap: 0.6rem; }
        .ok { color: var(--success); } .err { color: var(--error); }
        pre { flex: 1; overflow: auto; padding: 1rem; font-size: 0.76rem; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
        .box { background: var(--surface); border: 1px solid var(--border); border-radius: 7px; padding: 0.7rem; }
        .box-title { font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 0.5rem; font-weight: 600; }
        label { display: block; font-size: 0.7rem; color: var(--muted); margin: 0.4rem 0 0.15rem; }
        input, textarea, select { width: 100%; padding: 0.4rem 0.55rem; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; color: var(--text); font: 12px monospace; outline: none; }
        input:focus, textarea:focus, select:focus { border-color: var(--accent); }
        textarea { resize: vertical; min-height: 70px; }
        .row { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.45rem; }
        .btn { padding: 0.38rem 0.85rem; border-radius: 5px; border: none; font-size: 0.74rem; font-weight: 600; cursor: pointer; }
        .btn:hover { opacity: 0.82; }
        .bp { background: var(--accent); color: #fff; }
        .bs { background: var(--success); color: #000; }
        .bd { background: var(--error); color: #fff; }
        .bg { background: var(--border); color: var(--text); }
        .panel { display: none; }
        .panel.active { display: flex; flex-direction: column; gap: 0.6rem; }
    </style>
</head>
<body>
<div class="layout">
<nav class="sidebar">
    <div class="logo">Idol1st Admin</div>
    <div class="nav-section">Platform Admin</div>
    <div class="nav-item active" onclick="sw('svc-auth')">Service Admin Auth</div>
    <div class="nav-item" onclick="sw('plans')">Plans</div>
    <div class="nav-item" onclick="sw('tenants')">Tenants</div>
    <div class="nav-item" onclick="sw('flags')">Feature Flags</div>
    <div class="nav-item" onclick="sw('audit')">Audit Logs</div>
    <div class="nav-item" onclick="sw('stats')">Platform Stats</div>
    <div class="logout-wrap">
        <form method="POST" action="/logout">@csrf<button type="submit">Log out</button></form>
    </div>
</nav>
<div class="main">
    <div class="topbar">
        <h1 id="ptitle">Service Admin Auth</h1>
        <div class="token-badge" id="tbadge">No token</div>
    </div>
    <div class="panels">
        <div class="req-panel">

            <!-- SERVICE ADMIN AUTH -->
            <div id="p-svc-auth" class="panel active">
                <div class="box"><div class="box-title">Service Admin Login</div>
                    <label>Email</label><input id="sa-em" value="superadmin@idol1st.com">
                    <label>Password</label><input id="sa-pw" type="password" value="password">
                    <div class="row">
                        <button class="btn bp" onclick="api('POST','/api/admin/auth/login',{email:g('sa-em'),password:g('sa-pw')},null,saveToken)">Login</button>
                        <button class="btn bd" onclick="api('POST','/api/admin/auth/logout',null,tok())">Logout</button>
                    </div>
                </div>
            </div>

            <!-- PLANS -->
            <div id="p-plans" class="panel">
                <div class="box"><div class="box-title">Plans</div>
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/admin/plans',null,tok())">List Plans</button></div>
                    <label>Name</label><input id="pl-name" value="Starter">
                    <label>Price</label><input id="pl-price" value="9.99">
                    <label>Billing Cycle</label>
                    <select id="pl-cycle"><option>MONTHLY</option><option>YEARLY</option><option>LIFETIME</option></select>
                    <div class="row"><button class="btn bp" onclick="api('POST','/api/admin/plans',{name:g('pl-name'),price:parseFloat(g('pl-price')),billing_cycle:g('pl-cycle')},tok())">Create Plan</button></div>
                </div>
            </div>

            <!-- TENANTS -->
            <div id="p-tenants" class="panel">
                <div class="box"><div class="box-title">Tenants</div>
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/admin/tenants',null,tok())">List</button></div>
                    <label>Name</label><input id="tn-name" value="Sakura Fan Site">
                    <label>Plan ID</label><input id="tn-plan" placeholder="uuid">
                    <div class="row"><button class="btn bp" onclick="api('POST','/api/admin/tenants',{name:g('tn-name'),plan_id:g('tn-plan')},tok())">Create</button></div>
                </div>
                <div class="box"><div class="box-title">Manage Tenant</div>
                    <label>Tenant ID</label><input id="tn-id" placeholder="uuid">
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/admin/tenants/'+g('tn-id'),null,tok())">Get</button></div>
                    <label>Suspend Reason</label><input id="tn-reason" value="Terms violation">
                    <div class="row">
                        <button class="btn bd" onclick="api('POST','/api/admin/tenants/'+g('tn-id')+'/suspend',{reason:g('tn-reason')},tok())">Suspend</button>
                        <button class="btn bs" onclick="api('POST','/api/admin/tenants/'+g('tn-id')+'/reactivate',{},tok())">Reactivate</button>
                        <button class="btn bg" onclick="api('POST','/api/admin/tenants/'+g('tn-id')+'/impersonate',{},tok())">Impersonate</button>
                    </div>
                    <label>New Plan ID</label><input id="tn-newplan" placeholder="uuid">
                    <div class="row"><button class="btn bg" onclick="api('PUT','/api/admin/tenants/'+g('tn-id')+'/plan',{plan_id:g('tn-newplan')},tok())">Reassign Plan</button></div>
                </div>
            </div>

            <!-- FEATURE FLAGS -->
            <div id="p-flags" class="panel">
                <div class="box"><div class="box-title">Feature Flags</div>
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/admin/feature-flags',null,tok())">List Flags</button></div>
                    <label>Flag Name</label><input id="fl-name" value="merch_enabled">
                    <div class="row"><button class="btn bp" onclick="api('POST','/api/admin/feature-flags',{name:g('fl-name')},tok())">Create Flag</button></div>
                    <label>Flag ID</label><input id="fl-id" placeholder="uuid">
                    <label>Tenant ID</label><input id="fl-tid" placeholder="uuid">
                    <label>Enabled</label>
                    <select id="fl-en"><option value="true">true</option><option value="false">false</option></select>
                    <div class="row">
                        <button class="btn bg" onclick="api('PUT','/api/admin/feature-flags/'+g('fl-id')+'/tenants/'+g('fl-tid'),{is_enabled:g('fl-en')==='true'},tok())">Set Override</button>
                        <button class="btn bs" onclick="api('POST','/api/admin/feature-flags/'+g('fl-id')+'/rollout',{},tok())">Global Rollout</button>
                    </div>
                </div>
            </div>

            <!-- AUDIT LOGS -->
            <div id="p-audit" class="panel">
                <div class="box"><div class="box-title">Audit Logs</div>
                    <label>Tenant ID (optional)</label><input id="au-tid" placeholder="leave blank for all">
                    <label>Action (optional)</label><input id="au-act" placeholder="e.g. TENANT_SUSPENDED">
                    <div class="row"><button class="btn bp" onclick="auditQuery()">Query</button></div>
                </div>
            </div>

            <!-- STATS -->
            <div id="p-stats" class="panel">
                <div class="box"><div class="box-title">Platform Stats</div>
                    <div class="row">
                        <button class="btn bp" onclick="api('GET','/api/admin/stats',null,tok())">Stats</button>
                        <button class="btn bg" onclick="api('GET','/api/admin/users',null,tok())">Users</button>
                        <button class="btn bg" onclick="api('GET','/api/admin/projects',null,tok())">Projects</button>
                    </div>
                </div>
            </div>

        </div><!-- end req-panel -->

        <div class="resp-panel">
            <div class="resp-bar">
                <span id="rm" style="color:var(--accent)">—</span>
                <span id="ru" style="color:var(--muted)"></span>
                <span id="rs"></span>
                <span id="rt" style="color:var(--muted);margin-left:auto"></span>
            </div>
            <pre id="rb">Make a request to see the response.</pre>
        </div>
    </div>
</div>
</div>
<script>
// ── State ──────────────────────────────────────────────────────────
let _tok = @json($sanctumToken ?? null);

const g  = id => document.getElementById(id)?.value ?? '';
const el = id => document.getElementById(id);
const tok = () => _tok;

// Seed the token badge from the session token (if any)
if (_tok) {
    el('tbadge').textContent = 'Token: ' + _tok.substring(0, 36) + '...';
}

function saveToken(d) {
    _tok = d.token ?? _tok;
    el('tbadge').textContent = _tok ? 'Token: ' + _tok.substring(0, 36) + '...' : 'No token';
}

function sw(name){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el('p-'+name).classList.add('active');
    document.querySelector(`[onclick="sw('${name}')"]`).classList.add('active');
    el('ptitle').textContent=document.querySelector(`[onclick="sw('${name}')"]`).textContent.trim();
}

async function api(method,url,body,bearer,cb){
    const t0=Date.now();
    el('rm').textContent=method; el('ru').textContent=url; el('rs').textContent='...'; el('rb').textContent='Loading...';
    const h={'Content-Type':'application/json','Accept':'application/json'};
    if(bearer) h['Authorization']='Bearer '+bearer;
    try{
        const r=await fetch(url,{method,headers:h,body:body?JSON.stringify(body):undefined});
        const d=await r.json();
        el('rs').textContent=r.status; el('rs').className=r.ok?'ok':'err';
        el('rt').textContent=(Date.now()-t0)+'ms';
        el('rb').textContent=JSON.stringify(d,null,2);
        if(cb&&r.ok)cb(d);
    }catch(e){el('rs').textContent='ERR';el('rs').className='err';el('rb').textContent=String(e);}
}

function auditQuery(){
    let url='/api/admin/audit-logs?per_page=20';
    const tid=g('au-tid'); const act=g('au-act');
    if(tid)url+='&tenant_id='+tid; if(act)url+='&action='+act;
    api('GET',url,null,tok());
}
</script>
</body>
</html>
