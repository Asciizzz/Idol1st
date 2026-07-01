@extends('fan.layout')

@section('content')

<style>
    * {
        box-sizing: border-box;
    }
    
    h1 {
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 20px;
    }

    .card {
        max-width: 420px;
        margin: 0 auto;
        background: #fff;
        border-radius: 14px;
        padding: 25px;

        box-shadow: 0 6px 20px rgba(0,0,0,0.08);

        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .card:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }

    form label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
        color: #333;
    }

    form input {
        width: 100%;
        padding: 12px 16px;
        margin-bottom: 15px;

        border: 1px solid #ddd;
        border-radius: 10px;

        font-size: 14px;

        outline: none;

        transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    form input:focus {
        border-color: #ff4d6d;
        box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.15);
    }

    button {
        width: 100%;
        padding: 12px 16px;

        background: linear-gradient(135deg, #ff4d6d, #ff7a59);
        color: #fff;

        border: none;
        border-radius: 10px;

        font-size: 14px;
        font-weight: 600;

        cursor: pointer;

        transition: all 0.2s ease-in-out;

        box-shadow: 0 6px 18px rgba(255, 77, 109, 0.25);
    }

    button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(255, 77, 109, 0.35);
    }

    button:active {
        transform: translateY(0);
        box-shadow: 0 4px 12px rgba(255, 77, 109, 0.2);
    }
</style>

<h1>
    Fan Login
</h1>

<div class="card">

    <form method="POST" action="{{ route('fan.login.submit', ['tenant'=>request()->tenant()->slug]) }}">

        @csrf

        <label>Email</label>
        <input name="email" type="email" required>

        <label>Password</label>
        <input name="password" type="password" required>

        <button type="submit">
            Login
        </button>

    </form>

</div>

@endsection
