<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>VSB - {{ $draft['project_name'] ?? 'Editor' }}</title>
    <style>
        body {
            margin: 0;
            font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #app {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
        }
    </style>
    @vite('resources/js/vsb.js')
</head>

<body>
    <div id="app"></div>

    {{-- Seed VSB canvas with graph state and draft metadata --}}
    <script>
        window.__VSB_GRAPH__ = @json($initialGraph);
        window.__VSB_DRAFT__  = @json($draft);

        {{-- Sanctum token for API calls from vsb.js --}}
        {{-- Usage in JS: const token = window.__VSB_TOKEN__ --}}
        window.__VSB_TOKEN__ = @json(session('sanctum_token'));
    </script>
</form>
</body>

</html>
