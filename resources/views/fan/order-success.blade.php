@extends('fan.layout')


@section('content')

<style>
    .success-card {
        max-width: 500px;
        margin: 40px auto;
        text-align: center;

        background: #fff;
        border-radius: 14px;
        padding: 40px 30px;

        box-shadow: 0 6px 20px rgba(0,0,0,0.08);
    }

    .success-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 20px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 50%;
        background: linear-gradient(135deg, #3dd68c, #2fb872);
        color: #fff;
        font-size: 32px;
    }

    .success-card h1 {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 10px;
    }

    .success-card p {
        color: #555;
        margin-bottom: 20px;
    }

    .order-id {
        display: inline-block;
        background: #fafafa;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 13px;
        color: #777;
        margin-bottom: 25px;
    }

    .order-line {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 14px;
        text-align: left;
    }

    .order-total {
        display: flex;
        justify-content: space-between;
        padding-top: 10px;
        margin-top: 10px;
        border-top: 1px solid #ddd;
        font-weight: 700;
        text-align: left;
    }

    .continue-btn {
        display: inline-block;
        margin-top: 25px;

        padding: 12px 24px;

        background: linear-gradient(135deg, #ff4d6d, #ff7a59);
        color: #fff;

        border-radius: 10px;

        font-size: 14px;
        font-weight: 600;
        text-decoration: none;

        box-shadow: 0 6px 18px rgba(255, 77, 109, 0.25);

        transition: all 0.2s ease-in-out;
    }

    .continue-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(255, 77, 109, 0.35);
    }
</style>

<div class="success-card">

    <div class="success-icon">
        ✓
    </div>

    <h1>
        Order Placed!
    </h1>

    <p>
        Thanks {{ $order->fan->display_name ?? $order->fan->username }}, your order has been received and is being processed.
    </p>

    <div class="order-id">
        Order #{{ strtoupper(substr($order->id, 0, 8)) }}
    </div>

    <div style="text-align: left;">

        @foreach ($order->items as $item)

            <div class="order-line">
                <span>{{ $item->product_name }} × {{ $item->quantity }}</span>
                <span>${{ number_format($item->subtotal, 2) }}</span>
            </div>

        @endforeach

        <div class="order-total">
            <span>Total</span>
            <span>${{ number_format($order->total_amount, 2) }}</span>
        </div>

    </div>

    <a href="{{ route('fan.home', ['tenant' => request()->tenant()->slug]) }}" class="continue-btn">
        Back to {{ request()->tenant()->name }}
    </a>

</div>

@endsection
