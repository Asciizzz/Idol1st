const fs = require('fs');

let _nextNodeId = 1000;
let _nextEdgeId = 1000;

const nodes = [];
const edges = [];

function addNode(id, type, name, props = {}, x = 0, y = 0, collapsed = true) {
    nodes.push({
        id,
        data: {
            type,
            name,
            vsgdata: { x, y, z: 0, collapsed },
            ...props
        }
    });
}

function addEdge(srcId, dstId, rootId, order = 0) {
    edges.push({
        id: `e_${_nextEdgeId++}`,
        srcId,
        dstId,
        data: { rootId, order, enabled: true }
    });
}

// ==========================================
// 1. ROOT FILES
// ==========================================
addNode("n_html_index", "HTML", "index", {}, -1200, 0, false);
addNode("n_html_about", "HTML", "about", {}, -1200, 1000, false);
addNode("n_html_stream", "HTML", "stream", {}, -1200, 2000, false);

addNode("n_css", "CSS", "main_styles", {}, -1200, 3000, false);
addNode("n_js", "JS", "app_logic", {}, -1200, 4000, false);

// Include CSS & JS into HTMLs
["n_html_index", "n_html_about", "n_html_stream"].forEach(htmlNode => {
    addEdge(htmlNode, "n_css", htmlNode);
    addEdge(htmlNode, "n_js", htmlNode);
});

// ==========================================
// 2. GLOBAL CSS CHAIN (Cascading)
// ==========================================
let cssX = -800;
let cssY = 3000;
let lastCssNode = "n_css";

function addGlobalCss(id, name, selector, code) {
    addNode(id, "CSS_RULE", name, { selector, code }, cssX, cssY, true);
    addEdge(lastCssNode, id, "n_css");
    lastCssNode = id;
    cssX += 300;
    if (cssX > 2000) { cssX = -800; cssY += 150; } // wrap around for neatness
}

addGlobalCss("c_reset", "Reset", "*", "margin: 0;\npadding: 0;\nbox-sizing: border-box;");
addGlobalCss("c_body", "Body", "body", "background-color: #0b0c10;\ncolor: #c5c6c7;\nfont-family: 'Inter', sans-serif;\noverflow-x: hidden;\ntransition: background 0.5s ease;");
addGlobalCss("c_body_disco", "Disco Class", "body.disco-mode", "background: linear-gradient(45deg, #1f0033, #33001b);");
addGlobalCss("c_header", "Header", ".header", "position: fixed;\ntop: 0;\nwidth: 100%;\npadding: 20px 50px;\ndisplay: flex;\njustify-content: space-between;\nalign-items: center;\nbackground: rgba(11, 12, 16, 0.8);\nbackdrop-filter: blur(15px);\nz-index: 100;\nborder-bottom: 1px solid rgba(102, 252, 241, 0.2);\nbox-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);");
addGlobalCss("c_logo", "Logo", ".logo", "font-size: 28px;\nfont-weight: 900;\ncolor: #66fcf1;\ntext-shadow: 0 0 10px rgba(102, 252, 241, 0.5);\ncursor: pointer;");
addGlobalCss("c_nav", "Nav", ".nav-links", "display: flex;\ngap: 40px;");
addGlobalCss("c_nav_item", "Nav Item", ".nav-item", "cursor: pointer;\nfont-weight: 600;\ncolor: #45a29e;\ntransition: all 0.3s;\ntext-transform: uppercase;\nletter-spacing: 2px;");
addGlobalCss("c_nav_item_hover", "Nav Hover", ".nav-item:hover", "color: #66fcf1;\ntext-shadow: 0 0 15px rgba(102, 252, 241, 0.8);\ntransform: translateY(-2px);");

// Layout Blocks
addGlobalCss("c_section", "Section Base", ".section", "padding: 120px 50px 50px;\nmin-height: 100vh;\ndisplay: flex;\nflex-direction: column;\nalign-items: center;");
addGlobalCss("c_hero", "Hero Container", ".hero", "justify-content: center;\ntext-align: center;\nbackground: radial-gradient(circle at center, #1f2833 0%, #0b0c10 70%);");
addGlobalCss("c_title", "Hero Title", ".hero-title", "font-size: 90px;\nfont-weight: 900;\nline-height: 1;\nbackground: linear-gradient(to right, #66fcf1, #45a29e);\n-webkit-background-clip: text;\n-webkit-text-fill-color: transparent;\nanimation: pulse 2s infinite;");
addGlobalCss("c_btn", "Primary Button", ".btn", "margin-top: 30px;\npadding: 15px 40px;\nbackground: transparent;\nborder: 2px solid #66fcf1;\nborder-radius: 5px;\ncolor: #66fcf1;\nfont-size: 18px;\nfont-weight: bold;\ncursor: pointer;\ntransition: 0.3s;\ntext-transform: uppercase;\nletter-spacing: 3px;");
addGlobalCss("c_btn_hover", "Btn Hover", ".btn:hover", "background: #66fcf1;\ncolor: #0b0c10;\nbox-shadow: 0 0 20px rgba(102, 252, 241, 0.6);\ntransform: scale(1.05);");

