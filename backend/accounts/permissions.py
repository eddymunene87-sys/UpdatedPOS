from rest_framework.permissions import BasePermission


class IsManagerOrSuperuser(BasePermission):
    message = 'Only a manager or superuser can manage user accounts.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.is_manager))


class IsSuperuser(BasePermission):
    message = 'Only a superuser can reset passwords.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
