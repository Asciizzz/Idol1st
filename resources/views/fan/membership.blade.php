@extends('fan.layout')

@section('content')

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .card {
        background: #fff;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }

    .card h2 {
        margin: 0 0 10px 0;
        font-size: 20px;
        font-weight: 700;
    }

    .price {
        font-size: 18px;
        font-weight: 600;
        color: #ff4d6d;
        margin-bottom: 10px;
    }

    .cycle {
        color: #666;
        font-size: 14px;
    }

    .benefits {
        margin: 15px 0;
        font-size: 14px;
        color: #444;
        min-height: 40px;
    }

    .join-btn {
        width: 100%;
        padding: 12px 16px;

        background: linear-gradient(135deg, #ff4d6d, #ff7a59);
        color: #fff;

        border: none;
        border-radius: 10px;

        font-weight: 600;
        font-size: 14px;

        cursor: pointer;

        transition: all 0.2s ease-in-out;

        box-shadow: 0 6px 18px rgba(255, 77, 109, 0.25);
    }

    .join-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(255, 77, 109, 0.35);
    }

    .join-btn:active {
        transform: translateY(0);
        box-shadow: 0 4px 12px rgba(255, 77, 109, 0.2);
    }

    h1 {
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 10px;
    }
</style>

<h1>
    Membership Plans
</h1>

<div class="grid">

    @foreach($tiers as $tier)

        <div class="card">

            <div>
                <h2>{{ $tier->name }}</h2>

                <div class="price">
                    ${{ $tier->price }}
                </div>

                <div class="cycle">
                    / {{ $tier->billing_cycle }}
                </div>

                <div class="benefits">
                    Benefits coming soon.
                </div>
            </div>

            <form>
                @csrf
                <button type="submit" class="join-btn">
                    Join {{ $tier->name }}
                </button>
            </form>

        </div>

    @endforeach

</div>

@endsection
