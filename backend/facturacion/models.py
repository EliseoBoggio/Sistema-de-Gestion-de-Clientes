# facturacion/models.py
from django.db import models
from decimal import Decimal
from datetime import date

from clientes.models import Cliente


class Proyecto(models.Model):
    cliente = models.ForeignKey('clientes.Cliente', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=200)
    estado = models.CharField(
        max_length=20,
        choices=[('EN_PROCESO', 'EN_PROCESO'),
                 ('PAUSADO', 'PAUSADO'),
                 ('FINALIZADO', 'FINALIZADO')],
        default='EN_PROCESO'
    )
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin_prev = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f'{self.nombre} · {self.cliente.razon_social}'


class Factura(models.Model):
    ABIERTA = 'ABIERTA'
    PARCIAL = 'PARCIAL'
    PAGADA  = 'PAGADA'
    ANULADA = 'ANULADA'
    ESTADOS = [
        (ABIERTA, 'Abierta'),
        (PARCIAL, 'Parcial'),
        (PAGADA,  'Pagada'),
        (ANULADA, 'Anulada'),
    ]

    # Campos (¡ahora sí dentro de la clase!)
    cliente     = models.ForeignKey(Cliente, on_delete=models.PROTECT)
    proyecto    = models.ForeignKey(Proyecto, on_delete=models.SET_NULL, null=True, blank=True)
    nro         = models.CharField(max_length=30, unique=True)
    fecha       = models.DateField(default=date.today)
    vencimiento = models.DateField(null=True, blank=True)
    estado      = models.CharField(max_length=20, choices=ESTADOS, default=ABIERTA)
    total       = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    moneda      = models.CharField(max_length=10, default='ARS')

    def __str__(self) -> str:
        return self.nro

    def recalc_total(self):
        total = sum(
            (it.qty or 0) * (it.precio_unit or 0) * (1 + ((it.impuesto or Decimal('0')) / Decimal('100')))
            for it in self.items.all()
        )
        self.total = total
        self.save(update_fields=['total'])

    class Meta:
        ordering = ['-fecha', '-id']


class FacturaItem(models.Model):
    factura      = models.ForeignKey('Factura', related_name='items', on_delete=models.CASCADE)
    descripcion  = models.CharField(max_length=255)
    qty          = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    precio_unit  = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    impuesto  = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, default=None)  # % puede ser nulo
    @property
    def subtotal(self) -> Decimal:
        qty = self.qty or Decimal('0')
        pu  = self.precio_unit or Decimal('0')
        imp = (self.impuesto or Decimal('0')) / Decimal('100')
        return (qty * pu) * (1 + imp)
    def __str__(self) -> str:
        return f'{self.descripcion} ({self.qty} x {self.precio_unit})'


class Pago(models.Model):
    factura    = models.ForeignKey('Factura', related_name='pagos', on_delete=models.PROTECT)
    fecha      = models.DateField(default=date.today)
    monto      = models.DecimalField(max_digits=12, decimal_places=2)
    medio      = models.CharField(max_length=30, null=True, blank=True)
    referencia = models.CharField(max_length=60, null=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.db.models import Sum
        total_pagado = self.factura.pagos.aggregate(s=Sum('monto'))['s'] or Decimal('0.00')
        f = self.factura
        if total_pagado <= 0:
            f.estado = Factura.ABIERTA
        elif total_pagado < f.total:
            f.estado = Factura.PARCIAL
        else:
            f.estado = Factura.PAGADA
        f.save(update_fields=['estado'])
