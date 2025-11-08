# facturacion/views_email.py
from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from .models import Factura

def _render_pdf_from_html(html: str) -> bytes:
    """
    Intenta pdfkit (wkhtmltopdf). Si no está, intenta WeasyPrint.
    Importa librerías solo cuando se usan para evitar warnings al iniciar.
    """
    # 1) pdfkit → wkhtmltopdf
    try:
        import pdfkit
        cfg = None
        cmd = getattr(settings, 'WKHTMLTOPDF_CMD', None)
        if cmd:
            cfg = pdfkit.configuration(wkhtmltopdf=cmd)
        return pdfkit.from_string(html, False, configuration=cfg)
    except Exception:
        pass

    # 2) WeasyPrint (si está bien instalada)
    try:
        from weasyprint import HTML
        base = getattr(settings, 'BASE_URL', None)
        return HTML(string=html, base_url=base).write_pdf()
    except Exception as e:
        raise RuntimeError(
            'No hay backend de PDF utilizable. Instala wkhtmltopdf + pdfkit, '
            'o completa las dependencias de WeasyPrint. Detalle: ' + str(e)
        )

@csrf_exempt
def enviar_factura_email(request, pk: int):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)

    try:
        f = (Factura.objects
             .select_related('cliente', 'proyecto')
             .prefetch_related('items', 'pagos')
             .get(pk=pk))
    except Factura.DoesNotExist:
        return JsonResponse({'error': 'Factura no encontrada'}, status=404)

    if not f.cliente.email:
        return JsonResponse({'error': 'El cliente no tiene email cargado'}, status=400)

    html = render_to_string('facturacion/factura.html', {'f': f})

    try:
        pdf_bytes = _render_pdf_from_html(html)
    except Exception as e:
        return JsonResponse({'error': f'Error generando PDF: {e}'}, status=500)

    subject = f'Factura {f.nro} - {f.cliente.razon_social}'
    body = (
        f'Hola {f.cliente.razon_social},\n\n'
        'Adjuntamos su factura. Muchas gracias.\n\n'
        'Saludos,\nSGI'
    )
    msg = EmailMessage(
        subject=subject,
        body=body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        to=[f.cliente.email],
    )
    msg.attach(filename=f'factura_{f.nro}.pdf', content=pdf_bytes, mimetype='application/pdf')

    try:
        sent = msg.send()
        if sent <= 0:
            return JsonResponse({'error': 'No se pudo enviar el email'}, status=500)
    except Exception as e:
        return JsonResponse({'error': f'Error SMTP: {e}'}, status=500)

    return JsonResponse({'ok': True})
