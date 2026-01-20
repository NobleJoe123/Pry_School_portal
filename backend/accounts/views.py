from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def user_view(request):
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'profile_photo': user.profile_photo.url if user.profile_photo else None,
    })
        