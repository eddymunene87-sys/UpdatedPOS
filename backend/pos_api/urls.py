from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, InventoryViewSet, ProductViewSet, RepairViewSet, SaleViewSet, StockAdjustmentViewSet, StockEntryViewSet

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')
router.register('inventory', InventoryViewSet, basename='inventory')
router.register('stock-entries', StockEntryViewSet, basename='stock-entry')
router.register('stock-adjustments', StockAdjustmentViewSet, basename='stock-adjustment')
router.register('sales', SaleViewSet, basename='sale')
router.register('repairs', RepairViewSet, basename='repair')

urlpatterns = [path('', include(router.urls))]
