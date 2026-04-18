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
        <!-- Toggle between login and signup -->
        <input type="checkbox" id="toggle-login" hidden checked>

        <section id="login">
            <h1>Login</h1>

            <p><label for="toggle-login">Jump to sign up</label></p>

            @if ($errors->any())
                <div>
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('login.store') }}">
                @csrf
                <div>
                    <label for="login-email">Email</label>
                    <input id="login-email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email">
                </div>

                <div>
                    <label for="login-password">Password</label>
                    <input id="login-password" type="password" name="password" required autocomplete="current-password">
                </div>

                <div>
                    <label>
                        <input type="checkbox" name="remember" value="1">
                        Remember me
                    </label>
                </div>

                <button type="submit">Login</button>
            </form>
        </section>

        <section id="signup">
            <h1>Sign Up</h1>

            <p><label for="toggle-login">Jump to login</label></p>

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
