<!DOCTYPE html>

<html>

<head>

    <title>
        {{ request()->tenant()->name }}
    </title>


    <style>
        body {
            font-family: Arial;
            margin: 0;
            background: #fafafa;
            color: #222;
        }

        header {
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 50px;
            background: white;
            border-bottom: 1px solid #ddd;
        }


        nav a {
            margin-left: 25px;
            text-decoration: none;
            color: #333;
        }

        .fan-avatar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            margin-left: 25px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff4d6d, #ff7a59);
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            vertical-align: middle;
        }

        .fan-logout-btn {
            margin-left: 10px;
            border: none;
            background: none;
            color: #333;
            font-size: 14px;
            cursor: pointer;
            text-decoration: underline;
            vertical-align: middle;
        }

        .container {
            padding: 40px 80px;
        }

        .card {
            background: white;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
        }

        .grid {
            display: grid;
            grid-template-columns:
                repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
    </style>
</head>


<body>
    <header>
        <h2>
            {{ request()->tenant()->name }}
        </h2>

        <nav>
            <a href="/">
                Home
            </a>

            <a href="/news">
                News
            </a>

            <a href="/events">
                Events
            </a>

            <a href="/merch">
                Merch
            </a>

            <a href="/membership">
                Membership
            </a>

            <a href="/cart">
                🛒 Cart
            </a>

            <!-- Login block -->
            @if (auth('fan')->check())
                @php($fan = auth('fan')->user())
                <span class="fan-avatar" title="{{ $fan->display_name ?? $fan->username ?? $fan->email }}">
                    {{ strtoupper(substr($fan->display_name ?? $fan->username ?? $fan->email, 0, 1)) }}
                </span>
                <form method="POST" action="{{ route('fan.logout', ['tenant'=>request()->tenant()->slug]) }}" style="display:inline">
                    @csrf
                    <button type="submit" class="fan-logout-btn">
                        Logout
                    </button>
                </form>
            @else
                <a href="{{ route('fan.login',['tenant'=>request()->tenant()->slug]) }}">
                    Login
                </a>
            @endif
        </nav>
    </header>

    <div class="container">
        @yield('content')
    </div>
</body>
</html>
