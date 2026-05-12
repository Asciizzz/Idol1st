<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st Editor</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/js/app.js'])
</head>
<body class="editor-layout">
    <header class="editor-header">
        <div class="editor-header-heading">
            <div class="editor-header-tag">Live Builder</div>
            <strong>Idol1st Editor</strong>
            <span id="builder-url-preview" class="editor-header-url"></span>
        </div>

        <div class="editor-header-actions">
            <button id="editor-save-button" type="button">Save Project</button>
        </div>
    </header>

    <div id="editor-app">
        <aside id="editor-sidebar-nav" aria-label="Editor Sidebar"></aside>
        <aside id="editor-sidebar-panel" aria-live="polite" aria-hidden="true"></aside>
        <div id="editor-sidebar-resize" aria-hidden="true"></div>

        <main id="editor-main">
            <div id="editor-tabs" aria-label="Editor Tabs"></div>
            <div id="editor-stage">
                <div id="editor-canvas-parking" hidden></div>
                <div id="editor-canvas-host"></div>
            </div>
        </main>
    </div>

    <footer id="editor-statusbar" aria-label="Editor Status">
        <div class="editor-status-left">
            <button id="editor-ready-indicator" type="button" class="editor-status-chip">Booting</button>
            <div class="editor-status-chip">Workspace</div>
        </div>
        <div class="editor-status-right">
            <div id="builder-save-status" class="editor-status-chip" aria-live="polite"></div>
        </div>
    </footer>

    <script>
        window.creatorDraft = @json($draft);
        window.creatorSaveUrl = @json(route('editor.save'));
        window.webConstructInitialProject = @json($initialProject);
        window.webConstructInitialProjectUrl = @json(url('/jsons/example.json'));
        window.webConstructAssetsUrl = @json(url('/jsons/assets.json'));
    </script>
</body>
</html>
