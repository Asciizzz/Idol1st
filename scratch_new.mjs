import fs from 'fs';

let nodeIdCounter = 1;
let edgeIdCounter = 1;

const nodes = [];
const edges = [];

function addNode(id, type, name, x, y, extraData = {}) {
    const node = {
        id,
        data: {
            vsgdata: { x, y, z: 0, collapsed: extraData.collapsed || false },
            type,
            name,
            ...extraData
        }
    };
    nodes.push(node);
    return id;
}

function addEdge(srcId, dstId, rootId) {
    const id = `e${edgeIdCounter++}`;
    edges.push({
        id,
        srcId,
        dstId,
        data: {
            rootId,
            order: 0,
            enabled: true
        }
    });
    return id;
}

// ==========================================
// SHARED CSS & JS
// ==========================================
const rootCss = addNode("css_main", "CSS", "main.css", -400, -200, { collapsed: true });
const rootJs = addNode("js_app", "JS", "app.js", -400, -400, { collapsed: true });

// CSS Rules (The Vine)
const c_body = addNode("c_body", "CSS_RULE", "body", -700, -200, { selector: "body", code: "margin: 0;\nfont-family: 'Quicksand', sans-serif;\nbackground: #fff0f5;\ncolor: #4a4a4a;\noverflow-x: hidden;", collapsed: true });
const c_nav = addNode("c_nav", "CSS_RULE", "nav", -1000, -200, { selector: "nav", code: "display: flex;\njustify-content: space-around;\nalign-items: center;\npadding: 15px 30px;\nbackground: #ff69b4;\nbox-shadow: 0 4px 15px rgba(255,105,180,0.4);\nposition: sticky;\ntop: 0;\nz-index: 100;", collapsed: true });
const c_logo = addNode("c_logo", "CSS_RULE", ".logo", -1300, -200, { selector: ".logo", code: "font-size: 2rem;\nfont-weight: 800;\ncolor: #fff;\ntext-shadow: 2px 2px 0px #ff1493;", collapsed: true });

const c_nav_link = addNode("c_nav_link", "CSS_RULE", ".nav-link", -1300, -100, { selector: ".nav-link", code: "color: #fff;\ntext-decoration: none;\nfont-weight: bold;\nfont-size: 1.1rem;\ncursor: pointer;\ntransition: transform 0.2s, color 0.2s;", collapsed: true });
const c_nav_link_hov = addNode("c_nav_link_hov", "CSS_RULE", ".nav-link:hover", -1000, -100, { selector: ".nav-link:hover", code: "color: #ffe4e1;\ntransform: scale(1.1);", collapsed: true });
const c_hero = addNode("c_hero", "CSS_RULE", ".hero", -700, -100, { selector: ".hero", code: "display: flex;\nflex-direction: column;\nalign-items: center;\njustify-content: center;\nmin-height: 80vh;\ntext-align: center;\npadding: 40px;", collapsed: true });

const c_hero_title = addNode("c_hero_title", "CSS_RULE", ".hero h1", -700, 0, { selector: ".hero h1", code: "font-size: 4rem;\ncolor: #ff1493;\nmargin-bottom: 20px;\ntext-transform: uppercase;\nletter-spacing: 2px;", collapsed: true });
const c_hero_subtitle = addNode("c_hero_subtitle", "CSS_RULE", ".hero p", -1000, 0, { selector: ".hero p", code: "font-size: 1.5rem;\ncolor: #ff69b4;\nmax-width: 600px;", collapsed: true });
const c_section = addNode("c_section", "CSS_RULE", "section", -1300, 0, { selector: "section", code: "padding: 60px 20px;\nmax-width: 1000px;\nmargin: 0 auto;", collapsed: true });

const c_card_grid = addNode("c_card_grid", "CSS_RULE", ".card-grid", -1300, 100, { selector: ".card-grid", code: "display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\ngap: 30px;\nmargin-top: 40px;", collapsed: true });
const c_card = addNode("c_card", "CSS_RULE", ".card", -1000, 100, { selector: ".card", code: "background: #fff;\nborder-radius: 20px;\npadding: 20px;\nbox-shadow: 0 10px 30px rgba(255,105,180,0.15);\ntransition: transform 0.3s ease;\nborder: 2px solid #ffe4e1;", collapsed: true });
const c_card_hov = addNode("c_card_hov", "CSS_RULE", ".card:hover", -700, 100, { selector: ".card:hover", code: "transform: translateY(-10px);\nborder-color: #ff69b4;", collapsed: true });

