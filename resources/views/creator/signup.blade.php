<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creator Signup</title>
    @vite(['resources/css/global.css', 'resources/css/creator.css'])
</head>
<body class="creator-bg">
    <main class="creator-shell narrow">
        <section class="panel">
            <p class="eyebrow">Creator Onboarding</p>
            <h1>Create your builder account</h1>
            <p class="lead">After signup, we will take you into site setup and the visual drag-and-drop builder.</p>

            @if ($errors->any())
                <div class="error-box">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('creator.signup.store') }}" class="form-grid">
                @csrf
                <label>
                    Full name
                    <input type="text" name="name" value="{{ old('name') }}" required maxlength="150">
                </label>
                <label>
                    Email
                    <input type="email" name="email" value="{{ old('email') }}" required maxlength="255">
                </label>
                <label>
                    Password
                    <input type="password" name="password" required minlength="8">
                </label>
                <label>
                    Confirm password
                    <input type="password" name="password_confirmation" required minlength="8">
                </label>
                <button type="submit" class="primary-btn">Continue to Setup</button>
            </form>

            <p class="auth-switch">Already have an account? <a href="{{ route('creator.signin') }}">Sign in</a></p>
        </section>
    </main>
</body>
</html>
