@extends('fan.layout')

@section('content')
<style>
    .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }
</style>
    <h1>
        Latest News
    </h1>

    <div class="grid">
        @foreach($posts as $post)
            <div class="card">
                <h2>
                    {{ $post->title }}
                </h2>
                <p>
                    {{ $post->content }}
                </p>
                <p>
                    Published:
                    {{ $post->published_at }}
                </p>
            </div>
        @endforeach
    </div>

@endsection
