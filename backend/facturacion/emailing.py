# facturacion/emailing.py
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

def enviar_factura_email(factura):
    if not factura.cliente.email:
        return False, 'Cliente sin email'
    html = render_to_string('facturacion/factura.html', {'f': factura})
    pdf = HTML(string=html).write_pdf()
    subject = f'Factura {factura.nro} - {factura.cliente.razon_social}'
    body = 'Adjuntamos su factura. Gracias por su preferencia.'
    msg = EmailMessage(subject=subject, body=body, to=[factura.cliente.email])
    msg.attach(filename=f'factura_{factura.nro}.pdf', content=pdf, mimetype='application/pdf')
    msg.send()
    return True, 'OK'
