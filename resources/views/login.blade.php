<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idol1st — Login</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0f0f13;
            font-family: system-ui, -apple-system, sans-serif;
            color: #e2e2e2;
        }

        .card {
            width: 100%;
            max-width: 400px;
            background: #1a1a22;
            border: 1px solid #2e2e3a;
            border-radius: 12px;
            padding: 2.5rem;
        }

        .card h1 {
            font-size: 1.4rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .card p {
            font-size: 0.875rem;
            color: #888;
            margin-bottom: 2rem;
        }

        .field { margin-bottom: 1.25rem; }

        label {
            display: block;
            font-size: 0.8rem;
            font-weight: 500;
            color: #aaa;
            margin-bottom: 0.4rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        input {
            width: 100%;
            padding: 0.65rem 0.9rem;
            background: #0f0f13;
            border: 1px solid #2e2e3a;
            border-radius: 7px;
            color: #e2e2e2;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.15s;
        }

        input:focus { border-color: #6c63ff; }

        .error-bag {
            background: #2d1a1a;
            border: 1px solid #7f2020;
            border-radius: 7px;
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            color: #f87171;
            margin-bottom: 1.25rem;
        }

        button {
            width: 100%;
            padding: 0.75rem;
            background: #6c63ff;
            border: none;
            border-radius: 7px;
            color: #fff;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s;
            margin-top: 0.5rem;
        }

        button:hover { background: #574fd6; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Idol1st</h1>
        <p>Sign in to continue to the workspace</p>

        @if ($errors->any())
            <div class="error-bag">
                {{ $errors->first() }}
            </div>
        @endif

        @if (session('error'))
            <div class="error-bag">
                {{ session('error') }}
            </div>
        @endif

        <form method="POST" action="{{ route('login.submit') }}">
            @csrf

            <div class="field">
                <label for="email">Email</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value="{{ old('email') }}"
                    autocomplete="email"
                    autofocus
                    required
                />
            </div>

            <div class="field">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    autocomplete="current-password"
                    required
                />
            </div>

            <button type="submit">Sign in</button>
        </form>
    </div>
</body>
</html>
