<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st Editor</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/js/app.js'])
</head>
<body>
    <header class="creator-builder-header">
        <div class="creator-builder-heading">
            <div class="creator-builder-kicker">Step 2/2</div>
            <strong>Interactive Editor</strong>
            <span id="builder-url-preview" class="creator-builder-url"></span>
        </div>
    </header>

    <div id="app">
        <div id="editor">
            <div id="canvas"></div>
        </div>

        <div id="sidebar-buttons" aria-label="Sidebar Sections"></div>

        <div id="sidebar-content" aria-live="polite" aria-hidden="true"></div>
    </div>

    <div id="builder-save-status" class="builder-save-status" aria-live="polite"></div>

    <script>
        window.creatorDraft = @json($draft);
        window.creatorSaveUrl = @json(route('editor.save'));
        window.webConstructInitialProject = @json($initialProject);
        window.webConstructInitialProjectUrl = @json(url('/jsons/example.json'));
        window.webConstructAssetsUrl = @json(url('/jsons/assets.json'));
    </script>
</body>
</html>
