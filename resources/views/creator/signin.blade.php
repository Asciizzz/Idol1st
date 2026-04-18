<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creator Sign In</title>
    @vite(['resources/css/global.css', 'resources/css/creator.css'])
</head>
<body class="creator-bg">
    <main class="creator-shell narrow">
        <section class="panel auth-panel">
            <p class="eyebrow">Creator Access</p>
            <h1>Sign in</h1>
            <p class="lead">Continue building your website from where you left off.</p>

            @if ($errors->any())
                <div class="error-box">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('creator.signin.store') }}" class="form-grid">
                @csrf
                <label>
                    Email
                    <input type="email" name="email" value="{{ old('email') }}" required maxlength="255" autocomplete="email">
                </label>

                <label>
                    Password
                    <input type="password" name="password" required autocomplete="current-password">
                </label>

                <label class="checkbox-inline">
                    <input type="checkbox" name="remember" value="1">
                    Keep me signed in
                </label>

                <button type="submit" class="primary-btn">Sign In</button>
            </form>

            <p class="auth-switch">No account yet? <a href="{{ route('creator.signup') }}">Create one</a></p>
        </section>
    </main>
</body>
</html>
