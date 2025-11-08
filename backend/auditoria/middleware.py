import json
from django.utils.deprecation import MiddlewareMixin
from .models import UserActionLog

MAP = {
  ('POST', '/api/clientes/'): 'CLIENTE_CREATE',
  ('PUT',  '/api/clientes/'): 'CLIENTE_UPDATE',
  ('POST', '/api/clientes/', 'desactivar'): 'CLIENTE_DEACTIVATE',
  ('POST', '/api/facturas/'): 'FACTURA_CREATE',
  ('POST', '/api/pagos/'): 'PAGO_CREATE',
}

class UserActionLogMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        request._log_candidate = None
        path = request.path
        method = request.method
        action = None

        # Detectar acciones por ruta
        if path.startswith('/api/clientes/') and path.endswith('/desactivar/') and method=='POST':
            action = 'CLIENTE_DEACTIVATE'
        elif path == '/api/clientes/' and method=='POST':
            action = 'CLIENTE_CREATE'
        elif path.startswith('/api/clientes/') and method in ['PUT', 'PATCH']:
            action = 'CLIENTE_UPDATE'
        elif path == '/api/facturas/' and method=='POST':
            action = 'FACTURA_CREATE'
        elif path == '/api/pagos/' and method=='POST':
            action = 'PAGO_CREATE'

        if action:
            request._log_candidate = {'action': action}
        return None

    def process_response(self, request, response):
        if getattr(request, '_log_candidate', None):
            try:
                body = {}
                if request.body:
                    body = json.loads(request.body.decode('utf-8'))
            except Exception:
                body = {}
            UserActionLog.objects.create(
                user=getattr(request, 'user', None) if request.user.is_authenticated else None,
                method=request.method,
                path=request.path,
                action=request._log_candidate['action'],
                ip=(request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR','').split(',')[0] or None),
                payload=body
            )
        return response

