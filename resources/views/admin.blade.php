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
    <div class="nav-section">VSB Editor</div>
    <div class="nav-item active" onclick="sw('editor-auth')">Editor Auth</div>
    <div class="nav-item" onclick="sw('projects')">Projects</div>
    <div class="nav-item" onclick="sw('snapshots')">Snapshots</div>
    <div class="nav-section">Platform Admin</div>
    <div class="nav-item" onclick="sw('svc-auth')">Service Admin Auth</div>
    <div class="nav-item" onclick="sw('plans')">Plans</div>
    <div class="nav-item" onclick="sw('tenants')">Tenants</div>
    <div class="nav-item" onclick="sw('flags')">Feature Flags</div>
    <div class="nav-item" onclick="sw('audit')">Audit Logs</div>
    <div class="nav-item" onclick="sw('stats')">Platform Stats</div>
    <div class="nav-section">Tenant Admin</div>
    <div class="nav-item" onclick="sw('ta-auth')">Tenant Auth</div>
    <div class="nav-item" onclick="sw('idol-profile')">Idol Profile</div>
    <div class="nav-item" onclick="sw('blog-mgmt')">Blog</div>
    <div class="nav-item" onclick="sw('merch-mgmt')">Merch</div>
    <div class="nav-item" onclick="sw('events-mgmt')">Events</div>
    <div class="nav-item" onclick="sw('membership-mgmt')">Membership</div>
    <div class="logout-wrap">
        <form method="POST" action="/logout">@csrf<button type="submit">Log out</button></form>
    </div>
