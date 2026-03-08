from rest_framework import permissions



class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow only admin to edit
    
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == 'admin'
    
class IsAdmin(permissions.BasePermission):
    """
    Custom permission to allow only admin users.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'