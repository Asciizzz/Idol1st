export class VsbCompiler {
    static compile(graph) {
        const result = {
            htmlFiles: {},
            cssFiles: {},
            jsFiles: {},
            logs: []
        };
        
        const log = (level, msg) => result.logs.push({ level, msg });

        // 1. Gather files
        const htmlFiles = [];
        const cssFiles = [];
        const jsFiles = [];

        for (const [id, node] of graph.nodes) {
            if (node.data.type === "HTML") htmlFiles.push(node);
            else if (node.data.type === "CSS") cssFiles.push(node);
            else if (node.data.type === "JS") jsFiles.push(node);
        }

        // 2. Build CSS
        for (const cssFile of cssFiles) {
            const rawName = cssFile.data.name || cssFile.id;
            const fileName = rawName.replace(/\.css$/i, '').replace(/\s+/g, '_').toLowerCase() + ".css";
            let content = "";

            // Find direct children
            const outEdges = graph.outEdges(cssFile.id) || [];
            let rules = outEdges
                .filter(e => graph.getNode(e.dstId)?.data.type === "CSS_RULE")
                .map(e => graph.getNode(e.dstId));
            
            if (rules.length > 1) {
                log("warn", `CSS File '${fileName}' has multiple root rules. Picking the first branch.`);
            }

            if (rules.length > 0) {
                let currentNode = rules[0];
                const visited = new Set();
                while (currentNode) {
                    if (visited.has(currentNode.id)) {
                        log("warn", `Cycle detected in CSS vine for '${fileName}'. Breaking.`);
                        break;
                    }
                    visited.add(currentNode.id);
                    content += `${currentNode.data.selector || ""} {\n  ${(currentNode.data.code || "").split('\n').join('\n  ')}\n}\n\n`;

                    const cOut = graph.outEdges(currentNode.id) || [];
                    const nextRules = cOut
                        .filter(e => e.data.rootId === cssFile.id && graph.getNode(e.dstId)?.data.type === "CSS_RULE")
                        .map(e => graph.getNode(e.dstId));

                    if (nextRules.length > 1) {
                        log("warn", `CSS Rule '${currentNode.data.name}' in '${fileName}' has multiple children. Picking the first branch.`);
                    }
                    currentNode = nextRules.length > 0 ? nextRules[0] : null;
                }
            }
            result.cssFiles[fileName] = content;
        }

        // 3. Build JS
        for (const jsFile of jsFiles) {
            const rawName = jsFile.data.name || jsFile.id;
            const fileName = rawName.replace(/\.js$/i, '').replace(/\s+/g, '_').toLowerCase() + ".js";
            let content = `document.addEventListener("DOMContentLoaded", () => {\n`;
            
            const outEdges = graph.outEdges(jsFile.id) || [];
            const jsEvents = outEdges
                .filter(e => graph.getNode(e.dstId)?.data.type === "JS_EVENT")
                .map(e => graph.getNode(e.dstId));
            
            const declaredElements = new Set();
            for (const ev of jsEvents) {
                const inEdges = graph.inEdges(ev.id) || [];
                const boundElements = Array.from(new Set(inEdges
                    .filter(e => graph.getNode(e.srcId)?.data.type === "ELEMENT")
                    .map(e => graph.getNode(e.srcId))));
                
                for (const el of boundElements) {
                    const elId = `vsb_${el.id}`;
                    const evType = ev.data.event || "click";
                    if (!declaredElements.has(elId)) {
                        content += `  const el_${elId} = document.querySelector('[data-vsb-id="${el.id}"]');\n`;
                        declaredElements.add(elId);
                    }
                    content += `  if (el_${elId}) {\n`;
                    content += `    el_${elId}.addEventListener('${evType}', (event) => {\n`;
                    content += `      ${(ev.data.code || "").split('\n').join('\n      ')}\n`;
                    content += `    });\n  }\n\n`;
                }
            }
            content += `});\n`;
            result.jsFiles[fileName] = content;
        }

        // 4. Build HTML
        for (const htmlFile of htmlFiles) {
            const rawName = htmlFile.data.name || htmlFile.id;
            const fileName = rawName.replace(/\.html$/i, '').replace(/\s+/g, '_').toLowerCase() + ".html";
            let content = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${htmlFile.data.name || 'Virtual Site'}</title>\n`;
            
            // Includes
            const fileOutEdges = graph.outEdges(htmlFile.id) || [];
            const includedCss = fileOutEdges.filter(e => graph.getNode(e.dstId)?.data.type === "CSS").map(e => graph.getNode(e.dstId));
            const includedJs  = fileOutEdges.filter(e => graph.getNode(e.dstId)?.data.type === "JS").map(e => graph.getNode(e.dstId));

            for (const css of includedCss) {
                const rawCssName = css.data.name || css.id;
                const cssName = rawCssName.replace(/\.css$/i, '').replace(/\s+/g, '_').toLowerCase() + ".css";
                content += `  <link rel="stylesheet" href="${cssName}">\n`;
            }
            for (const js of includedJs) {
                const rawJsName = js.data.name || js.id;
                const jsName = rawJsName.replace(/\.js$/i, '').replace(/\s+/g, '_').toLowerCase() + ".js";
                content += `  <script src="${jsName}" defer></script>\n`;
            }
            content += `</head>\n<body>\n`;

            // Build DOM tree
            const rootElements = fileOutEdges
                .filter(e => graph.getNode(e.dstId)?.data.type === "ELEMENT")
                .sort((a, b) => {
                    const aEdge = fileOutEdges.find(e => e.dstId === a.id);
                    const bEdge = fileOutEdges.find(e => e.dstId === b.id);
                    return (aEdge?.data.order || 0) - (bEdge?.data.order || 0);
                })
                .map(e => graph.getNode(e.dstId));
            
            const renderElement = (elNode, indent = "  ") => {
                let html = `${indent}<${elNode.data.tag || "div"} data-vsb-id="${elNode.id}"`;
                if (elNode.data.attrsText) {
                    const attrRegex = /([\w-]+)\s*:\s*("[^"]*"|'[^']*')/g;
                    let match;
                    let hasAttrs = false;
                    while ((match = attrRegex.exec(elNode.data.attrsText)) !== null) {
                        html += ` ${match[1]}=${match[2]}`;
                        hasAttrs = true;
                    }
                    if (!hasAttrs && elNode.data.attrsText.trim()) {
                        html += ` ${elNode.data.attrsText.trim()}`;
                    }
                }
                html += `>\n`;

                const elOutEdges = graph.outEdges(elNode.id) || [];
                const children = elOutEdges
                    .filter(e => e.data.rootId === htmlFile.id && graph.getNode(e.dstId)?.data.type === "ELEMENT")
                    .sort((a, b) => a.data.order - b.data.order)
                    .map(e => graph.getNode(e.dstId));

                // Validate events attached to this element
                const attachedEvents = Array.from(new Set(elOutEdges
                    .filter(e => graph.getNode(e.dstId)?.data.type === "JS_EVENT")
                    .map(e => graph.getNode(e.dstId))));
                
                for (const ev of attachedEvents) {
                    const evInEdges = graph.inEdges(ev.id) || [];
                    const ownerJsNodes = Array.from(new Set(evInEdges
                        .filter(e => graph.getNode(e.srcId)?.data.type === "JS")
                        .map(e => graph.getNode(e.srcId))));
                    
                    if (ownerJsNodes.length > 0) {
                        const isIncluded = ownerJsNodes.some(js => includedJs.some(inc => inc.id === js.id));
                        if (!isIncluded) {
                            log("warn", `HTML File '${fileName}' uses event '${ev.data.event || "click"}' on element '${elNode.data.name || elNode.id}' but does not include its parent JS script.`);
                        }
                    }
                }

                if (elNode.data.text) {
                    html += `${indent}  ${elNode.data.text}\n`;
                }
                if (children.length > 0) {
                    for (const child of children) {
                        html += renderElement(child, indent + "  ");
                    }
                }

                html += `${indent}</${elNode.data.tag || "div"}>\n`;
                return html;
            };

            for (const rootEl of rootElements) {
                content += renderElement(rootEl);
            }

            content += `</body>\n</html>`;
            result.htmlFiles[fileName] = content;
        }

        return result;
    }

    static generatePreviewHtml(compiled, activeFileName) {
        const htmlFileNames = Object.keys(compiled.htmlFiles);
        if (htmlFileNames.length === 0) return "<h3 style='color: white; font-family: sans-serif; text-align: center; margin-top: 50px;'>No HTML File Found</h3>";
        
        let html = compiled.htmlFiles[activeFileName];
        if (!html) html = compiled.htmlFiles[htmlFileNames[0]];
        
        // Strip external link/script tags so the iframe doesn't try to fetch them
        html = html.replace(/<link rel="stylesheet" href="[^"]+">\n?/g, '');
        html = html.replace(/<script src="[^"]+" defer><\/script>\n?/g, '');
        
        let cssStr = "<style>\n";
        for (const css in compiled.cssFiles) cssStr += compiled.cssFiles[css] + "\n";
        cssStr += "</style>";
        
        let jsStr = "<script>\n";
        for (const js in compiled.jsFiles) jsStr += compiled.jsFiles[js] + "\n";
        jsStr += "</script>";
        
        html = html.replace("</head>", `${cssStr}\n${jsStr}\n</head>`);
        return html;
    }
}