</nav>
<div class="main">
    <div class="topbar">
        <h1 id="ptitle">Editor Auth</h1>
        <div class="token-badge" id="tbadge">No token</div>
    </div>
    <div class="panels">
        <div class="req-panel">

            <!-- EDITOR AUTH -->
            <div id="p-editor-auth" class="panel active">
                <div class="box"><div class="box-title">Editor / Admin Login</div>
                    <label>Email</label><input id="ea-em" value="admin@example.com">
                    <label>Password</label><input id="ea-pw" type="password" value="password">
                    <div class="row">
                        <button class="btn bp" onclick="api('POST','/api/auth/login',{email:g('ea-em'),password:g('ea-pw')},null,saveToken)">Login</button>
                        <button class="btn bg" onclick="api('GET','/api/auth/me',null,tok())">Me</button>
                        <button class="btn bd" onclick="api('POST','/api/auth/logout',null,tok())">Logout</button>
                    </div>
                </div>
            </div>

            <!-- PROJECTS -->
            <div id="p-projects" class="panel">
                <div class="box"><div class="box-title">Projects</div>
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/projects',null,tok())">List</button></div>
                    <label>Name</label><input id="pj-name" value="My Test Site">
                    <div class="row"><button class="btn bp" onclick="api('POST','/api/projects',{name:g('pj-name')},tok())">Create</button></div>
                </div>
                <div class="box"><div class="box-title">Single Project</div>
                    <label>Project ID</label><input id="pj-id" placeholder="uuid">
                    <div class="row">
                        <button class="btn bg" onclick="api('GET','/api/projects/'+g('pj-id'),null,tok())">Get</button>
                        <button class="btn bd" onclick="api('DELETE','/api/projects/'+g('pj-id'),null,tok())">Delete</button>
                    </div>
                </div>
            </div>

            <!-- SNAPSHOTS -->
            <div id="p-snapshots" class="panel">
                <div class="box"><div class="box-title">Snapshots</div>
                    <label>Project ID</label><input id="sn-pid" placeholder="uuid">
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/projects/'+g('sn-pid')+'/snapshots',null,tok())">List</button></div>
                    <label>Version</label><input id="sn-ver" value="1">
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/projects/'+g('sn-pid')+'/snapshots/'+g('sn-ver'),null,tok())">Get Version</button></div>
                    <label>Graph JSON</label><textarea id="sn-graph">{"nodes":[],"edges":[]}</textarea>
                    <div class="row">
                        <button class="btn bp" onclick="api('POST','/api/projects/'+g('sn-pid')+'/snapshots',{graph_data:JSON.parse(g('sn-graph'))},tok())">Save Snapshot</button>
                        <button class="btn bs" onclick="api('POST','/api/projects/'+g('sn-pid')+'/compile',{graph_data:JSON.parse(g('sn-graph')),compiled_html:'<html></html>',compiled_css:'',compiled_js:''},tok())">Compile</button>
                        <button class="btn bg" onclick="api('POST','/api/projects/'+g('sn-pid')+'/publish',{},tok())">Publish</button>
                    </div>
                </div>
            </div>

            <!-- SERVICE ADMIN AUTH -->
            <div id="p-svc-auth" class="panel">
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

            <!-- TENANT AUTH -->
            <div id="p-ta-auth" class="panel">
                <div class="box"><div class="box-title">Tenant Admin Login</div>
                    <label>X-Tenant-ID</label><input id="ta-tid" placeholder="uuid" oninput="setTid(this.value)">
                    <label>Email</label><input id="ta-em" value="admin@sakura.com">
                    <label>Password</label><input id="ta-pw" type="password" value="password">
                    <div class="row">
                        <button class="btn bp" onclick="tenantLogin()">Login</button>
                        <button class="btn bd" onclick="tm('POST','auth/logout',{})">Logout</button>
                    </div>
                </div>
            </div>

            <!-- IDOL PROFILE -->
            <div id="p-idol-profile" class="panel">
                <div class="box"><div class="box-title">Idol Profile</div>
                    <div class="row"><button class="btn bg" onclick="tm('GET','idol/profile',null)">Get Profile</button></div>
                    <label>Stage Name</label><input id="ip-sn" value="Sakura">
                    <label>Bio</label><textarea id="ip-bio">K-pop idol from Seoul.</textarea>
                    <label>Status</label>
                    <select id="ip-st"><option>ACTIVE</option><option>HIATUS</option><option>RETIRED</option></select>
                    <div class="row"><button class="btn bp" onclick="tm('PUT','idol/profile',{stage_name:g('ip-sn'),bio:g('ip-bio'),status:g('ip-st')})">Update</button></div>
                    <label>Social Platform</label>
                    <select id="ip-pl"><option>INSTAGRAM</option><option>TWITTER</option><option>YOUTUBE</option><option>TIKTOK</option><option>WEIBO</option></select>
                    <label>URL</label><input id="ip-url" value="https://instagram.com/sakura">
                    <div class="row"><button class="btn bg" onclick="tm('POST','idol/social-links',{platform:g('ip-pl'),url:g('ip-url')})">Upsert Link</button></div>
                    <div class="row">
                        <button class="btn bg" onclick="tm('GET','idol/groups',null)">List Groups</button>
                        <button class="btn bg" onclick="tm('POST','idol/groups',{group_name:'Sakura Unit'})">Create Group</button>
                    </div>
                </div>
            </div>

            <!-- BLOG MGMT -->
            <div id="p-blog-mgmt" class="panel">
                <div class="box"><div class="box-title">Blog Management</div>
                    <div class="row"><button class="btn bg" onclick="tm('GET','blog/posts',null)">List Posts</button></div>
                    <label>Title</label><input id="bl-title" value="Hello Fans!">
                    <label>Content</label><textarea id="bl-content">Welcome to our blog.</textarea>
                    <label>Visibility</label>
                    <select id="bl-vis"><option>PUBLIC</option><option>SUBSCRIBERS_ONLY</option><option>PAID_ONLY</option></select>
                    <div class="row"><button class="btn bp" onclick="tm('POST','blog/posts',{title:g('bl-title'),content:g('bl-content'),visibility:g('bl-vis'),status:'DRAFT'})">Create Post</button></div>
                    <label>Post ID</label><input id="bl-pid" placeholder="uuid">
                    <div class="row"><button class="btn bs" onclick="tm('POST','blog/posts/'+g('bl-pid')+'/publish',{})">Publish</button></div>
                </div>
            </div>

            <!-- MERCH MGMT -->
            <div id="p-merch-mgmt" class="panel">
                <div class="box"><div class="box-title">Merch Management</div>
                    <div class="row">
                        <button class="btn bg" onclick="tm('GET','merch/products',null)">List Products</button>
                        <button class="btn bg" onclick="tm('GET','merch/orders',null)">List Orders</button>
                    </div>
                    <label>Product Name</label><input id="mc-name" value="Sakura Hoodie">
                    <label>Price</label><input id="mc-price" value="49.99">
                    <div class="row"><button class="btn bp" onclick="createProduct()">Create Product</button></div>
                    <label>Order ID (ship)</label><input id="mc-oid" placeholder="uuid">
                    <label>Tracking No.</label><input id="mc-track" value="JPN123456789">
                    <label>Carrier</label><input id="mc-carrier" value="Japan Post">
                    <div class="row"><button class="btn bs" onclick="tm('POST','merch/orders/'+g('mc-oid')+'/ship',{tracking_number:g('mc-track'),carrier:g('mc-carrier')})">Ship Order</button></div>
                </div>
            </div>

            <!-- EVENTS MGMT -->
            <div id="p-events-mgmt" class="panel">
                <div class="box"><div class="box-title">Events</div>
                    <div class="row"><button class="btn bg" onclick="tm('GET','events/',null)">List Events</button></div>
                    <label>Title</label><input id="ev-title" value="Summer Concert">
                    <label>Type</label>
                    <select id="ev-type"><option>CONCERT</option><option>FANSIGN</option><option>LIVESTREAM</option><option>ANNIVERSARY</option><option>COMEBACK</option></select>
                    <label>Start Datetime</label><input id="ev-start" value="2026-09-01T19:00:00Z">
                    <label>Location</label><input id="ev-loc" value="Tokyo Dome">
                    <label>Visibility</label>
                    <select id="ev-vis"><option>PUBLIC</option><option>SUBSCRIBERS_ONLY</option><option>PAID_ONLY</option></select>
                    <div class="row"><button class="btn bp" onclick="tm('POST','events/',{title:g('ev-title'),event_type:g('ev-type'),start_datetime:g('ev-start'),location:g('ev-loc'),visibility:g('ev-vis')})">Create Event</button></div>
                </div>
            </div>

            <!-- MEMBERSHIP MGMT -->
            <div id="p-membership-mgmt" class="panel">
                <div class="box"><div class="box-title">Membership Tiers</div>
                    <div class="row"><button class="btn bg" onclick="tm('GET','membership/tiers',null)">List Tiers</button></div>
                    <label>Tier Name</label><input id="mt-name" value="Star Fan">
                    <label>Price</label><input id="mt-price" value="9.99">
                    <label>Billing Cycle</label>
                    <select id="mt-cycle"><option>MONTHLY</option><option>YEARLY</option><option>LIFETIME</option></select>
                    <div class="row"><button class="btn bp" onclick="tm('POST','membership/tiers',{name:g('mt-name'),price:parseFloat(g('mt-price')),billing_cycle:g('mt-cycle'),perks:[{description:'Exclusive posts',perk_type:'EXCLUSIVE_CONTENT'}]})">Create Tier</button></div>
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
let _tid = null, _ttok = null;

