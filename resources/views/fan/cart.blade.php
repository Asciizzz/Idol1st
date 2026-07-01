@extends('fan.layout')

<style>
    .checkout-btn {
        width: 100%;
        max-width: 300px;

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

    .checkout-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(255, 77, 109, 0.35);
    }

    .checkout-btn:active {
        transform: translateY(0);
        box-shadow: 0 4px 12px rgba(255, 77, 109, 0.2);
    }
</style>


@section('content')
    <h1>
        Your Cart
    </h1>

    @if(count($items))
        @foreach($items as $item)
            <div class="card">
                <h2>
                    {{ $item->product->name }}
                </h2>

                <p>
                    Quantity:
                    {{ $item->quantity }}
                </p>
                <p>
                    Price:
                    ${{ $item->unit_price }}
                </p>
            </div>
        @endforeach
        <a href="/checkout">
            <button class="checkout-btn">
                Proceed to Checkout
            </button>
        </a>
    @else
        <div class="card">
            Your cart is empty.
        </div>
    @endif

@endsection