// Cards & Grids
addGlobalCss("c_grid", "Grid", ".grid", "display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\ngap: 30px;\nwidth: 100%;\nmax-width: 1200px;\nmargin-top: 50px;");
addGlobalCss("c_card", "Card", ".card", "background: #1f2833;\nborder-radius: 15px;\npadding: 30px;\ntext-align: center;\nborder: 1px solid rgba(255,255,255,0.05);\ntransition: 0.3s;");
addGlobalCss("c_card_hover", "Card Hover", ".card:hover", "transform: translateY(-10px);\nborder-color: #45a29e;\nbox-shadow: 0 15px 30px rgba(0,0,0,0.5);");

// Chat / Stream Layout
addGlobalCss("c_stream_layout", "Stream Layout", ".stream-layout", "display: flex;\nwidth: 100%;\nmax-width: 1600px;\ngap: 20px;\nheight: 70vh;\nmargin-top: 40px;");
addGlobalCss("c_video_player", "Video Player", ".video-player", "flex: 3;\nbackground: #000;\nborder-radius: 10px;\ndisplay: flex;\nalign-items: center;\njustify-content: center;\nfont-size: 24px;\ncolor: #45a29e;\nborder: 1px solid #1f2833;");
addGlobalCss("c_chat_box", "Chat Box", ".chat-box", "flex: 1;\nbackground: #1f2833;\nborder-radius: 10px;\npadding: 20px;\ndisplay: flex;\nflex-direction: column;\ngap: 15px;\nborder: 1px solid rgba(102, 252, 241, 0.2);");

// ==========================================
// 3. JS EVENTS (Global Bipartite)
// ==========================================
let jsX = -800;
let jsY = 4000;

function addGlobalEvent(id, name, eventName, code) {
    addNode(id, "JS_EVENT", name, { event: eventName, code }, jsX, jsY, false);
    addEdge("n_js", id, "n_js");
    jsX += 450;
}

addGlobalEvent("j_nav_home", "Go Home", "click", "alert('Routing to Home (index.html)');");
addGlobalEvent("j_nav_about", "Go About", "click", "alert('Routing to About Lore (about.html)');");
addGlobalEvent("j_nav_stream", "Go Stream", "click", "alert('Loading Live Stream Interface (stream.html)');");
addGlobalEvent("j_disco", "Toggle Disco Mode", "click", "document.body.classList.toggle('disco-mode');\nalert('DISCO MODE INITIATED!');");
addGlobalEvent("j_color_shift", "Hacker Color Shift", "pointerenter", "event.target.style.filter = `hue-rotate(${Math.random() * 360}deg)`;");
addGlobalEvent("j_chat_spam", "Simulate Chat", "click", "alert('Chat: POGCHAMP!\\nChat: LOL\\nChat: KUSA');");


// ==========================================
// 4. HTML DOM TREES
// ==========================================

