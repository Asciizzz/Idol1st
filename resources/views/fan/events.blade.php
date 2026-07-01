@extends('fan.layout')


@section('content')
<style>
    .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }
</style>

    <h1>
        Upcoming Events
    </h1>

    <div class="grid">
        @foreach($events as $event)
            <div class="card">
                <h2>
                    {{ $event->title }}
                </h2>

                <p>
                    Type:
                    {{ $event->event_type }}
                </p>
                <p>
                    Date:
                    {{ $event->start_datetime }}
                </p>
                <p>
                    Location:
                    {{ $event->location }}
                </p>
            </div>
        @endforeach
    </div>
@endsection
