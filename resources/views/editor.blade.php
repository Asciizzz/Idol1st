<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Idol1st — Tenant Panel</title>
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

        /* ── Editor-specific layout ──────────────────────────────── */
        .editor-layout { display: none; flex: 1; flex-direction: column; overflow: hidden; }
        .editor-layout.active { display: flex; }
        .editor-toolbar { padding: 0.6rem 1rem; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .editor-toolbar select { width: auto; min-width: 220px; }
        .editor-toolbar .spacer { flex: 1; }
        .dev-toggle { font-size: 0.68rem; color: var(--muted); cursor: pointer; user-select: none; }
        .dev-toggle:hover { color: var(--text); }
        .editor-body { flex: 1; display: flex; overflow: hidden; }
        .editor-dev-panel { width: 320px; flex-shrink: 0; border-right: 1px solid var(--border); overflow-y: auto; padding: 0.75rem; display: none; flex-direction: column; gap: 0.6rem; }
        .editor-dev-panel.open { display: flex; }
        .editor-canvas-wrap { flex: 1; position: relative; overflow: hidden; background: #000; }
        .editor-canvas-wrap #vsb-app { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .editor-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 0.8rem; text-align: center; padding: 2rem; }
    </style>
</head>
<body>
<div class="layout">
<nav class="sidebar">
    <div class="logo">Idol1st Tenant</div>
    <div class="nav-section">Editor</div>
    <div class="nav-item" onclick="sw('editor')">Editor</div>
    <div class="nav-section">Tenant Admin</div>
    <div class="nav-item active" onclick="sw('ta-auth')">Tenant Auth</div>
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
        <h1 id="ptitle">Tenant Auth</h1>
        <div class="token-badge" id="tbadge">No token</div>
    </div>

    <!-- ── EDITOR (full layout, separate from the req/resp panel pattern) ── -->
    <div class="editor-layout" id="editor-layout">
        <div class="editor-toolbar">
            <label style="margin:0;display:inline">Project</label>
            <select id="ed-project-select" onchange="loadSelectedProject()">
                <option value="">Select a project…</option>
            </select>
            <button class="btn bg" onclick="refreshProjectList()">Refresh</button>
            <div class="spacer"></div>
            <span class="dev-toggle" onclick="toggleDevPanel()">⚙ Dev tools</span>
        </div>
        <div class="editor-body">
            <div class="editor-dev-panel" id="editor-dev-panel">
                <div class="box"><div class="box-title">Projects</div>
                    <div class="row"><button class="btn bg" onclick="api('GET','/api/projects',null,tok(),renderProjectList)">List</button></div>
                    <label>Name</label><input id="pj-name" value="My Test Site">
                    <div class="row"><button class="btn bp" onclick="api('POST','/api/projects',{name:g('pj-name')},tok(),renderProjectList)">Create</button></div>
                </div>
                <div class="box"><div class="box-title">Single Project</div>
                    <label>Project ID</label><input id="pj-id" placeholder="uuid">
                    <div class="row">
                        <button class="btn bg" onclick="api('GET','/api/projects/'+g('pj-id'),null,tok())">Get</button>
                        <button class="btn bd" onclick="api('DELETE','/api/projects/'+g('pj-id'),null,tok(),refreshProjectList)">Delete</button>
                    </div>
                </div>
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
                <div class="box"><div class="box-title">Response</div>
                    <pre id="ed-rb" style="flex:none;max-height:220px;font-size:0.68rem;">—</pre>
                </div>
            </div>
            <div class="editor-canvas-wrap">
                <div class="editor-empty" id="editor-empty">Select a project above to load it into the canvas.</div>
                <div id="vsb-app"></div>
            </div>
        </div>
    </div>

    <!-- ── REQ/RESP PANEL LAYOUT (everything except Editor) ── -->
    <div class="panels" id="std-panels">
        <div class="req-panel">

            <!-- TENANT AUTH -->
            <div id="p-ta-auth" class="panel active">
                <div class="box"><div class="box-title">Tenant Admin Login</div>
                    <label>Email</label><input id="ta-em" value="admin@sakura.com">
                    <label>Password</label><input id="ta-pw" type="password" value="password">
                    <div class="row">
                        <button class="btn bp" onclick="tenantLogin()">Login</button>
                        <button class="btn bd" onclick="api('POST', '/api/auth/logout', {}, tok())">Logout</button>
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
let _vsbLoaded = false;
let _vsbLoaded = false;

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
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelector(`[onclick="sw('${name}')"]`).classList.add('active');
    el('ptitle').textContent=document.querySelector(`[onclick="sw('${name}')"]`).textContent.trim();

    if (name === 'editor') {
        el('std-panels').style.display = 'none';
        el('editor-layout').classList.add('active');
        if (!_vsbLoaded) refreshProjectList();
        return;
    }

    el('editor-layout').classList.remove('active');
    el('std-panels').style.display = 'flex';
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    el('p-'+name).classList.add('active');
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

    const tok2 = _tok;

    const t0=Date.now();
    const url='/api/manage/'+path;

    el('rm').textContent=method;
    el('ru').textContent=url;
    el('rs').textContent='...';
    el('rb').textContent='Loading...';


    const h={
        'Content-Type':'application/json',
        'Accept':'application/json'
    };


    if(tok2){
        h['Authorization']='Bearer '+tok2;
    }


    try{

        const r=await fetch(url,{
            method,
            headers:h,
            body:body?JSON.stringify(body):undefined
        });


        const d=await r.json();


        el('rs').textContent=r.status;
        el('rs').className=r.ok?'ok':'err';

        el('rt').textContent=(Date.now()-t0)+'ms';

        el('rb').textContent=
            JSON.stringify(d,null,2);


    }catch(e){

        el('rb').textContent=String(e);

    }
}

async function tenantLogin(){

    const t0=Date.now();

    const url='/api/auth/login';


    const h={
        'Content-Type':'application/json',
        'Accept':'application/json'
    };


    try{

        const r=await fetch(url,{
            method:'POST',
            headers:h,
            body:JSON.stringify({
                email:g('ta-em'),
                password:g('ta-pw')
            })
        });


        const d=await r.json();


        if(d.token){

            _tok=d.token;

            saveToken(d);

        }


        el('rs').textContent=r.status;
        el('rs').className=r.ok?'ok':'err';

        el('rt').textContent=(Date.now()-t0)+'ms';

        el('rb').textContent=
            JSON.stringify(d,null,2);


    }catch(e){

        el('rb').textContent=String(e);

    }
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

// ── Editor panel ───────────────────────────────────────────────────
function toggleDevPanel(){
    el('editor-dev-panel').classList.toggle('open');
}

async function editorApi(method,url,body,cb){
    const h={'Content-Type':'application/json','Accept':'application/json'};
    if(tok()) h['Authorization']='Bearer '+tok();
    const rbEl = el('ed-rb');
    if (rbEl) rbEl.textContent = 'Loading...';
    try{
        const r=await fetch(url,{method,headers:h,body:body?JSON.stringify(body):undefined});
        const d=await r.json();
        if (rbEl) rbEl.textContent = JSON.stringify(d,null,2);
        if (cb) cb(d, r.ok);
        return d;
    }catch(e){
        if (rbEl) rbEl.textContent = String(e);
    }
}

function refreshProjectList(){
    editorApi('GET','/api/projects',null,(d,ok)=>{ if(ok) renderProjectList(d); });
}

function renderProjectList(d){
    const list = Array.isArray(d) ? d : (d.data ?? d.projects ?? []);
    const sel = el('ed-project-select');
    const current = sel.value;
    sel.innerHTML = '<option value="">Select a project…</option>';
    list.forEach(p=>{
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name ?? p.id;
        sel.appendChild(opt);
    });
    if (current && list.some(p=>p.id===current)) sel.value = current;
}

async function loadSelectedProject(){
    const pid = g('ed-project-select');
    el('sn-pid').value = pid;
    el('pj-id').value = pid;
    if (!pid) {
        el('editor-empty').style.display = 'flex';
        return;
    }
    el('editor-empty').style.display = 'flex';
    el('editor-empty').textContent = 'Loading project…';

    const project = await editorApi('GET','/api/projects/'+pid,null);
    if (!project) return;

    const graph = project.graph_data ?? project.initial_graph ?? { nodes: [], edges: [] };
    mountVsb(graph, project);
}

function mountVsb(graph, draft){
    window.__VSB_GRAPH__ = graph;
    window.__VSB_DRAFT__  = draft;
    window.__VSB_TOKEN__  = tok();

    el('editor-empty').style.display = 'none';
    const mount = el('vsb-app');
    mount.innerHTML = '';

    if (!_vsbLoaded) {
        // vsb.js mounts itself into #vsb-app on first load, reading the
        // window.__VSB_* globals seeded above. Subsequent project switches
        // re-seed the globals and call vsb.js's exposed remount hook.
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '{{ Vite::asset("resources/js/vsb.js") }}';
        document.body.appendChild(script);
        _vsbLoaded = true;
    } else if (window.VSB && typeof window.VSB.remount === 'function') {
        window.VSB.remount(graph, draft);
    }
}
</script>
</body>
</html>
