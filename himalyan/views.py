from django.shortcuts import render


def homePage(request):
    therapists = [
        {
            "name": "Anjali Sherpa",
            "experience": 8,
            "rating": 4.9,
            "customers": 320,
            "tags": ["Deep Tissue", "Sports Recovery"],
            "photo": "image/therapist-1.jpg",
        },
        {
            "name": "Pema Gurung",
            "experience": 6,
            "rating": 4.8,
            "customers": 210,
            "tags": ["Relaxation", "Aromatherapy"],
            "photo": "image/therapist-1.jpg",
        },
        {
            "name": "Tashi Lama",
            "experience": 10,
            "rating": 5.0,
            "customers": 480,
            "tags": ["Deep Tissue", "Himalayan Massage"],
            "photo": "image/therapist-1.jpg",
        },
    ]
    return render(request, "index.html", {"therapists": therapists})