const g  = id => document.getElementById(id)?.value ?? '';
const el = id => document.getElementById(id);
const tok = () => _tok;
const setTid = v => { _tid = v; };

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

async function tm(method,path,body){
    const tid=_tid||g('ta-tid'); const tok2=_ttok||_tok;
    if(!tid){el('rb').textContent='Set X-Tenant-ID in the Tenant Auth panel first.';return;}
    const t0=Date.now(); const url='/api/manage/'+path;
    el('rm').textContent=method; el('ru').textContent=url+' [tid:'+tid.substring(0,8)+'...]';
    el('rs').textContent='...'; el('rb').textContent='Loading...';
    const h={'Content-Type':'application/json','Accept':'application/json','X-Tenant-ID':tid};
    if(tok2)h['Authorization']='Bearer '+tok2;
    try{
        const r=await fetch(url,{method,headers:h,body:body?JSON.stringify(body):undefined});
        const d=await r.json();
        el('rs').textContent=r.status; el('rs').className=r.ok?'ok':'err';
        el('rt').textContent=(Date.now()-t0)+'ms';
        el('rb').textContent=JSON.stringify(d,null,2);
    }catch(e){el('rb').textContent=String(e);}
}

async function tenantLogin(){
    const tid=g('ta-tid'); _tid=tid;
    const t0=Date.now(); const url='/api/manage/auth/login';
    const h={'Content-Type':'application/json','Accept':'application/json','X-Tenant-ID':tid};
    try{
        const r=await fetch(url,{method:'POST',headers:h,body:JSON.stringify({email:g('ta-em'),password:g('ta-pw')})});
        const d=await r.json();
        if(d.token){_ttok=d.token;_tok=d.token;saveToken(d);}
        el('rs').textContent=r.status; el('rs').className=r.ok?'ok':'err';
        el('rt').textContent=(Date.now()-t0)+'ms'; el('rb').textContent=JSON.stringify(d,null,2);
    }catch(e){el('rb').textContent=String(e);}
}

function auditQuery(){
    let url='/api/admin/audit-logs?per_page=20';
    const tid=g('au-tid'); const act=g('au-act');
    if(tid)url+='&tenant_id='+tid; if(act)url+='&action='+act;
    api('GET',url,null,tok());
}

function createProduct(){
    tm('POST','merch/products',{
        name:g('mc-name'),base_price:parseFloat(g('mc-price')),currency:'USD',
        variants:[
            {sku:'SKU-'+Date.now()+'-M',price:parseFloat(g('mc-price')),stock_qty:20,attributes:{size:'M'}},
            {sku:'SKU-'+Date.now()+'-L',price:parseFloat(g('mc-price')),stock_qty:15,attributes:{size:'L'}},
        ]
    });
}
</script>
</body>
</html>
