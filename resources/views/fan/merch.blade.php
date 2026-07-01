@extends('fan.layout')

@section('content')

<style>
    h1 {
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 15px;
    }

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
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 10px 0;
    }

    .card p {
        font-size: 14px;
        color: #555;
        margin-bottom: 12px;
        min-height: 40px;
    }

    .price {
        font-size: 18px;
        font-weight: 700;
        color: #ff4d6d;
        margin-bottom: 15px;
    }

    .buy-btn {
        width: 100%;
        padding: 12px 16px;

        background: linear-gradient(135deg, #222, #444);
        color: #fff;

        border: none;
        border-radius: 10px;

        font-size: 14px;
        font-weight: 600;

        cursor: pointer;

        transition: all 0.2s ease-in-out;

        box-shadow: 0 6px 18px rgba(0,0,0,0.15);
    }

    .buy-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    }

    .buy-btn:active {
        transform: translateY(0);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
</style>

<h1>
    Official Merch
</h1>

<div class="grid">

    @foreach($products as $product)

        <div class="card">

            <div>
                <h2>{{ $product->name }}</h2>

                <p>
                    {{ $product->description }}
                </p>

                <div class="price">
                    ${{ $product->base_price }}
                </div>
            </div>

            <form action="/cart/add" method="POST">
                @csrf

                <input type="hidden" name="product_id" value="{{ $product->id }}">

                <button class="buy-btn" type="submit">
                    Add to Cart
                </button>
            </form>

        </div>

    @endforeach

</div>

@endsection
