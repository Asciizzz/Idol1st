<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st Setup</title>
    @vite(['resources/css/global.css'])
</head>
<body class="creator-bg">
    <main class="creator-shell narrow">
        <section class="panel">
            <p class="eyebrow">Step 1/2</p>
            <h1>Define your site identity</h1>
            <p class="lead">Set your project name and your subdomain. Your site URL preview follows subdomain.idol1st.app/project-name.</p>

            @if ($errors->any())
                <div class="error-box">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('setup.store') }}" class="form-grid">
                @csrf

                <label>
                    Site type
                    <select name="site_type" required>
                        @php($siteType = old('site_type', $draft['site_type'] ?? 'idol'))
                        <option value="idol" {{ $siteType === 'idol' ? 'selected' : '' }}>Idol (individual creator)</option>
                        <option value="agency" {{ $siteType === 'agency' ? 'selected' : '' }}>Agency (organization profile)</option>
                    </select>
                </label>

                <label>
                    Project name
                    <input type="text" name="project_name" value="{{ old('project_name', $draft['project_name'] ?? '') }}" required maxlength="150" placeholder="Project Alpha">
                </label>

                <label>
                    Subdomain
                    <input type="text" name="subdomain" value="{{ old('subdomain', $draft['subdomain'] ?? '') }}" required maxlength="80" pattern="[a-z0-9-]+" placeholder="your-subdomain">
                    <small class="field-note">Will become <strong>your-subdomain.idol1st.app</strong></small>
                </label>

                <label>
                    Suggested template
                    @php($template = old('template_key', $draft['template_key'] ?? 'spotlight'))
                    <select name="template_key" required>
                        <option value="spotlight" {{ $template === 'spotlight' ? 'selected' : '' }}>Spotlight Idol (hero + social + timeline)</option>
                        <option value="neon-stage" {{ $template === 'neon-stage' ? 'selected' : '' }}>Neon Stage (music-heavy, visual first)</option>
                        <option value="classic-label" {{ $template === 'classic-label' ? 'selected' : '' }}>Classic Label (agency intro + roster focus)</option>
                        <option value="agency-grid" {{ $template === 'agency-grid' ? 'selected' : '' }}>Agency Grid (talent cards + updates)</option>
                    </select>
                </label>

                <label>
                    Primary theme color
                    <input type="color" name="theme_color" value="{{ old('theme_color', $draft['theme_color'] ?? '#C8102E') }}" required>
                </label>

                <button type="submit" class="primary-btn">Open Editor</button>
            </form>
        </section>
    </main>
</body>
</html>
