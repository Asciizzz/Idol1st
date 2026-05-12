import './editor.css';
import '../js/global/EzVirtualSite.js';
import '../js/global/EzFloater.js';
import { EditorApp } from './EditorApp.js';

(function bootstrap() {
    const app = new EditorApp();

    app.init().catch(function(error) {
        console.error('[editor] Failed to initialize:', error);
        const root = document.querySelector('#editor-app');
        if (root) {
            root.textContent = `Failed to initialize editor: ${error.message}`;
        }
    });
})();