const c_btn = addNode("c_btn", "CSS_RULE", ".btn", -700, 200, { selector: ".btn", code: "background: linear-gradient(45deg, #ff69b4, #ff1493);\ncolor: #fff;\npadding: 15px 40px;\nborder: none;\nborder-radius: 30px;\nfont-size: 1.2rem;\nfont-weight: bold;\ncursor: pointer;\nbox-shadow: 0 5px 15px rgba(255,20,147,0.3);\ntransition: all 0.3s ease;", collapsed: true });
const c_btn_hov = addNode("c_btn_hov", "CSS_RULE", ".btn:hover", -1000, 200, { selector: ".btn:hover", code: "transform: scale(1.05);\nbox-shadow: 0 8px 20px rgba(255,20,147,0.5);", collapsed: true });
const c_gallery_img = addNode("c_gallery_img", "CSS_RULE", "Gallery Image", -1300, 200, { selector: ".gallery-img", code: "width: 100%;\nheight: 200px;\nobject-fit: cover;\nborder-radius: 10px;\nmargin-bottom: 15px;", collapsed: true });

addEdge(rootCss, c_body, rootCss);
addEdge(c_body, c_nav, rootCss);
addEdge(c_nav, c_logo, rootCss);
addEdge(c_logo, c_nav_link, rootCss);
addEdge(c_nav_link, c_nav_link_hov, rootCss);
addEdge(c_nav_link_hov, c_hero, rootCss);
addEdge(c_hero, c_hero_title, rootCss);
addEdge(c_hero_title, c_hero_subtitle, rootCss);
addEdge(c_hero_subtitle, c_section, rootCss);
addEdge(c_section, c_card_grid, rootCss);
addEdge(c_card_grid, c_card, rootCss);
addEdge(c_card, c_card_hov, rootCss);
addEdge(c_card_hov, c_btn, rootCss);
addEdge(c_btn, c_btn_hov, rootCss);
addEdge(c_btn_hov, c_gallery_img, rootCss);

// INLINE CSS RULES (Floating, disconnected from main vine)
const in_nav_links = addNode("in_nav_links", "CSS_RULE", "Nav Flex", -500, 700, { selector: "", code: "display:flex;\ngap: 20px;", collapsed: true });
const in_sec_title = addNode("in_sec_title", "CSS_RULE", "Sec Title", -750, 750, { selector: "", code: "color: #ff1493;\ntext-align: center;", collapsed: true });
const in_lore_grid = addNode("in_lore_grid", "CSS_RULE", "Lore Grid", -550, 850, { selector: "", code: "display: flex;\ngap: 30px;\nalign-items: center;\njustify-content: center;", collapsed: true });
const in_lore_img = addNode("in_lore_img", "CSS_RULE", "Lore Img", -800, 900, { selector: "", code: "border-radius: 20px;\nmax-width: 300px;\nbox-shadow: 0 10px 30px rgba(0,0,0,0.2);", collapsed: true });
const in_lore_txt = addNode("in_lore_txt", "CSS_RULE", "Lore Txt", -450, 1000, { selector: "", code: "font-size: 1.2rem;\nline-height: 1.8;", collapsed: true });
const in_card_txt = addNode("in_card_txt", "CSS_RULE", "Card Txt", -750, 1050, { selector: "", code: "text-align:center;\nfont-weight:bold;\ncolor: #ff69b4;", collapsed: true });
const c_inline_img = addNode("c_inline_img", "CSS_RULE", "Hero Img", -500, 1150, { selector: "", code: "width: 100%;\nmax-width: 400px;\nborder-radius: 50%;\nborder: 8px solid #ffe4e1;\nbox-shadow: 0 10px 30px rgba(255,105,180,0.3);\nmargin-top: 30px;\nobject-fit: cover;", collapsed: true });

// JS Events (Top Canopy)
const j_nav_alert = addNode("j_nav_alert", "JS_EVENT", "Nav Link Click", 400, -400, { event: "click", code: "alert('Navigating to: ' + event.currentTarget.innerText.trim().toLowerCase() + '.html');", collapsed: true });
const j_btn_alert = addNode("j_btn_alert", "JS_EVENT", "Subscribe Click", 800, -400, { event: "click", code: "alert('Thank you for supporting!');\nevent.currentTarget.innerText = 'Subscribed! 💖';", collapsed: true });

addEdge(rootJs, j_nav_alert, rootJs);
addEdge(rootJs, j_btn_alert, rootJs);


// ==========================================
// PAGE 1: index.html
// ==========================================
const rootHtml1 = addNode("html_index", "HTML", "index", 0, 0, { collapsed: true });
addEdge(rootHtml1, rootCss, rootHtml1);
addEdge(rootHtml1, rootJs, rootHtml1);

// Nav
const idx_nav = addNode("idx_nav", "ELEMENT", "Navbar", 300, -200, { tag: "nav", attrsText: "", text: "", collapsed: true });
addEdge(rootHtml1, idx_nav, rootHtml1);
const idx_logo = addNode("idx_logo", "ELEMENT", "Logo", 600, -300, { tag: "div", attrsText: "class='logo'", text: "🌟 VTuber Site", collapsed: true });
const idx_links = addNode("idx_links", "ELEMENT", "Nav Links", 600, -100, { tag: "div", attrsText: "", text: "", collapsed: true });
addEdge(idx_nav, idx_logo, rootHtml1);
addEdge(idx_nav, idx_links, rootHtml1);
addEdge(idx_links, in_nav_links, rootHtml1); // INLINE STYLE

const idx_l1 = addNode("idx_l1", "ELEMENT", "Home Link", 900, -200, { tag: "div", attrsText: "class='nav-link'", text: "Home", collapsed: true });
const idx_l2 = addNode("idx_l2", "ELEMENT", "About Link", 900, -100, { tag: "div", attrsText: "class='nav-link'", text: "About", collapsed: true });
const idx_l3 = addNode("idx_l3", "ELEMENT", "Gallery Link", 900, 0, { tag: "div", attrsText: "class='nav-link'", text: "Gallery", collapsed: true });
addEdge(idx_links, idx_l1, rootHtml1);
addEdge(idx_links, idx_l2, rootHtml1);
addEdge(idx_links, idx_l3, rootHtml1);

addEdge(idx_l1, j_nav_alert, rootHtml1);
addEdge(idx_l2, j_nav_alert, rootHtml1);
addEdge(idx_l3, j_nav_alert, rootHtml1);

// Hero
const idx_hero = addNode("idx_hero", "ELEMENT", "Hero Section", 300, 300, { tag: "section", attrsText: "class='hero'", text: "", collapsed: true });
addEdge(rootHtml1, idx_hero, rootHtml1);

const idx_h1 = addNode("idx_h1", "ELEMENT", "Hero Title", 600, 200, { tag: "h1", attrsText: "", text: "Welcome to my Virtual World! ✨", collapsed: false });
const idx_hp = addNode("idx_hp", "ELEMENT", "Hero Text", 600, 300, { tag: "p", attrsText: "", text: "I'm a virtual idol streaming games, songs, and comfy chats. Join the family!", collapsed: false });
const idx_hero_img = addNode("idx_hero_img", "ELEMENT", "Hero Image", 600, 400, { tag: "img", attrsText: "", text: "", collapsed: true });
const idx_btn = addNode("idx_btn", "ELEMENT", "Subscribe Btn", 600, 500, { tag: "button", attrsText: "class='btn'", text: "Become a Member!", collapsed: false });

addEdge(idx_hero, idx_h1, rootHtml1);
addEdge(idx_hero, idx_hp, rootHtml1);
addEdge(idx_hero, idx_hero_img, rootHtml1);
addEdge(idx_hero, idx_btn, rootHtml1);
addEdge(idx_btn, j_btn_alert, rootHtml1);
addEdge(idx_hero_img, c_inline_img, rootHtml1); // INLINE STYLE

// Assets
const idx_hero_asset = addNode("idx_hero_asset", "ASSET_IMAGE", "Hero Character Art", 900, 400, { url: "", filename: "Select Character Art", collapsed: false });
addEdge(idx_hero_img, idx_hero_asset, rootHtml1);


