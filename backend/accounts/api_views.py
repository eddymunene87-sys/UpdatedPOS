from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import User
from .permissions import IsManagerOrSuperuser
from .serializers import AccountSerializer, PasswordResetSerializer, UserSerializer


class UserViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = UserSerializer
    permission_classes = (IsManagerOrSuperuser,)
    http_method_names = ('get', 'post', 'patch', 'delete', 'head', 'options')

    def get_queryset(self):
        if self.request.user.is_superuser:
            return User.objects.all().order_by('username')
        return User.objects.filter(role=User.Role.CASHIER, is_superuser=False).order_by('username')

    @action(detail=False, methods=('get', 'patch'), permission_classes=(IsAuthenticated,))
    def me(self, request):
        if request.method == 'PATCH':
            serializer = AccountSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(AccountSerializer(request.user).data)

    @action(detail=True, methods=('post',), permission_classes=(IsManagerOrSuperuser,), url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=('password',))
        return Response({'detail': f'Password reset for {user.username}.'}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=('is_active',))
        return Response({'detail': f'{user.username} was deactivated.'}, status=status.HTTP_200_OK)