function buildHeader(rootId, parentNodeId, x, y) {
    addNode(`e_header_${rootId}`, "ELEMENT", "Header", { tag: "header", attrsText: "class='header'" }, x, y, true);
    addEdge(parentNodeId, `e_header_${rootId}`, rootId, 0);

    addNode(`e_logo_${rootId}`, "ELEMENT", "Logo", { tag: "div", attrsText: "class='logo'", text: "ASTRAL.VT" }, x + 300, y - 100, false);
    addEdge(`e_header_${rootId}`, `e_logo_${rootId}`, rootId, 0);
    addEdge(`e_logo_${rootId}`, "j_nav_home", rootId); // Bind logo to home

    addNode(`e_nav_${rootId}`, "ELEMENT", "Nav", { tag: "nav", attrsText: "class='nav-links'" }, x + 300, y + 100, true);
    addEdge(`e_header_${rootId}`, `e_nav_${rootId}`, rootId, 1);

    addNode(`e_nav1_${rootId}`, "ELEMENT", "Nav Home", { tag: "div", attrsText: "class='nav-item'", text: "HOME" }, x + 600, y + 0, false);
    addNode(`e_nav2_${rootId}`, "ELEMENT", "Nav About", { tag: "div", attrsText: "class='nav-item'", text: "LORE" }, x + 600, y + 100, false);
    addNode(`e_nav3_${rootId}`, "ELEMENT", "Nav Stream", { tag: "div", attrsText: "class='nav-item'", text: "LIVE" }, x + 600, y + 200, false);
    addEdge(`e_nav_${rootId}`, `e_nav1_${rootId}`, rootId, 0);
    addEdge(`e_nav_${rootId}`, `e_nav2_${rootId}`, rootId, 1);
    addEdge(`e_nav_${rootId}`, `e_nav3_${rootId}`, rootId, 2);

    // Bind nav events
    addEdge(`e_nav1_${rootId}`, "j_nav_home", rootId);
    addEdge(`e_nav2_${rootId}`, "j_nav_about", rootId);
    addEdge(`e_nav3_${rootId}`, "j_nav_stream", rootId);
}

// ------------------------------------------
// HTML: INDEX.HTML
// ------------------------------------------
addNode("e_index_wrap", "ELEMENT", "Body Wrap", { tag: "div" }, -800, 0, true);
addEdge("n_html_index", "e_index_wrap", "n_html_index", 0);
buildHeader("n_html_index", "e_index_wrap", -500, -200);

// Hero Section
addNode("e_index_hero", "ELEMENT", "Hero Section", { tag: "section", attrsText: "class='section hero'" }, -500, 200, true);
addEdge("e_index_wrap", "e_index_hero", "n_html_index", 1);

addNode("e_hero_title", "ELEMENT", "Hero Title", { tag: "h1", attrsText: "class='hero-title'", text: "VIRTUAL REALITY" }, -200, 100, false);
addEdge("e_index_hero", "e_hero_title", "n_html_index", 0);

// Inline CSS for the Title
addNode("c_inline_glow", "CSS_RULE", "Inline Text Glow", { code: "text-shadow: 0 0 50px rgba(102, 252, 241, 0.9);\ntransition: filter 0.3s;" }, 200, 50, false);
addEdge("e_hero_title", "c_inline_glow", "n_html_index");
addEdge("e_hero_title", "j_color_shift", "n_html_index"); // Interactive hover effect

addNode("e_hero_sub", "ELEMENT", "Hero Subtitle", { tag: "p", attrsText: "style='font-size: 24px; color: #45a29e; margin-top: 20px;'", text: "The next generation idol is live." }, -200, 250, false);
addEdge("e_index_hero", "e_hero_sub", "n_html_index", 1);

addNode("e_hero_btn", "ELEMENT", "CTA Button", { tag: "button", attrsText: "class='btn'", text: "INITIATE DISCO PROTOCOL" }, -200, 400, false);
addEdge("e_index_hero", "e_hero_btn", "n_html_index", 2);
addEdge("e_hero_btn", "j_disco", "n_html_index"); // Bind Disco Event


// ------------------------------------------
// HTML: ABOUT.HTML
// ------------------------------------------
addNode("e_about_wrap", "ELEMENT", "Body Wrap", { tag: "div" }, -800, 1000, true);
addEdge("n_html_about", "e_about_wrap", "n_html_about", 0);
buildHeader("n_html_about", "e_about_wrap", -500, 800);

addNode("e_about_sec", "ELEMENT", "Lore Section", { tag: "section", attrsText: "class='section'" }, -500, 1200, true);
addEdge("e_about_wrap", "e_about_sec", "n_html_about", 1);

addNode("e_about_title", "ELEMENT", "Title", { tag: "h2", attrsText: "style='font-size: 50px; color: #66fcf1;'", text: "ARCHIVE // LORE" }, -200, 1050, false);
addEdge("e_about_sec", "e_about_title", "n_html_about", 0);

addNode("e_grid", "ELEMENT", "Stats Grid", { tag: "div", attrsText: "class='grid'" }, -200, 1200, true);
addEdge("e_about_sec", "e_grid", "n_html_about", 1);

