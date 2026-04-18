<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st Web Constructor</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/js/creator-builder.js'])
</head>
<body>
    <header class="creator-builder-header">
        <div class="creator-builder-heading">
            <div class="creator-builder-kicker">Step 2/2</div>
            <strong>Interactive Builder</strong>
            <span id="builder-url-preview" class="creator-builder-url"></span>
        </div>

        <div class="creator-builder-actions">
            <button type="button" id="save-builder">Save Draft JSON</button>
            <a href="{{ route('creator.setup') }}">Back to setup</a>
            <form method="POST" action="{{ route('creator.signout') }}">
                @csrf
                <button type="submit">Sign out</button>
            </form>
        </div>
    </header>

    <div id="app">
        <div id="editor">
            <div id="canvas">
                <iframe id="preview-frame" title="Page Preview"></iframe>
            </div>
        </div>

        <div id="sidebar-buttons" aria-label="Sidebar Sections"></div>

        <div id="sidebar-content" aria-live="polite" aria-hidden="true"></div>
    </div>

    <div id="custom-tooltip"></div>
    <div id="builder-save-status" class="builder-save-status" aria-live="polite"></div>

    <script>
        window.creatorDraft = @json($draft);
        window.creatorSaveUrl = @json(route('creator.builder.save'));
        window.webConstructInitialProject = @json($initialProject);
        window.webConstructInitialProjectUrl = @json(url('/webconstruct/example.json'));
        window.webConstructAssetsUrl = @json(url('/webconstruct/assets/assets.json'));
    </script>
</body>
</html>
