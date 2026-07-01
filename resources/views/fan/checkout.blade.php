@extends('fan.layout')


@section('content')

<style>
    .place-order-btn {
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

    .place-order-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(255, 77, 109, 0.35);
    }

    .place-order-btn:active {
        transform: translateY(0);
        box-shadow: 0 4px 12px rgba(255, 77, 109, 0.2);
    }

    .checkout-errors {
        background: #fff0f0;
        border: 1px solid #ffcccc;
        color: #c0392b;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 15px;
        font-size: 14px;
    }

    .checkout-errors ul {
        margin: 0;
        padding-left: 18px;
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
        max-width: 400px;
        padding: 10px 14px;
        margin-bottom: 12px;

        border: 1px solid #ddd;
        border-radius: 10px;

        font-size: 14px;
    }

    .order-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 14px;
    }

    .order-total {
        display: flex;
        justify-content: space-between;
        padding-top: 10px;
        margin-top: 10px;
        border-top: 1px solid #ddd;
        font-weight: 700;
    }
</style>


    <h1>
        Checkout
    </h1>


    @if ($errors->any())

        <div class="checkout-errors">
            <ul>
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>

    @endif


    <div class="card">

        <h2>
            Order Summary
        </h2>

        @foreach ($items as $item)

            <div class="order-row">
                <span>{{ $item->product->name }} × {{ $item->quantity }}</span>
                <span>${{ number_format($item->unit_price * $item->quantity, 2) }}</span>
            </div>

        @endforeach

        <div class="order-total">
            <span>Total</span>
            <span>${{ number_format($total, 2) }}</span>
        </div>

    </div>


    <div class="card">

        <h2>
            Shipping Address
        </h2>

        <form method="POST" action="{{ route('fan.checkout.submit', ['tenant' => request()->tenant()->slug]) }}">
            @csrf

            <label>Street</label>
            <input type="text" name="shipping_street" value="{{ old('shipping_street', $address->street ?? '') }}" required>

            <label>City</label>
            <input type="text" name="shipping_city" value="{{ old('shipping_city', $address->city ?? '') }}" required>

            <label>State / Province</label>
            <input type="text" name="shipping_state" value="{{ old('shipping_state', $address->state ?? '') }}">

            <label>Country</label>
            <input type="text" name="shipping_country" value="{{ old('shipping_country', $address->country ?? '') }}" required>

            <label>Postal Code</label>
            <input type="text" name="shipping_postal_code" value="{{ old('shipping_postal_code', $address->postal_code ?? '') }}">

            <h2 style="margin-top: 25px;">
                Payment Method
            </h2>

            <label>
                <input type="radio" name="payment" value="CREDIT_CARD" {{ old('payment', 'CREDIT_CARD') == 'CREDIT_CARD' ? 'checked' : '' }}>
                Credit Card
            </label>

            <br>

            <label>
                <input type="radio" name="payment" value="PAYPAL" {{ old('payment') == 'PAYPAL' ? 'checked' : '' }}>
                Paypal
            </label>

            <br>

            <label>
                <input type="radio" name="payment" value="BANK_TRANSFER" {{ old('payment') == 'BANK_TRANSFER' ? 'checked' : '' }}>
                Bank Transfer
            </label>

            <br><br>

            <button class="place-order-btn">
                Place Order
            </button>
        </form>
    </div>

@endsection
