from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import F
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Category, Inventory, Product, Repair, Sale, SaleItem, StockEntry
from .serializers import (
    CategorySerializer,
    InventorySerializer,
    ProductSerializer,
    RepairSerializer,
    SaleCreateSerializer,
    SaleSerializer,
    StockEntrySerializer,
)


class AuthenticatedModelViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)


class CategoryViewSet(AuthenticatedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(AuthenticatedModelViewSet):
    queryset = Product.objects.select_related('category', 'inventory').all()
    serializer_class = ProductSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            product = serializer.save()
            Inventory.objects.create(product=product)


class InventoryViewSet(AuthenticatedModelViewSet):
    queryset = Inventory.objects.select_related('product').all()
    serializer_class = InventorySerializer
    http_method_names = ('get', 'patch', 'head', 'options')


class StockEntryViewSet(AuthenticatedModelViewSet):
    queryset = StockEntry.objects.select_related('product', 'added_by').all()
    serializer_class = StockEntrySerializer
    http_method_names = ('get', 'post', 'head', 'options')

    def perform_create(self, serializer):
        with transaction.atomic():
            stock_entry = serializer.save(added_by=self.request.user)
            inventory, _ = Inventory.objects.select_for_update().get_or_create(product=stock_entry.product)
            inventory.quantity = F('quantity') + stock_entry.quantity
            inventory.save(update_fields=('quantity', 'last_updated'))


class SaleViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (IsAuthenticated,)
    queryset = Sale.objects.select_related('cashier').prefetch_related('items__product').all()
    serializer_class = SaleSerializer

    def create(self, request, *args, **kwargs):
        request_serializer = SaleCreateSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        requested_items = request_serializer.validated_data['items']

        quantities = {}
        for item in requested_items:
            product_id = item['product'].id
            quantities[product_id] = quantities.get(product_id, 0) + item['quantity']

        with transaction.atomic():
            inventories = {
                inventory.product_id: inventory
                for inventory in Inventory.objects.select_for_update().select_related('product').filter(product_id__in=quantities)
            }
            missing_inventory = set(quantities) - set(inventories)
            if missing_inventory:
                raise ValidationError({'items': 'One or more products have no inventory record.'})

            for product_id, quantity in quantities.items():
                inventory = inventories[product_id]
                if inventory.quantity < quantity:
                    raise ValidationError({'items': f'Insufficient stock for {inventory.product.name}. Available: {inventory.quantity}.'})

            sale = Sale.objects.create(
                sale_number=f'SALE-{uuid4().hex[:12].upper()}',
                customer_name=request_serializer.validated_data.get('customer_name', ''),
                payment_method=request_serializer.validated_data['payment_method'],
                total_amount=Decimal('0.00'),
                cashier=request.user,
            )

            total_amount = Decimal('0.00')
            for product_id, quantity in quantities.items():
                inventory = inventories[product_id]
                unit_price = inventory.product.selling_price
                line_total = unit_price * quantity
                SaleItem.objects.create(
                    sale=sale,
                    product=inventory.product,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=line_total,
                )
                inventory.quantity -= quantity
                inventory.save(update_fields=('quantity', 'last_updated'))
                total_amount += line_total

            sale.total_amount = total_amount
            sale.save(update_fields=('total_amount', 'updated_at'))

        sale = Sale.objects.select_related('cashier').prefetch_related('items__product').get(pk=sale.pk)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class RepairViewSet(AuthenticatedModelViewSet):
    queryset = Repair.objects.select_related('created_by').all()
    serializer_class = RepairSerializer

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            ticket_number=f'REPAIR-{uuid4().hex[:12].upper()}',
        )
