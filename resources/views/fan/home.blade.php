@extends('fan.layout')


@section('content')


    <h1>
        Welcome to {{ $tenant->name }}
    </h1>


    <h2>
        Latest News
    </h2>


    <div class="grid">

        @foreach($posts as $post)

            <div class="card">

                <h3>
                    {{ $post->title }}
                </h3>


                <p>
                    {{ Str::limit($post->content, 120) }}
                </p>

            </div>

        @endforeach

    </div>




    <h2>
        Upcoming Events
    </h2>


    <div class="grid">

        @foreach($events as $event)

            <div class="card">

                <h3>
                    {{ $event->title }}
                </h3>


                <p>
                    {{ $event->location }}
                </p>


                <p>
                    {{ $event->start_datetime }}
                </p>


            </div>

        @endforeach

    </div>




@endsection
