from django.contrib.auth import login
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import User
from rest_framework import status




@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    return Response({'csrfToken': get_token(request)})






@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    email = request.data.get('email')
    username = request.data.get('username')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    password = request.data.get('password')
    
    if not all([email, username, first_name, last_name, password]):
        return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({'email': ['Email already exists.']}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({'username': ['Username already exists.']}, status=status.HTTP_400_BAD_REQUEST)


    user = User.objects.create_user(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
        password=password,
        role='parent'
    )
    
    # Auto-login after registration
    login(request, user)
    return Response({
        'id': str(user.id),
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'profile_photo': request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None,
    }, status=status.HTTP_201_CREATED
    )
    

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    if user and user.check_password(password):
        login(request, user)
        return Response({
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'profile_photo': request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None,
        })
    else:
        return Response(
            {'error': 'Invalid email or password.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


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
    