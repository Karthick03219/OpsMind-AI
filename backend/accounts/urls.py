from django.urls import path
from .views import HealthCheckView, RegisterView, LoginView, ProfileView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("profile/", ProfileView.as_view(), name="profile"),
]