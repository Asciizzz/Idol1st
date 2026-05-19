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
    <div id="virtualsite-host"></div>

    <script>
        window.creatorDraft = @json($draft);
        window.creatorSaveUrl = @json(route('editor.save'));
        window.webConstructInitialProject = @json($initialProject);
        window.webConstructInitialProjectUrl = @json(url('/jsons/example.json'));
        window.webConstructAssetsUrl = @json(url('/jsons/assets.json'));
    </script>
</body>
</html>
