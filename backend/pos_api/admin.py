from django.contrib import admin

from .models import Category, Inventory, Product, Repair, Sale, SaleItem, StockAdjustment, StockEntry


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'buying_price', 'selling_price', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name',)


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'low_stock_threshold', 'last_updated')
    search_fields = ('product__name',)


@admin.register(StockEntry)
class StockEntryAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'unit_cost', 'added_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('product__name', 'added_by__username')


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity_change', 'quantity_before', 'quantity_after', 'adjusted_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('product__name', 'adjusted_by__username', 'reason')


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'unit_price', 'total_price')


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('sale_number', 'cashier', 'payment_method', 'total_amount', 'created_at')
    list_filter = ('payment_method', 'created_at')
    search_fields = ('sale_number', 'cashier__username')
    inlines = (SaleItemInline,)


@admin.register(Repair)
class RepairAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'customer_name', 'device_name', 'status', 'cost', 'created_by')
    list_filter = ('status',)
    search_fields = ('ticket_number', 'customer_name', 'customer_phone')
