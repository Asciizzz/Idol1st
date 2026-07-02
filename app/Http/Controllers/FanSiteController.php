<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use App\Models\IdolEvent;
use App\Models\MerchProduct;
use App\Models\MembershipTier;

use App\Models\MerchCart;
use App\Models\MerchCartItem;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use App\Models\Fan;

use App\Models\MerchOrder;
use App\Models\MerchOrderItem;
use App\Models\Payment;
use App\Models\Address;
use Illuminate\Support\Facades\DB;

class FanSiteController extends Controller
{
    public function home()
    {
        $tenant = request()->tenant();

        return view('fan.home', [
            'tenant' => $tenant,

            'posts' => BlogPost::forTenant($tenant)
                ->where('status', 'PUBLISHED')
                ->latest()
                ->limit(3)
                ->get(),

            'events' => IdolEvent::forTenant($tenant)
                ->where('status', 'UPCOMING')
                ->limit(3)
                ->get(),

            'products' => MerchProduct::forTenant($tenant)
                ->where('status', 'ACTIVE')
                ->limit(3)
                ->get(),

            'tiers' => MembershipTier::forTenant($tenant)
                ->where('is_active', true)
                ->get()
        ]);
    }

    public function news()
    {
        $tenant = request()->tenant();

        return view('fan.news', [
            'posts' => BlogPost::forTenant($tenant)
                ->where('status', 'PUBLISHED')
                ->latest()
                ->get()
        ]);
    }

    public function events()
    {
        $tenant = request()->tenant();

        return view('fan.events', [
            'events' => IdolEvent::forTenant($tenant)
                ->where('status', 'UPCOMING')
                ->get()
        ]);
    }

    public function merch()
    {
        $tenant = request()->tenant();

        return view('fan.merch', [

            'products' => MerchProduct::forTenant($tenant)
                ->where('status', 'ACTIVE')
                ->get()

        ]);
    }

    public function membership()
    {
        $tenant = request()->tenant();

        return view('fan.membership', [
            'tiers' => MembershipTier::forTenant($tenant)
                ->where('is_active', true)
                ->get()
        ]);

    }

    public function cart()
    {
        $tenant = request()->tenant();

        $fan = Auth::guard('fan')->user();

        $cart = MerchCart::forTenant($tenant)
            ->where('fan_id', $fan->id)
            ->first();

        $items = $cart
            ? $cart->items()->with('product')->get()
            : collect();

        return view('fan.cart', [
            'items' => $items
        ]);

    }

    public function addToCart(Request $request)
    {
        $tenant = request()->tenant();

        $fan = Auth::guard('fan')->user();

        $product = MerchProduct::forTenant($tenant)
            ->findOrFail($request->product_id);

        $cart = MerchCart::firstOrCreate([
            'fan_id' => $fan->id,
            'tenant_id' => $tenant->id
        ]);

        $variantId = $request->variant_id ?? $product->default_variant_id;

        MerchCartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'variant_id' => $variantId,
            'quantity' => 1,
            'unit_price' => $product->base_price
        ]);

        return redirect()->route('fan.cart', ['tenant' => $tenant->slug]);
    }

    public function checkout()
    {
        $tenant = request()->tenant();
        $fan = Auth::guard('fan')->user();

        $cart = MerchCart::forTenant($tenant)
            ->where('fan_id', $fan->id)
            ->first();

        $items = $cart
            ? $cart->items()->with('product')->get()
            : collect();

        if ($items->isEmpty()) {
            return redirect()->route('fan.cart', ['tenant' => $tenant->slug])
                ->withErrors(['cart' => 'Your cart is empty.']);
        }

        $total = $items->sum(fn ($item) => $item->unit_price * $item->quantity);

        $address = $fan->addresses()
            ->where('is_default', true)
            ->first();

        return view('fan.checkout', [
            'items'   => $items,
            'total'   => $total,
            'address' => $address,
        ]);
    }

    public function placeOrder(Request $request)
    {
        $tenant = request()->tenant();
        $fan = Auth::guard('fan')->user();

        $request->validate([
            'shipping_street'      => ['required', 'string', 'max:255'],
            'shipping_city'        => ['required', 'string', 'max:255'],
            'shipping_state'       => ['nullable', 'string', 'max:255'],
            'shipping_country'     => ['required', 'string', 'max:255'],
            'shipping_postal_code' => ['nullable', 'string', 'max:255'],
            'payment'              => ['required', 'in:CREDIT_CARD,PAYPAL,BANK_TRANSFER'],
        ]);

        $cart = MerchCart::forTenant($tenant)
            ->where('fan_id', $fan->id)
            ->first();

        $items = $cart
            ? $cart->items()->with(['product', 'variant'])->get()
            : collect();

        if ($items->isEmpty()) {
            return redirect()->route('fan.cart', ['tenant' => $tenant->slug])
                ->withErrors(['cart' => 'Your cart is empty.']);
        }

        $total = $items->sum(fn ($item) => $item->unit_price * $item->quantity);

        $order = DB::transaction(function () use ($request, $tenant, $fan, $items, $total, $cart) {

            $order = MerchOrder::create([
                'fan_id'               => $fan->id,
                'tenant_id'            => $tenant->id,
                'shipping_street'      => $request->shipping_street,
                'shipping_city'        => $request->shipping_city,
                'shipping_state'       => $request->shipping_state,
                'shipping_country'     => $request->shipping_country,
                'shipping_postal_code' => $request->shipping_postal_code,
                'total_amount'         => $total,
                'currency'             => 'USD',
                'status'               => 'PAID',
                'placed_at'            => now(),
            ]);

            foreach ($items as $item) {

                MerchOrderItem::create([
                    'order_id'     => $order->id,
                    'product_name' => $item->product->name,
                    'sku'          => $item->variant->sku ?? ('PROD-' . $item->product_id),
                    'quantity'     => $item->quantity,
                    'unit_price'   => $item->unit_price,
                    'subtotal'     => $item->unit_price * $item->quantity,
                ]);

            }

            Payment::create([
                'order_id'  => $order->id,
                'amount'    => $total,
                'currency'  => 'USD',
                'status'    => 'COMPLETED',
                'method'    => $request->payment,
                'paid_at'   => now(),
            ]);

            $cart->items()->delete();
            $cart->delete();

            return $order;

        });

        return redirect()->route('fan.order.success', [
            'tenant' => $tenant->slug,
            'order'  => $order->id,
        ]);
    }

    public function orderSuccess(string $order)
    {
        $tenant = request()->tenant();
        $fan = Auth::guard('fan')->user();

        $order = MerchOrder::findOrFail($order);

        if ($order->fan_id !== $fan->id || $order->tenant_id !== $tenant->id) {
            abort(403);
        }

        $order->load('items');

        return view('fan.order-success', [
            'order' => $order,
        ]);
    }

    public function login()
    {
        return view('fan.login');
    }

    public function loginSubmit(Request $request)
    {
        $tenant = request()->tenant();

        $fan = Fan::where('tenant_id', $tenant->id)
            ->where('email', $request->email)
            ->first();

        if (
            !$fan || !password_verify(
                $request->password,
                $fan->password
            )
        ) {
            return back()
                ->withErrors([
                    'email' => 'Invalid login'
                ]);
        }

        Auth::guard('fan')->login($fan);

        $request->session()->regenerate();

        return redirect()->route('fan.home', ['tenant' => $tenant->slug]);
    }

    public function logout(Request $request)
    {
        $tenant = request()->tenant();

        Auth::guard('fan')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('fan.home', ['tenant' => $tenant->slug]);
    }
}
