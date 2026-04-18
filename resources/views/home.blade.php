<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st Creator</title>
    @vite(['resources/css/global.css', 'resources/css/creator.css', 'resources/js/app.js'])
</head>
<body>
    <main class="home-hero">
        <section class="home-card">
            <p class="eyebrow">Idol1st</p>
            <h1>Build your fan site visually.</h1>
            <p>Start with identity setup, choose a template suggestion, then arrange blocks with drag and drop.</p>
            <div class="home-actions">
                <a href="{{ route('creator.signup') }}" class="cta-link">Start Creating</a>
                <a href="{{ route('creator.signin') }}" class="ghost-link">Already have an account? Sign in</a>
            </div>
        </section>
    </main>
</body>
</html>