from rest_framework import serializers
from .models import Cliente, HistorialCliente

def _blank_to_none(d: dict, keys: list[str]):
    for k in keys:
        v = d.get(k, None)
        if isinstance(v, str) and v.strip() == "":
            d[k] = None
    return d

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
        extra_kwargs = {
            'cuit':     {'allow_null': True, 'required': False, 'allow_blank': True},
            'email':    {'allow_null': True, 'required': False, 'allow_blank': True},
            'telefono': {'allow_null': True, 'required': False, 'allow_blank': True},
        }

    def to_internal_value(self, data):
        # Normaliza "" -> None en campos opcionales
        data = dict(data)
        _blank_to_none(data, ['cuit', 'email', 'telefono'])
        return super().to_internal_value(data)

    def validate_razon_social(self, v):
        if not v or not v.strip():
            raise serializers.ValidationError("La razón social es obligatoria.")
        return v.strip()

    def validate_cuit(self, v):
        # opcional, pero si viene, validá formato simple
        if v is not None:
            v = v.strip()
            if v and len(v) < 8:
                raise serializers.ValidationError("CUIT inválido.")
        return v

class HistorialClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialCliente
        fields = '__all__'

class HistorialClienteListSerializer(serializers.ModelSerializer):
    cliente_razon_social = serializers.CharField(source='cliente.razon_social', read_only=True)

    class Meta:
        model = HistorialCliente
        fields = ['id', 'fecha', 'tipo', 'nota', 'cliente', 'cliente_razon_social', 'usuario']

