# facturacion/views_pdf.py
from django.http import HttpResponse, Http404
from .models import Factura
from .pdf_utils import render_factura_pdf_bytes

def factura_pdf(request, pk: int):
    try:
        f = (Factura.objects
             .select_related('cliente')
             .prefetch_related('items')
             .get(pk=pk))
    except Factura.DoesNotExist:
        raise Http404('Factura no encontrada')

    pdf = render_factura_pdf_bytes(f, base_url=request.build_absolute_uri('/'))
    resp = HttpResponse(pdf, content_type='application/pdf')
    resp['Content-Disposition'] = f'inline; filename=factura_{f.nro}.pdf'
    return resp
