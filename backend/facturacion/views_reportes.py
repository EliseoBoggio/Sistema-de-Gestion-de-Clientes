# facturacion/views_reportes.py
from datetime import date, timedelta
from collections import defaultdict

from django.db.models import Sum, F, Q, Value, DecimalField
from django.db.models.functions import TruncMonth, Coalesce
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Min
from .models import Factura, Pago
# --- Helpers internos (no son endpoints) ---
from typing import List, Dict

def _calc_pagos_tiempo() -> List[Dict]:
    """
    Devuelve lista por cliente:
      {cliente_id, cliente, pagadas, a_tiempo, ratio}
    Considera SOLO facturas pagadas (total_pagado >= total > 0).
    'A tiempo' si el acumulado de pagos con fecha <= vencimiento cubre el total,
    o si la factura no tiene vencimiento.
    """
    dec = DecimalField(max_digits=14, decimal_places=2)
    qs = (Factura.objects
          .annotate(
              total_pagado=Coalesce(Sum('pagos__monto'), Value(0, output_field=dec)),
              pagado_hasta_venc=Coalesce(Sum('pagos__monto',
                                             filter=Q(pagos__fecha__lte=F('vencimiento'))),
                                         Value(0, output_field=dec)),
          )
          .values('id','cliente_id','cliente__razon_social','total','vencimiento','total_pagado','pagado_hasta_venc'))

    rows = {}
    for f in qs:
        total = f['total'] or 0
        tp    = f['total_pagado'] or 0
        phv   = f['pagado_hasta_venc'] or 0
        if total <= 0 or tp < total:
            continue  # no está pagada

        cid = f['cliente_id']
        if cid not in rows:
            rows[cid] = {'cliente_id': cid, 'cliente': f['cliente__razon_social'],
                         'pagadas': 0, 'a_tiempo': 0}
        rows[cid]['pagadas'] += 1

        if (f['vencimiento'] is None) or (phv >= total):
            rows[cid]['a_tiempo'] += 1

    out = []
    for v in rows.values():
        ratio = (v['a_tiempo'] / v['pagadas']) if v['pagadas'] else 0
        out.append({**v, 'ratio': round(ratio, 3)})
    out.sort(key=lambda x: (x['ratio'], x['a_tiempo']), reverse=True)
    return out


# ────────────────────────────────────────────────────────────────────────────────
# A) KPI: Ingresos por mes (últimos 12)
#     Devuelve [{ mes: 'YYYY-MM-01', importe: Decimal }, ...]
#     Se calcula por pagos (cash-in real) agrupados por mes.
@api_view(['GET'])
def ingresos_por_mes(_request):
    """
    Pagos agrupados por mes (YYYY-MM-01) desde hace 12 meses hasta el mes actual.
    """
    hoy = date.today()
    inicio = date(hoy.year - (1 if hoy.month <= 12 else 0),
                  (hoy.month - 11 - 1) % 12 + 1, 1)  # primer día de hace 11 meses

    dec = DecimalField(max_digits=14, decimal_places=2)
    qs = (Pago.objects
          .filter(fecha__gte=inicio)
          .annotate(mes=TruncMonth('fecha'))
          .values('mes')
          .annotate(importe=Coalesce(Sum('monto'), Value(0, output_field=dec)))
          .order_by('mes'))

    # TruncMonth nos da date/datetime ya "redondeado al mes": no usar .date()
    series = { (r['mes'].replace(day=1) if hasattr(r['mes'], 'replace') else r['mes']): float(r['importe'])
               for r in qs }

    out = []
    cur = inicio
    while cur <= date(hoy.year, hoy.month, 1):
        out.append({'mes': cur.isoformat(), 'importe': series.get(cur, 0.0)})
        # avanzar un mes
        if cur.month == 12:
            cur = date(cur.year + 1, 1, 1)
        else:
            cur = date(cur.year, cur.month + 1, 1)

    return Response(out)

# ────────────────────────────────────────────────────────────────────────────────
# B) KPI: Top clientes por facturación
#     Devuelve [{ cliente: str, importe: Decimal }, ...]
#     Usamos SUM(Factura.total) por cliente en el último año (ajustable).
@api_view(['GET'])
def top_clientes_pagos(_request):
    """
    Suma los PAGOS (cash-in) por cliente, pero SOLO de facturas marcadas como PAGADAS.
    Devuelve: [{cliente_id, importe}, ...]
    """
    dec = DecimalField(max_digits=14, decimal_places=2)
    qs = (Pago.objects
          .filter(factura__estado='PAGADA')
          .values('factura__cliente_id')
          .annotate(importe=Coalesce(Sum('monto'), Value(0, output_field=dec)))
          .order_by('-importe')[:15])

    out = [{'cliente_id': r['factura__cliente_id'],
            'importe': float(r['importe'])} for r in qs]
    return Response(out)




# ────────────────────────────────────────────────────────────────────────────────
# C) KPI: Estado de cartera (aging por bandas)
#     Devuelve {'0-30': float, '31-60': float, '61-90': float, '90+': float}
@api_view(['GET'])
def estado_cartera(request):
    dec0 = Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))

    qs = (Factura.objects
          .filter(estado__in=['ABIERTA', 'PARCIAL'])
          .annotate(
              pagado=Coalesce(Sum('pagos__monto'), dec0),
              saldo=(F('total') - Coalesce(Sum('pagos__monto'), dec0)),
          )
          .values('id', 'vencimiento', 'saldo'))

    out = {'0-30': 0.0, '31-60': 0.0, '61-90': 0.0, '90+': 0.0}
    hoy = date.today()
    for f in qs:
        saldo = f['saldo']
        if saldo is None or float(saldo) <= 0:
            continue
        venc = f['vencimiento']
        dias = (hoy - venc).days if venc else 0
        if dias <= 30: band = '0-30'
        elif dias <= 60: band = '31-60'
        elif dias <= 90: band = '61-90'
        else: band = '90+'
        out[band] += float(saldo)

    return Response(out)

# ────────────────────────────────────────────────────────────────────────────────
# D) KPI: Pagos a tiempo (puntualidad)
#     Resumen por cliente y Top N
@api_view(['GET'])
def pagos_tiempo_resumen(_request):
    return Response(_calc_pagos_tiempo())

@api_view(['GET'])
def pagos_tiempo_top(request):
    try:
        n = int(request.GET.get('n', 5))
    except Exception:
        n = 5
    base = _calc_pagos_tiempo()
    base = sorted(base, key=lambda x: (x['ratio'], x['a_tiempo']), reverse=True)[:n]
    return Response(base)