// ==========================================
// PAGE 2: about.html
// ==========================================
const rootHtml2 = addNode("html_about", "HTML", "about", 0, 800, { collapsed: true });
addEdge(rootHtml2, rootCss, rootHtml2);
addEdge(rootHtml2, rootJs, rootHtml2);

// Nav
const abt_nav = addNode("abt_nav", "ELEMENT", "Navbar", 300, 600, { tag: "nav", attrsText: "", text: "", collapsed: true });
addEdge(rootHtml2, abt_nav, rootHtml2);
const abt_logo = addNode("abt_logo", "ELEMENT", "Logo", 600, 550, { tag: "div", attrsText: "class='logo'", text: "🌟 VTuber Site", collapsed: true });
const abt_links = addNode("abt_links", "ELEMENT", "Nav Links", 600, 650, { tag: "div", attrsText: "", text: "", collapsed: true });
addEdge(abt_nav, abt_logo, rootHtml2);
addEdge(abt_nav, abt_links, rootHtml2);
addEdge(abt_links, in_nav_links, rootHtml2); // INLINE STYLE

const abt_l1 = addNode("abt_l1", "ELEMENT", "Home Link", 900, 550, { tag: "div", attrsText: "class='nav-link'", text: "Home", collapsed: true });
const abt_l2 = addNode("abt_l2", "ELEMENT", "About Link", 900, 650, { tag: "div", attrsText: "class='nav-link'", text: "About", collapsed: true });
const abt_l3 = addNode("abt_l3", "ELEMENT", "Gallery Link", 900, 750, { tag: "div", attrsText: "class='nav-link'", text: "Gallery", collapsed: true });
addEdge(abt_links, abt_l1, rootHtml2);
addEdge(abt_links, abt_l2, rootHtml2);
addEdge(abt_links, abt_l3, rootHtml2);
addEdge(abt_l1, j_nav_alert, rootHtml2);
addEdge(abt_l2, j_nav_alert, rootHtml2);
addEdge(abt_l3, j_nav_alert, rootHtml2);

// About Content
const abt_sec = addNode("abt_sec", "ELEMENT", "About Section", 300, 900, { tag: "section", attrsText: "", text: "", collapsed: true });
addEdge(rootHtml2, abt_sec, rootHtml2);

const abt_h1 = addNode("abt_h1", "ELEMENT", "About Title", 600, 800, { tag: "h1", attrsText: "", text: "About Me", collapsed: false });
addEdge(abt_h1, in_sec_title, rootHtml2); // INLINE STYLE

const abt_grid = addNode("abt_grid", "ELEMENT", "Lore Grid", 600, 950, { tag: "div", attrsText: "", text: "", collapsed: true });
addEdge(abt_grid, in_lore_grid, rootHtml2); // INLINE STYLE

addEdge(abt_sec, abt_h1, rootHtml2);
addEdge(abt_sec, abt_grid, rootHtml2);

const abt_img_el = addNode("abt_img_el", "ELEMENT", "Lore Image", 900, 850, { tag: "img", attrsText: "", text: "", collapsed: true });
addEdge(abt_img_el, in_lore_img, rootHtml2); // INLINE STYLE

const abt_txt = addNode("abt_txt", "ELEMENT", "Lore Text", 900, 1050, { tag: "p", attrsText: "", text: "[Replace this text with your VTuber lore. Tell your fans about your backstory, your goals, and what makes your streams unique!]", collapsed: false });
addEdge(abt_txt, in_lore_txt, rootHtml2); // INLINE STYLE

addEdge(abt_grid, abt_img_el, rootHtml2);
addEdge(abt_grid, abt_txt, rootHtml2);

const abt_asset = addNode("abt_asset", "ASSET_IMAGE", "Full Body Art", 1200, 850, { url: "", filename: "Select Full Body Art", collapsed: false });
addEdge(abt_img_el, abt_asset, rootHtml2);


// ==========================================
// PAGE 3: gallery.html
// ==========================================
const rootHtml3 = addNode("html_gallery", "HTML", "gallery", 0, 1600, { collapsed: true });
addEdge(rootHtml3, rootCss, rootHtml3);
addEdge(rootHtml3, rootJs, rootHtml3);

