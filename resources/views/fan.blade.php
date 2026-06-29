<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Idol1st — Fan Site Tester</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #0d0d10; --surface: #16161d; --border: #26263a;
            --accent: #ff6a9b; --text: #e0e0f0; --muted: #666680;
            --success: #3dd68c; --error: #ff5f5f;
        }
        body { background: var(--bg); color: var(--text); font: 13px/1.5 'SF Mono', monospace; }
        .layout { display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 210px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1rem 0; overflow-y: auto; }
        .logo { padding: 0 1rem 1rem; font-size: 0.8rem; font-weight: 700; color: var(--accent); border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .logo span { display: block; font-size: 0.6rem; color: var(--muted); font-weight: 400; margin-top: 0.2rem; }
        .nav-section { padding: 0.3rem 1rem; font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.5rem; }
        .nav-item { padding: 0.4rem 1rem; font-size: 0.78rem; cursor: pointer; color: var(--muted); border-left: 2px solid transparent; }
        .nav-item:hover { color: var(--text); }
        .nav-item.active { color: var(--accent); border-left-color: var(--accent); background: rgba(255,106,155,0.08); }
        .nav-links { margin-top: auto; padding: 0.75rem 1rem; border-top: 1px solid var(--border); font-size: 0.72rem; }
        .nav-links a { color: var(--muted); text-decoration: none; display: block; margin-bottom: 0.3rem; }
        .nav-links a:hover { color: var(--accent); }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { padding: 0.6rem 1.2rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; background: var(--surface); }
        .topbar h1 { font-size: 0.85rem; font-weight: 600; }
        .token-badge { margin-left: auto; font-size: 0.68rem; color: var(--muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tid-badge { font-size: 0.68rem; color: var(--muted); }
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
    <div class="logo">Fan Site Tester<span>Idol1st Platform</span></div>

    <div class="nav-section">Setup</div>
    <div class="nav-item active" onclick="sw('setup')">Tenant + Token</div>

    <div class="nav-section">Fan Auth</div>
    <div class="nav-item" onclick="sw('fan-auth')">Register / Login</div>
    <div class="nav-item" onclick="sw('fan-profile')">Profile & Addresses</div>

    <div class="nav-section">Membership</div>
    <div class="nav-item" onclick="sw('membership')">Tiers & Subscribe</div>

    <div class="nav-section">Blog</div>
    <div class="nav-item" onclick="sw('blog')">Browse & Interact</div>

    <div class="nav-section">Merch</div>
    <div class="nav-item" onclick="sw('merch')">Browse Products</div>
    <div class="nav-item" onclick="sw('cart')">Cart & Checkout</div>
    <div class="nav-item" onclick="sw('orders')">Orders</div>

    <div class="nav-section">Events</div>
    <div class="nav-item" onclick="sw('events')">Browse & RSVP</div>

    <div class="nav-section">Notifications</div>
    <div class="nav-item" onclick="sw('notifications')">Inbox & Preferences</div>

    <div class="nav-links">
        <a href="/admin">→ Admin Panel</a>
        <a href="/editor">→ VSB Editor</a>
    </div>
</nav>

<div class="main">
    <div class="topbar">
        <h1 id="ptitle">Setup</h1>
        <div class="tid-badge" id="tid-badge">No tenant set</div>
        <div class="token-badge" id="tbadge">No token</div>
    </div>
    <div class="panels">
        <div class="req-panel">

            <!-- SETUP -->
            <div id="p-setup" class="panel active">
                <div class="box"><div class="box-title">Tenant & Token Setup</div>
                    <p style="font-size:0.72rem;color:var(--muted);margin-bottom:0.5rem">
                        Set your Tenant ID here first. All fan API calls send this as X-Tenant-ID.
                    </p>
                    <label>X-Tenant-ID</label>
                    <input id="setup-tid" placeholder="paste tenant uuid here" oninput="setTid(this.value)">
                    <div class="row"><button class="btn bp" onclick="setTid(g('setup-tid'))">Set Tenant</button></div>
                </div>
                <div class="box"><div class="box-title">Manual Token Override</div>
                    <p style="font-size:0.72rem;color:var(--muted);margin-bottom:0.5rem">
                        Paste a fan token here if you already have one, or use the Fan Auth panel to get one.
                    </p>
                    <label>Bearer Token</label>
                    <input id="setup-token" placeholder="fan token">
                    <div class="row"><button class="btn bg" onclick="saveToken({token:g('setup-token')})">Save Token</button></div>
                </div>
            </div>

            <!-- FAN AUTH -->
            <div id="p-fan-auth" class="panel">
                <div class="box"><div class="box-title">Register</div>
                    <label>Email</label><input id="fa-em" value="fan@example.com">
                    <label>Username</label><input id="fa-un" value="sakurafan01">
                    <label>Display Name</label><input id="fa-dn" value="Sakura's #1 Fan">
                    <label>Password</label><input id="fa-pw" type="password" value="password">
                    <div class="row"><button class="btn bp" onclick="fan('POST','/api/auth/register',{email:g('fa-em'),username:g('fa-un'),display_name:g('fa-dn'),password:g('fa-pw'),password_confirmation:g('fa-pw')},null,saveToken)">Register</button></div>
                </div>
                <div class="box"><div class="box-title">Login</div>
                    <label>Email</label><input id="fl-em" value="fan@example.com">
                    <label>Password</label><input id="fl-pw" type="password" value="password">
                    <div class="row">
                        <button class="btn bp" onclick="fan('POST','/api/auth/login',{email:g('fl-em'),password:g('fl-pw')},null,saveToken)">Login</button>
                        <button class="btn bd" onclick="fan('POST','/api/auth/logout',{},tok())">Logout</button>
                    </div>
                </div>
            </div>

            <!-- FAN PROFILE -->
            <div id="p-fan-profile" class="panel">
                <div class="box"><div class="box-title">Profile</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/profile',null,tok())">Get Profile</button></div>
                    <label>Display Name</label><input id="fp-dn" value="Sakura's #1 Fan">
                    <div class="row"><button class="btn bp" onclick="fan('PATCH','/api/profile',{display_name:g('fp-dn')},tok())">Update Name</button></div>
                </div>
                <div class="box"><div class="box-title">Addresses</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/profile/addresses',null,tok())">List Addresses</button></div>
                    <label>Street</label><input id="addr-st" value="1-2-3 Shibuya">
                    <label>City</label><input id="addr-ci" value="Tokyo">
                    <label>Country</label><input id="addr-co" value="JP">
                    <label>Postal Code</label><input id="addr-pc" value="150-0002">
                    <div class="row"><button class="btn bp" onclick="fan('POST','/api/profile/addresses',{street:g('addr-st'),city:g('addr-ci'),country:g('addr-co'),postal_code:g('addr-pc'),is_default:true},tok())">Add Address</button></div>
                </div>
            </div>

            <!-- MEMBERSHIP -->
            <div id="p-membership" class="panel">
                <div class="box"><div class="box-title">Browse Tiers</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/membership/tiers',null,null)">List Tiers (public)</button></div>
                </div>
                <div class="box"><div class="box-title">Subscribe</div>
                    <label>Tier ID</label><input id="ms-tid" placeholder="uuid">
                    <label>Payment Method</label>
                    <select id="ms-pm"><option>STRIPE</option><option>PAYPAL</option><option>BANK_TRANSFER</option></select>
                    <div class="row"><button class="btn bp" onclick="fan('POST','/api/membership/subscribe',{tier_id:g('ms-tid'),payment_method:g('ms-pm'),auto_renew:true},tok())">Subscribe</button></div>
                </div>
                <div class="box"><div class="box-title">My Subscription</div>
                    <div class="row">
                        <button class="btn bg" onclick="fan('GET','/api/membership/subscription',null,tok())">View</button>
                        <button class="btn bd" onclick="fan('POST','/api/membership/subscription/cancel',{},tok())">Cancel</button>
                    </div>
                    <label>Upgrade to Tier ID</label><input id="ms-upgrade-tid" placeholder="uuid">
                    <div class="row"><button class="btn bs" onclick="fan('POST','/api/membership/subscription/upgrade',{tier_id:g('ms-upgrade-tid')},tok())">Upgrade</button></div>
                </div>
            </div>

            <!-- BLOG -->
            <div id="p-blog" class="panel">
                <div class="box"><div class="box-title">Browse Blog</div>
                    <div class="row">
                        <button class="btn bg" onclick="fan('GET','/api/blog/posts',null,tok())">List Posts</button>
                    </div>
                    <label>Category ID (optional)</label><input id="bl-cat" placeholder="uuid">
                    <label>Tag (optional)</label><input id="bl-tag" placeholder="e.g. announcement">
                    <div class="row"><button class="btn bg" onclick="blogList()">Filter & List</button></div>
                </div>
                <div class="box"><div class="box-title">Interact</div>
                    <label>Post ID</label><input id="bl-pid" placeholder="uuid">
                    <div class="row">
                        <button class="btn bg" onclick="fan('GET','/api/blog/posts/'+g('bl-pid'),null,tok())">Get Post</button>
                        <button class="btn bp" onclick="fan('POST','/api/blog/posts/'+g('bl-pid')+'/like',{},tok())">Toggle Like</button>
                    </div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/blog/posts/'+g('bl-pid')+'/comments',null,null)">Comments</button></div>
                    <label>Comment</label><textarea id="bl-comment">Great post!</textarea>
                    <div class="row"><button class="btn bs" onclick="fan('POST','/api/blog/posts/'+g('bl-pid')+'/comments',{content:g('bl-comment')},tok())">Post Comment</button></div>
                </div>
            </div>

            <!-- MERCH BROWSE -->
            <div id="p-merch" class="panel">
                <div class="box"><div class="box-title">Browse Products</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/merch/products',null,null)">All Products</button></div>
                    <label>Category ID (optional)</label><input id="mc-cat" placeholder="uuid">
                    <label>Limited Edition only?</label>
                    <select id="mc-ltd"><option value="">No</option><option value="1">Yes</option></select>
                    <div class="row"><button class="btn bg" onclick="merchBrowse()">Filter</button></div>
                </div>
            </div>

            <!-- CART -->
            <div id="p-cart" class="panel">
                <div class="box"><div class="box-title">Cart</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/merch/cart',null,tok())">View Cart</button></div>
                    <label>Product ID</label><input id="ca-pid" placeholder="uuid">
                    <label>Variant ID</label><input id="ca-vid" placeholder="uuid">
                    <label>Quantity</label><input id="ca-qty" value="1" type="number" min="1">
                    <div class="row"><button class="btn bp" onclick="fan('POST','/api/merch/cart/items',{product_id:g('ca-pid'),variant_id:g('ca-vid'),quantity:parseInt(g('ca-qty'))},tok())">Add to Cart</button></div>
                    <label>Cart Item ID (to update/remove)</label><input id="ca-iid" placeholder="uuid">
                    <label>New Quantity</label><input id="ca-nqty" value="2" type="number" min="1">
                    <div class="row">
                        <button class="btn bg" onclick="fan('PATCH','/api/merch/cart/items/'+g('ca-iid'),{quantity:parseInt(g('ca-nqty'))},tok())">Update Qty</button>
                        <button class="btn bd" onclick="fan('DELETE','/api/merch/cart/items/'+g('ca-iid'),null,tok())">Remove</button>
                    </div>
                </div>
                <div class="box"><div class="box-title">Checkout</div>
                    <label>Address ID</label><input id="co-aid" placeholder="uuid">
                    <label>Payment Method</label>
                    <select id="co-pm"><option>STRIPE</option><option>PAYPAL</option><option>BANK_TRANSFER</option></select>
                    <label>Transfer Network (if BANK_TRANSFER)</label>
                    <select id="co-tn">
                        <option value="">—</option>
                        <option>PROMPTPAY</option><option>DUITNOW</option>
                        <option>QRIS</option><option>PAYNOW</option>
                        <option>WECHATPAY</option><option>ALIPAY</option>
                    </select>
                    <div class="row"><button class="btn bs" onclick="checkout()">Checkout</button></div>
                </div>
            </div>

            <!-- ORDERS -->
            <div id="p-orders" class="panel">
                <div class="box"><div class="box-title">My Orders</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/merch/orders',null,tok())">List Orders</button></div>
                    <label>Order ID</label><input id="or-id" placeholder="uuid">
                    <div class="row">
                        <button class="btn bg" onclick="fan('GET','/api/merch/orders/'+g('or-id'),null,tok())">Get Order</button>
                        <button class="btn bd" onclick="fan('POST','/api/merch/orders/'+g('or-id')+'/cancel',{},tok())">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- EVENTS -->
            <div id="p-events" class="panel">
                <div class="box"><div class="box-title">Browse Events</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/events',null,tok())">All Events</button></div>
                    <label>Type Filter</label>
                    <select id="ev-type">
                        <option value="">All</option>
                        <option>CONCERT</option><option>FANSIGN</option>
                        <option>LIVESTREAM</option><option>ANNIVERSARY</option><option>COMEBACK</option>
                    </select>
                    <div class="row"><button class="btn bg" onclick="evBrowse()">Filter</button></div>
                </div>
                <div class="box"><div class="box-title">RSVP</div>
                    <label>Event ID</label><input id="ev-id" placeholder="uuid">
                    <label>Status</label>
                    <select id="ev-status"><option>GOING</option><option>INTERESTED</option><option>NOT_GOING</option></select>
                    <div class="row"><button class="btn bp" onclick="fan('POST','/api/events/'+g('ev-id')+'/rsvp',{status:g('ev-status')},tok())">Submit RSVP</button></div>
                </div>
            </div>

            <!-- NOTIFICATIONS -->
            <div id="p-notifications" class="panel">
                <div class="box"><div class="box-title">Inbox</div>
                    <div class="row">
                        <button class="btn bg" onclick="fan('GET','/api/notifications',null,tok())">All</button>
                        <button class="btn bg" onclick="fan('GET','/api/notifications?unread_only=1',null,tok())">Unread Only</button>
                        <button class="btn bs" onclick="fan('POST','/api/notifications/read-all',{},tok())">Mark All Read</button>
                    </div>
                </div>
                <div class="box"><div class="box-title">Preferences</div>
                    <div class="row"><button class="btn bg" onclick="fan('GET','/api/notifications/preferences',null,tok())">Get Preferences</button></div>
                    <p style="font-size:0.7rem;color:var(--muted);margin-top:0.5rem">Disable NEW_POST notifications:</p>
                    <div class="row"><button class="btn bd" onclick="fan('PUT','/api/notifications/preferences',[{type:'NEW_POST',is_enabled:false,channel:'IN_APP'}],tok())">Disable NEW_POST</button></div>
                    <div class="row"><button class="btn bs" onclick="fan('PUT','/api/notifications/preferences',[{type:'NEW_POST',is_enabled:true,channel:'IN_APP'}],tok())">Enable NEW_POST</button></div>
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
let _tok=null, _tid=null;
const g=id=>document.getElementById(id)?.value??'';
const el=id=>document.getElementById(id);
const tok=()=>_tok;

function setTid(v){
    _tid=v;
    el('tid-badge').textContent=v?'Tenant: '+v.substring(0,12)+'...':'No tenant set';
}

function saveToken(d){
    _tok=d.token??_tok;
    el('tbadge').textContent=_tok?'Fan Token: '+_tok.substring(0,28)+'...':'No token';
}

function sw(name){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el('p-'+name).classList.add('active');
    document.querySelector(`[onclick="sw('${name}')"]`).classList.add('active');
    el('ptitle').textContent=document.querySelector(`[onclick="sw('${name}')"]`).textContent.trim();
}

async function fan(method,url,body,bearer,cb){
    if(!_tid&&url!=='/api/auth/login'&&url!=='/api/auth/register'){
        el('rb').textContent='Set X-Tenant-ID in the Setup panel first.'; return;
    }
    const t0=Date.now();
    el('rm').textContent=method; el('ru').textContent=url;
    el('rs').textContent='...'; el('rb').textContent='Loading...';
    const h={'Content-Type':'application/json','Accept':'application/json'};
    if(_tid)h['X-Tenant-ID']=_tid;
    if(bearer)h['Authorization']='Bearer '+bearer;
    try{
        const r=await fetch(url,{method,headers:h,body:body?JSON.stringify(body):undefined});
        const d=await r.json();
        el('rs').textContent=r.status; el('rs').className=r.ok?'ok':'err';
        el('rt').textContent=(Date.now()-t0)+'ms';
        el('rb').textContent=JSON.stringify(d,null,2);
        if(cb&&r.ok)cb(d);
    }catch(e){el('rs').textContent='ERR';el('rs').className='err';el('rb').textContent=String(e);}
}

function blogList(){
    let url='/api/blog/posts?';
    const cat=g('bl-cat'); const tag=g('bl-tag');
    if(cat)url+='category_id='+cat+'&';
    if(tag)url+='tag='+tag+'&';
    fan('GET',url.replace(/&$/,''),null,tok());
}

function merchBrowse(){
    let url='/api/merch/products?';
    const cat=g('mc-cat'); const ltd=g('mc-ltd');
    if(cat)url+='category_id='+cat+'&';
    if(ltd)url+='is_limited_edition=1&';
    fan('GET',url.replace(/[?&]$/,''),null,null);
}

function checkout(){
    const body={address_id:g('co-aid'),payment_method:g('co-pm')};
    const tn=g('co-tn'); if(tn)body.transfer_network=tn;
    fan('POST','/api/merch/checkout',body,tok());
}

function evBrowse(){
    const t=g('ev-type');
    fan('GET','/api/events'+(t?'?type='+t:''),null,tok());
}
</script>
</body>
</html>
