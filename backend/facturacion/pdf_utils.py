# facturacion/pdf_utils.py
import os, pdfkit
from django.template.loader import render_to_string

WKHTML = os.getenv('WKHTMLTOPDF_CMD', r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe')
CFG = pdfkit.configuration(wkhtmltopdf=WKHTML)

def render_factura_pdf_bytes(factura, base_url: str = ''):
    html = render_to_string('facturacion/factura.html', {'f': factura})
    return pdfkit.from_string(html, False, configuration=CFG)
