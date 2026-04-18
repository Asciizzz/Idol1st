<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st Auth</title>
    @vite(['resources/css/global.css', 'resources/css/auth.css', 'resources/js/auth.js'])
</head>
<body>
    <main>
        <section id="signin">
            <h1>Sign In</h1>

            <p><a href="#signup">Jump to sign up</a></p>

            @if ($errors->any())
                <div>
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('signin.store') }}">
                @csrf
                <div>
                    <label for="signin-email">Email</label>
                    <input id="signin-email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email">
                </div>

                <div>
                    <label for="signin-password">Password</label>
                    <input id="signin-password" type="password" name="password" required autocomplete="current-password">
                </div>

                <div>
                    <label>
                        <input type="checkbox" name="remember" value="1">
                        Remember me
                    </label>
                </div>

                <button type="submit">Sign In</button>
            </form>
        </section>

        <section id="signup">
            <h1>Sign Up</h1>

            <p><a href="#signin">Jump to sign in</a></p>

            <form method="POST" action="{{ route('signup.store') }}">
                @csrf
                <div>
                    <label for="signup-name">Name</label>
                    <input id="signup-name" type="text" name="name" value="{{ old('name') }}" required maxlength="150" autocomplete="name">
                </div>

                <div>
                    <label for="signup-email">Email</label>
                    <input id="signup-email" type="email" name="email" value="{{ old('email') }}" required maxlength="255" autocomplete="email">
                </div>

                <div>
                    <label for="signup-password">Password</label>
                    <input id="signup-password" type="password" name="password" required minlength="8" autocomplete="new-password">
                </div>

                <div>
                    <label for="signup-password-confirmation">Confirm Password</label>
                    <input id="signup-password-confirmation" type="password" name="password_confirmation" required minlength="8" autocomplete="new-password">
                </div>

                <button type="submit">Create Account</button>
            </form>
        </section>
    </main>
</body>
</html>
