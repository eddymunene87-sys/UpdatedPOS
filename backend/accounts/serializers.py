from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'role', 'duty', 'is_active', 'password', 'date_joined')
        read_only_fields = ('id', 'date_joined')

    def validate(self, attrs):
        actor = self.context['request'].user
        target = self.instance

        if target is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'A password is required when creating a user.'})

        if actor.is_superuser:
            return attrs

        if target and (target.is_superuser or target.role != User.Role.CASHIER):
            raise serializers.ValidationError('Managers can only manage cashier accounts.')

        if attrs.get('role', User.Role.CASHIER) != User.Role.CASHIER:
            raise serializers.ValidationError({'role': 'Managers can only create or manage cashier accounts.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('password', None)
        return super().update(instance, validated_data)


class PasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'role', 'duty', 'is_superuser')
        read_only_fields = ('username', 'role', 'duty', 'is_superuser')
