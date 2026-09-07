from rest_framework import serializers

from .models import Category, Inventory, Product, Repair, Sale, SaleItem, StockEntry


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    quantity = serializers.IntegerField(source='inventory.quantity', read_only=True)
    low_stock_threshold = serializers.IntegerField(source='inventory.low_stock_threshold', read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'category', 'category_name', 'buying_price', 'selling_price', 'description', 'is_active', 'quantity', 'low_stock_threshold', 'created_at', 'updated_at')
        read_only_fields = ('id', 'quantity', 'low_stock_threshold', 'created_at', 'updated_at')


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Inventory
        fields = ('id', 'product', 'product_name', 'quantity', 'low_stock_threshold', 'last_updated')
        read_only_fields = ('id', 'product', 'product_name', 'last_updated')


class StockEntrySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    added_by_username = serializers.CharField(source='added_by.username', read_only=True)

    class Meta:
        model = StockEntry
        fields = ('id', 'product', 'product_name', 'quantity', 'unit_cost', 'added_by_username', 'created_at')
        read_only_fields = ('id', 'product_name', 'added_by_username', 'created_at')


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SaleItem
        fields = ('id', 'product', 'product_name', 'quantity', 'unit_price', 'total_price')
        read_only_fields = fields


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_username = serializers.CharField(source='cashier.username', read_only=True)

    class Meta:
        model = Sale
        fields = ('id', 'sale_number', 'customer_name', 'payment_method', 'total_amount', 'cashier_username', 'items', 'created_at', 'updated_at')
        read_only_fields = fields


class SaleItemInputSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)


class SaleCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices, default=Sale.PaymentMethod.CASH)
    items = SaleItemInputSerializer(many=True, allow_empty=False)


class RepairSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Repair
        fields = ('id', 'ticket_number', 'customer_name', 'customer_phone', 'device_name', 'issue_description', 'status', 'cost', 'created_by_username', 'created_at', 'completed_at')
        read_only_fields = ('id', 'ticket_number', 'created_by_username', 'created_at')