// Nav
const gal_nav = addNode("gal_nav", "ELEMENT", "Navbar", 300, 1400, { tag: "nav", attrsText: "", text: "", collapsed: true });
addEdge(rootHtml3, gal_nav, rootHtml3);
const gal_logo = addNode("gal_logo", "ELEMENT", "Logo", 600, 1350, { tag: "div", attrsText: "class='logo'", text: "🌟 VTuber Site", collapsed: true });
const gal_links = addNode("gal_links", "ELEMENT", "Nav Links", 600, 1450, { tag: "div", attrsText: "", text: "", collapsed: true });
addEdge(gal_nav, gal_logo, rootHtml3);
addEdge(gal_nav, gal_links, rootHtml3);
addEdge(gal_links, in_nav_links, rootHtml3); // INLINE STYLE

const gal_l1 = addNode("gal_l1", "ELEMENT", "Home Link", 900, 1350, { tag: "div", attrsText: "class='nav-link'", text: "Home", collapsed: true });
const gal_l2 = addNode("gal_l2", "ELEMENT", "About Link", 900, 1450, { tag: "div", attrsText: "class='nav-link'", text: "About", collapsed: true });
const gal_l3 = addNode("gal_l3", "ELEMENT", "Gallery Link", 900, 1550, { tag: "div", attrsText: "class='nav-link'", text: "Gallery", collapsed: true });
addEdge(gal_links, gal_l1, rootHtml3);
addEdge(gal_links, gal_l2, rootHtml3);
addEdge(gal_links, gal_l3, rootHtml3);
addEdge(gal_l1, j_nav_alert, rootHtml3);
addEdge(gal_l2, j_nav_alert, rootHtml3);
addEdge(gal_l3, j_nav_alert, rootHtml3);

// Gallery Content
const gal_sec = addNode("gal_sec", "ELEMENT", "Gallery Section", 300, 1700, { tag: "section", attrsText: "", text: "", collapsed: true });
addEdge(rootHtml3, gal_sec, rootHtml3);

const gal_h1 = addNode("gal_h1", "ELEMENT", "Gallery Title", 600, 1600, { tag: "h1", attrsText: "", text: "Media Gallery", collapsed: false });
addEdge(gal_h1, in_sec_title, rootHtml3); // INLINE STYLE

const gal_grid = addNode("gal_grid", "ELEMENT", "Card Grid", 600, 1800, { tag: "div", attrsText: "class='card-grid'", text: "", collapsed: true });
addEdge(gal_sec, gal_h1, rootHtml3);
addEdge(gal_sec, gal_grid, rootHtml3);

for (let i = 1; i <= 3; i++) {
    const card = addNode("gal_card" + i, "ELEMENT", "Card " + i, 900, 1700 + (i-1)*150, { tag: "div", attrsText: "class='card'", text: "", collapsed: true });
    addEdge(gal_grid, card, rootHtml3);
    
    const card_img = addNode("gal_cimg" + i, "ELEMENT", "Card Img " + i, 1200, 1700 + (i-1)*150, { tag: "img", attrsText: "class='gallery-img'", text: "", collapsed: true });
    
    const card_p = addNode("gal_cp" + i, "ELEMENT", "Card Text " + i, 1200, 1750 + (i-1)*150, { tag: "p", attrsText: "", text: "Stream Highlight " + i, collapsed: false });
    addEdge(card_p, in_card_txt, rootHtml3); // INLINE STYLE
    
    addEdge(card, card_img, rootHtml3);
    addEdge(card, card_p, rootHtml3);
    
    const card_asset = addNode("gal_asset" + i, "ASSET_IMAGE", "Screenshot " + i, 1500, 1700 + (i-1)*150, { url: "", filename: "Select Screenshot", collapsed: false });
    addEdge(card_img, card_asset, rootHtml3);
}

const data = {
    label: "VTuber Pro Site",
    _nextNodeId: nodeIdCounter + 1000,
    _nextEdgeId: edgeIdCounter + 1000,
    nodes,
    edges
};

fs.writeFileSync('public/jsons/test.json', JSON.stringify(data, null, 4));
console.log("Written to test.json");
