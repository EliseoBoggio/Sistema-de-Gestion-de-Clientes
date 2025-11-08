# clientes/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Cliente, HistorialCliente
from facturacion.models import Factura, Pago

@receiver(post_save, sender=Cliente)
def log_cliente(sender, instance, created, **kwargs):
    HistorialCliente.objects.create(
        cliente=instance,
        tipo='ALTA_CLIENTE' if created else 'EDIT_CLIENTE',
        nota=f'Cliente {instance.razon_social} {"creado" if created else "editado"}'
    )

@receiver(post_save, sender=Factura)
def log_factura(sender, instance, created, **kwargs):
    if created:
        HistorialCliente.objects.create(
            cliente=instance.cliente,
            tipo='FACTURA_CREADA',
            nota=f'Factura {instance.nro} por {instance.total}'
        )
@receiver(post_save, sender=Cliente)
def log_cliente_save(sender, instance: Cliente, created: bool, **kwargs):
    # Alta vs Edición
    tipo = 'ALTA_CLIENTE' if created else 'EDIT_CLIENTE'
    nota = f'{instance.razon_social}'
    HistorialCliente.objects.create(cliente=instance, tipo=tipo, nota=nota)
    
@receiver(post_save, sender=Pago)
def log_pago(sender, instance, created, **kwargs):
    if created:
        HistorialCliente.objects.create(
            cliente=instance.factura.cliente,
            tipo='PAGO_REGISTRADO',
            nota=f'Pago {instance.monto} a {instance.factura.nro}'
        )
