import mimetypes

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.exceptions import PermissionDenied
from django.http import FileResponse, Http404
from django.shortcuts import redirect, render


FRONTEND_ROOT = settings.BASE_DIR.parent
POS_PAGES = {'dashboard', 'sales', 'products', 'inventory', 'categories', 'repairs', 'reports', 'account', 'users'}


def home(request):
    return redirect('/dashboard.html')


@login_required
@ensure_csrf_cookie
def frontend_page(request, page):
    if page not in POS_PAGES:
        raise Http404
    if page == 'users' and not (request.user.is_superuser or request.user.is_manager):
        raise PermissionDenied
    return render(request, f'{page}.html')


def frontend_asset(request, asset_path):
    assets_root = (FRONTEND_ROOT / 'assets').resolve()
    requested_file = (assets_root / asset_path).resolve()
    if not requested_file.is_relative_to(assets_root) or not requested_file.is_file():
        raise Http404
    content_type, _ = mimetypes.guess_type(requested_file.name)
    return FileResponse(requested_file.open('rb'), content_type=content_type or 'application/octet-stream')
