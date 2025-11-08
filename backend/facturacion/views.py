# facturacion/views.py
from datetime import date

from django.db import transaction
from django.http import Http404
from django.template.loader import render_to_string

from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.filters import SearchFilter, OrderingFilter

from django.db.models import Sum, F, Value, DecimalField
from django.db.models.functions import Coalesce

from django.core.mail import EmailMessage
from .pdf_utils import render_factura_pdf_bytes
from .models import Factura, Pago, Proyecto
from .serializers import FacturaSerializer, PagoSerializer, ProyectoSerializer

def enviar_factura_email(factura):
    if not factura.cliente.email:
        return False, 'Cliente sin email'

    # Generar PDF con wkhtmltopdf (pdfkit)
    pdf = render_factura_pdf_bytes(factura)

    subject = f'Factura {factura.nro} - {factura.cliente.razon_social}'
    body = 'Adjuntamos su factura. Muchas gracias.'
    msg = EmailMessage(subject=subject, body=body, to=[factura.cliente.email])
    msg.attach(filename=f'factura_{factura.nro}.pdf', content=pdf, mimetype='application/pdf')
    msg.send()
    return True, 'OK'

class ProyectoViewSet(ModelViewSet):
    queryset = Proyecto.objects.all().order_by("cliente__razon_social", "nombre")
    serializer_class = ProyectoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["nombre", "cliente__razon_social"]
    ordering_fields = ["nombre", "estado"]

    # permitir /api/proyectos/?cliente=ID
    def get_queryset(self):
        qs = super().get_queryset()
        cid = self.request.query_params.get("cliente")
        if cid:
            qs = qs.filter(cliente_id=cid)
        return qs

class FacturaViewSet(ModelViewSet):
    queryset = Factura.objects.all().order_by('-fecha')  # ya existe 'fecha'
    serializer_class = FacturaSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nro', 'cliente__razon_social']
    ordering_fields = ['fecha', 'vencimiento', 'total', 'id']

    # Crear y (opcional) enviar por mail automáticamente
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)

        with transaction.atomic():
            factura: Factura = ser.save()  # tu serializer debe crear ítems y recalcular total

        # activar con ?enviar_mail=1 (o true)
        enviar = request.query_params.get("enviar_mail", "").lower() in ("1", "true", "yes")
        if enviar:
            try:
                ok, msg = enviar_factura_email(factura)
                if not ok:
                    # no rompemos la creación si falla el mail
                    print("WARN email factura:", msg)
            except Exception as e:
                print("WARN email factura EXC:", e)

        headers = self.get_success_headers(ser.data)
        return Response(ser.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["GET"])
def aging_view(request):
    dec0 = Value(0, output_field=DecimalField(max_digits=12, decimal_places=2))
    qs = (
        Factura.objects.filter(estado__in=["ABIERTA", "PARCIAL"])
        .annotate(
            pagado=Coalesce(Sum("pagos__monto"), dec0),
            saldo=F("total") - Coalesce(Sum("pagos__monto"), dec0),
        )
        .values("id", "vencimiento", "saldo")
    )

    out = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "90+": 0.0}
    today = date.today()

    for f in qs:
        saldo = f["saldo"]
        if saldo is None or float(saldo) <= 0:
            continue
        dias = (today - f["vencimiento"]).days
        if dias <= 30:
            band = "0-30"
        elif dias <= 60:
            band = "31-60"
        elif dias <= 90:
            band = "61-90"
        else:
            band = "90+"
        out[band] += float(saldo)

    return Response(out)


class PagoViewSet(ModelViewSet):
    queryset = Pago.objects.all().order_by('-fecha', '-id')
    serializer_class = PagoSerializer