// Grid Cards
for(let i=1; i<=3; i++) {
    addNode(`e_card${i}`, "ELEMENT", `Card ${i}`, { tag: "div", attrsText: "class='card'" }, 200, 1100 + (i*150), true);
    addEdge("e_grid", `e_card${i}`, "n_html_about", i);
    
    let title = i === 1 ? "ORIGIN" : i === 2 ? "SPECS" : "CAPABILITIES";
    let text = i === 1 ? "Constructed in Sector 7." : i === 2 ? "Height: 165cm | Weight: N/A" : "Vocal Synthesis, Reality Distortion";
    
    addNode(`e_card_t${i}`, "ELEMENT", "Title", { tag: "h3", attrsText: "style='color: #66fcf1; margin-bottom: 10px;'", text: title }, 500, 1050 + (i*150), false);
    addNode(`e_card_p${i}`, "ELEMENT", "Text", { tag: "p", text }, 500, 1120 + (i*150), false);
    
    addEdge(`e_card${i}`, `e_card_t${i}`, "n_html_about", 0);
    addEdge(`e_card${i}`, `e_card_p${i}`, "n_html_about", 1);
    addEdge(`e_card${i}`, "j_color_shift", "n_html_about"); // Fun hover
}


// ------------------------------------------
// HTML: STREAM.HTML
// ------------------------------------------
addNode("e_stream_wrap", "ELEMENT", "Body Wrap", { tag: "div" }, -800, 2000, true);
addEdge("n_html_stream", "e_stream_wrap", "n_html_stream", 0);
buildHeader("n_html_stream", "e_stream_wrap", -500, 1800);

addNode("e_stream_sec", "ELEMENT", "Stream Interface", { tag: "section", attrsText: "class='section'" }, -500, 2200, true);
addEdge("e_stream_wrap", "e_stream_sec", "n_html_stream", 1);

addNode("e_stream_title", "ELEMENT", "Status", { tag: "div", attrsText: "style='color: #ff003c; font-weight: bold; font-size: 24px; letter-spacing: 5px; animation: pulse 1s infinite;'", text: "● LIVE NOW" }, -200, 2050, false);
addEdge("e_stream_sec", "e_stream_title", "n_html_stream", 0);

addNode("e_s_layout", "ELEMENT", "Layout", { tag: "div", attrsText: "class='stream-layout'" }, -200, 2200, true);
addEdge("e_stream_sec", "e_s_layout", "n_html_stream", 1);

// Video Player with Asset Image
addNode("e_vid", "ELEMENT", "Video Player", { tag: "div", attrsText: "class='video-player'" }, 200, 2100, true);
addEdge("e_s_layout", "e_vid", "n_html_stream", 0);

addNode("e_vid_img", "ELEMENT", "Stream Thumb", { tag: "img", attrsText: "style='width: 100%; height: 100%; object-fit: cover; border-radius: 10px; opacity: 0.8;'" }, 500, 2100, false);
addEdge("e_vid", "e_vid_img", "n_html_stream", 0);

addNode("a_thumb", "ASSET_IMAGE", "Game Thumbnail", { url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop", filename: "Cyberpunk.png" }, 800, 2100, false);
addEdge("e_vid_img", "a_thumb", "n_html_stream");

// Chat Box
addNode("e_chat", "ELEMENT", "Chat Box", { tag: "div", attrsText: "class='chat-box'" }, 200, 2400, true);
addEdge("e_s_layout", "e_chat", "n_html_stream", 1);

addNode("e_chat_h", "ELEMENT", "Header", { tag: "h3", attrsText: "style='color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px;'", text: "SUPER CHAT" }, 500, 2300, false);
addEdge("e_chat", "e_chat_h", "n_html_stream", 0);

addNode("e_chat_msgs", "ELEMENT", "Messages", { tag: "div", attrsText: "style='flex: 1; display: flex; flex-direction: column; gap: 10px;'" }, 500, 2400, false);
addEdge("e_chat", "e_chat_msgs", "n_html_stream", 1);

addNode("e_chat_btn", "ELEMENT", "Donate Btn", { tag: "button", attrsText: "class='btn'", text: "SEND MESSAGE" }, 500, 2500, false);
addEdge("e_chat", "e_chat_btn", "n_html_stream", 2);
addEdge("e_chat_btn", "j_chat_spam", "n_html_stream"); // Spam chat event!


const output = {
    label: "VTuber Multi-Page Site",
    _nextNodeId: 9999,
    _nextEdgeId: 9999,
    nodes,
    edges
};

fs.writeFileSync('public/jsons/test.json', JSON.stringify(output, null, 4));
console.log("Successfully generated multi-page test.json!");
