from django.db import models

class Cliente(models.Model):
    ACTIVO = 'ACTIVO'
    INACTIVO = 'INACTIVO'
    ESTADOS = [(ACTIVO, 'Activo'), (INACTIVO, 'Inactivo')]

    razon_social = models.CharField(max_length=120)
    cuit = models.CharField(max_length=20, unique=True, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    telefono = models.CharField(max_length=40, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default=ACTIVO)
    fecha_alta = models.DateField(auto_now_add=True)
    activo       = models.BooleanField(default=True)  # <— NUEVO
    def __str__(self):
        return self.razon_social

# clientes/models.py
class HistorialCliente(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='historial')
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=30)  # ALTA_CLIENTE, EDIT_CLIENTE, FACTURA_CREADA, PAGO_REGISTRADO, etc.
    nota = models.TextField(null=True, blank=True)
    usuario = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL)
