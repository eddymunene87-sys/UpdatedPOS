from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Inventory, Product, Repair, Sale, StockAdjustment, StockEntry


class PointOfSaleApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='cashier', password='safe-password-123')
        self.client.force_authenticate(self.user)
        category = Category.objects.create(name='Accessories')
        self.product = Product.objects.create(
            name='USB Cable', category=category, buying_price=Decimal('100.00'), selling_price=Decimal('250.00')
        )
        self.inventory = Inventory.objects.create(product=self.product, quantity=5)

    def test_stock_entry_increases_inventory_and_records_actor(self):
        response = self.client.post(
            reverse('stock-entry-list'),
            {'product': self.product.id, 'quantity': 3, 'unit_cost': '110.00'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 8)
        self.assertEqual(StockEntry.objects.get().added_by, self.user)

    def test_sale_decrements_stock_and_calculates_total(self):
        response = self.client.post(
            reverse('sale-list'),
            {'payment_method': 'Cash', 'items': [{'product': self.product.id, 'quantity': 2}]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory.refresh_from_db()
        sale = Sale.objects.get()
        self.assertEqual(self.inventory.quantity, 3)
        self.assertEqual(sale.total_amount, Decimal('500.00'))
        self.assertEqual(sale.cashier, self.user)

    def test_sale_rejects_insufficient_stock_without_mutation(self):
        response = self.client.post(
            reverse('sale-list'),
            {'items': [{'product': self.product.id, 'quantity': 6}]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 5)
        self.assertFalse(Sale.objects.exists())

    def test_stock_adjustment_updates_inventory_and_preserves_audit_record(self):
        response = self.client.post(
            reverse('stock-adjustment-list'),
            {'product': self.product.id, 'quantity_change': -2, 'reason': 'Damaged item'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.inventory.refresh_from_db()
        adjustment = StockAdjustment.objects.get()
        self.assertEqual(self.inventory.quantity, 3)
        self.assertEqual((adjustment.quantity_before, adjustment.quantity_after), (5, 3))

    def test_mpesa_sale_requires_and_saves_payment_reference(self):
        missing_reference = self.client.post(
            reverse('sale-list'),
            {'payment_method': 'M-Pesa', 'items': [{'product': self.product.id, 'quantity': 1}]},
            format='json',
        )
        saved_sale = self.client.post(
            reverse('sale-list'),
            {'payment_method': 'M-Pesa', 'payment_reference': 'QWE123ABC', 'items': [{'product': self.product.id, 'quantity': 1}]},
            format='json',
        )

        self.assertEqual(missing_reference.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(saved_sale.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Sale.objects.get().payment_reference, 'QWE123ABC')

    def test_deleting_repair_archives_it_without_losing_the_record(self):
        repair = Repair.objects.create(
            ticket_number='REPAIR-TEST', customer_name='Customer', customer_phone='0712345678',
            device_name='Phone', issue_description='Screen', cost=Decimal('100.00'), created_by=self.user,
        )

        response = self.client.delete(reverse('repair-detail', args=[repair.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        repair.refresh_from_db()
        self.assertTrue(repair.is_archived)
        self.assertEqual(self.client.get(reverse('repair-list')).data, [])
