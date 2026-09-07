from django.db import models

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    class Role(models.TextChoices):
        MANAGER = 'manager', 'Manager'
        CASHIER = 'cashier', 'Cashier'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CASHIER)
    duty = models.CharField(max_length=150, blank=True)

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER
