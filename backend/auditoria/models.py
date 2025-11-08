from django.db import models
from django.contrib.auth import get_user_model

class UserActionLog(models.Model):
    user = models.ForeignKey(get_user_model(), null=True, blank=True, on_delete=models.SET_NULL)
    method = models.CharField(max_length=8)       # GET/POST/PUT/DELETE
    path = models.CharField(max_length=255)
    action = models.CharField(max_length=50)      # etiqueta derivada: CLIENTE_CREATE, FACTURA_CREATE, etc.
    ip = models.GenericIPAddressField(null=True, blank=True)
    ts = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['ts']), models.Index(fields=['action'])]
