## facturacion/serializers.py
from decimal import Decimal
from rest_framework import serializers
from clientes.models import Cliente
from .models import Proyecto, Factura, FacturaItem, Pago

# ---------------- Helpers ----------------
def _to_null_number(v):
    """Convierte '' o None en None; si viene string numérico, retorna Decimal."""
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        if s == "":
            return None
        try:
            return Decimal(s.replace(",", "."))
        except Exception:
            # Dejamos que DRF haga el cast/errores si no es número
            return v
    return v

# ---------------- Items ----------------
class FacturaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacturaItem
        fields = ['id', 'descripcion', 'qty', 'precio_unit', 'impuesto']
        extra_kwargs = {
            'impuesto': {'allow_null': True, 'required': False},
        }

    def to_internal_value(self, data):
        # IMPORTANTE: normalizar ANTES del super(), así DRF no intenta castear "" a Decimal
        data = dict(data)  # por si viene QueryDict
        imp = data.get('impuesto', None)
        if isinstance(imp, str) and imp.strip() == '':
            data['impuesto'] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        imp = attrs.get('impuesto', None)
        if imp is not None:
            # DRF ya lo casteó a Decimal; igual validamos rango
            if imp < 0 or imp > 100:
                raise serializers.ValidationError({'impuesto': 'Debe estar entre 0 y 100.'})
        if attrs.get('qty') is not None and attrs['qty'] <= 0:
            raise serializers.ValidationError({'qty': 'Debe ser > 0.'})
        if attrs.get('precio_unit') is not None and attrs['precio_unit'] < 0:
            raise serializers.ValidationError({'precio_unit': 'No puede ser negativo.'})
        return attrs


# ---------------- Factura ----------------
class FacturaSerializer(serializers.ModelSerializer):
    items = FacturaItemSerializer(many=True)
    cliente_nombre = serializers.CharField(source='cliente.razon_social', read_only=True)

    class Meta:
        model = Factura
        fields = [
            'id', 'nro', 'cliente', 'cliente_nombre', 'proyecto',
            'fecha', 'vencimiento', 'estado', 'moneda', 'total', 'items'
        ]
        extra_kwargs = {
            'proyecto': {'allow_null': True, 'required': False},  # proyecto opcional
        }

    # Coherencia: si hay proyecto, debe pertenecer al mismo cliente
    def validate(self, data):
        cliente = data.get('cliente') or getattr(self.instance, 'cliente', None)
        proyecto = data.get('proyecto', None)
        if proyecto is not None:
            if cliente is None:
                raise serializers.ValidationError({'cliente': 'Debés seleccionar un cliente.'})
            if proyecto.cliente_id != cliente.id:
                raise serializers.ValidationError({'proyecto': 'El proyecto no pertenece al cliente seleccionado.'})
        return data

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        factura = Factura.objects.create(**validated_data)
        for it in items:
            # impuesto puede ser None
            FacturaItem.objects.create(factura=factura, **it)
        factura.recalc_total()
        return factura

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for it in items:
                FacturaItem.objects.create(factura=instance, **it)
        instance.recalc_total()
        return instance

# ---------------- Proyecto ----------------
class ProyectoSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())

    class Meta:
        model = Proyecto
        fields = ['id', 'cliente', 'nombre', 'estado', 'fecha_inicio', 'fecha_fin_prev']

# ---------------- Pago ----------------
class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'
