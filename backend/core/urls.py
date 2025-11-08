# core/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from facturacion.views_pdf import factura_pdf
# ViewSets base (no deben fallar)
from clientes.views import ClienteViewSet
from facturacion.views import FacturaViewSet, PagoViewSet, ProyectoViewSet, aging_view
from facturacion.views_reportes import pagos_tiempo_resumen, pagos_tiempo_top
# Reportes (no dependen de weasyprint)
from facturacion.views_reportes import ingresos_por_mes, top_clientes_pagos, estado_cartera
from facturacion.views_reportes import pagos_tiempo_resumen, pagos_tiempo_top
# Auth (opcional, ya lo tenías)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
# core/urls.py (fragmento de imports)
from facturacion.views_email import enviar_factura_email
from facturacion.views_reportes import (
    ingresos_por_mes,
    top_clientes_pagos,
    estado_cartera,
    pagos_tiempo_resumen,
    pagos_tiempo_top,
)

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)
router.register(r'facturas', FacturaViewSet)
router.register(r'pagos', PagoViewSet)
router.register(r'proyectos', ProyectoViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),

    # Reportes
    path('api/reportes/aging/', aging_view),
    path('api/reportes/ingresos-por-mes/', ingresos_por_mes),
    path('api/reportes/estado-cartera/', estado_cartera),
    path('api/facturas/<int:pk>/pdf/', factura_pdf),
    # Auth JWT
    path('api/auth/token/', TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/reportes/ingresos-por-mes/', ingresos_por_mes),
    path('api/reportes/top-clientes-pagos/', top_clientes_pagos),
    path('api/reportes/estado-cartera/', estado_cartera),
    path('api/reportes/pagos-tiempo/resumen/', pagos_tiempo_resumen),
    path('api/reportes/pagos-tiempo/top/', pagos_tiempo_top),
    path('api/facturas/<int:pk>/enviar/', enviar_factura_email),
]

# ---- Rutas opcionales que requieren WeasyPrint (PDF/email) ----
# Se agregan solo si el import funciona; así no bloquean migrate/runserver si no está instalado.
try:
    from facturacion.views_pdf import factura_pdf
    from facturacion.views_email import enviar_factura_email

    urlpatterns += [
        path('api/facturas/<int:pk>/pdf/', factura_pdf),
        path('api/facturas/<int:pk>/enviar/', enviar_factura_email),
    ]
except ImportError:
    # WeasyPrint (u otro requisito) no está instalado: omitimos estas rutas por ahora.
    pass




