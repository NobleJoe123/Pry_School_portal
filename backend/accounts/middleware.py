from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

class ActiveUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user or not request.user.is_authenticated:
            try:
                authenticator = JWTAuthentication()
                auth_res = authenticator.authenticate(request)
                if auth_res:
                    user, token = auth_res
                    request.user = user
            except Exception:
                pass

        if request.user and request.user.is_authenticated:
            now = timezone.now()
            last_seen = getattr(request.user, 'last_seen', None)
            if not last_seen or now - last_seen > timezone.timedelta(minutes=1):
                type(request.user).objects.filter(pk=request.user.pk).update(last_seen=now)
                request.user.last_seen = now

        return self.get_response(request)
