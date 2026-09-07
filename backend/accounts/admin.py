from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User

@admin.register(User)
class POSUserAdmin(UserAdmin):
    fieldsets = list(UserAdmin.fieldsets) + [
        ('POS access', {'fields': ('role', 'duty')}),
    ]
    add_fieldsets = list(UserAdmin.add_fieldsets) + [
        ('POS access', {'fields': ('role', 'duty')}),
    ]
    list_display = ('username', 'email', 'role', 'duty', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
