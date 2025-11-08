# clientes/views.py
from rest_framework.viewsets import ModelViewSet 
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.filters import SearchFilter, OrderingFilter 
from facturacion.models import Proyecto
from facturacion.serializers import ProyectoSerializer
from .models import HistorialCliente
from .serializers import ClienteSerializer, HistorialClienteSerializer
from .models import Cliente                    # ← IMPORTA EL MODELO
from .serializers import ClienteSerializer 
from django.db.models import Q
from rest_framework.permissions import AllowAny

class ClienteViewSet(ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Cliente.objects.all().order_by('razon_social')
    serializer_class = ClienteSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['razon_social', 'cuit', 'email']
    ordering_fields = ['razon_social', 'fecha_alta']
    
    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        cli = self.get_object()
        cli.estado = 'INACTIVO'
        cli.save(update_fields=['estado'])
        HistorialCliente.objects.create(
            cliente=cli, tipo='DESACTIVACION_CLIENTE',
            nota=f'{cli.razon_social} desactivado', usuario=request.user if request.user.is_authenticated else None
        )
        return Response({'ok': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        cli = self.get_object()
        cli.estado = 'ACTIVO'
        cli.save(update_fields=['estado'])
        HistorialCliente.objects.create(
            cliente=cli, tipo='ACTIVACION_CLIENTE',
            nota=f'{cli.razon_social} activado', usuario=request.user if request.user.is_authenticated else None
        )
        return Response({'ok': True}, status=status.HTTP_200_OK)

   
    @action(detail=True, methods=['get'])
    def proyectos(self, request, pk=None):
        qs = Proyecto.objects.filter(cliente_id=pk).order_by('nombre')
        return Response(ProyectoSerializer(qs, many=True).data)
    
    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        qs = HistorialCliente.objects.filter(cliente_id=pk).order_by('-fecha')[:100]
        return Response(HistorialClienteSerializer(qs, many=True).data)
    @action(detail=False, methods=['get'])
    def buscar(self, request):
        q = request.query_params.get('q','').strip()
        qs = self.get_queryset()
        if q:
            qs = qs.filter(Q(razon_social__icontains=q) | Q(cuit__icontains=q))
        data = ClienteSerializer(qs[:50], many=True).data
        return Response(data)
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        if not ser.is_valid():
            # Log de ayuda en consola
            print("DEBUG POST /clientes payload:", request.data)
            print("DEBUG serializer.errors:", ser.errors)
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(ser)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=partial)
        if not ser.is_valid():
            print("DEBUG PUT/PATCH /clientes payload:", request.data)
            print("DEBUG serializer.errors:", ser.errors)
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(ser)
        return Response(ser.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        try:
            self.perform_destroy(obj)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            # Tiene dependencias (p. ej. facturas, proyectos)
            return Response(
                {"detail": "No se puede eliminar: el cliente tiene datos relacionados. Desactívalo o elimina primero sus proyectos/facturas."},
                status=status.HTTP_409_CONFLICT
            )
        
    @action(detail=False, methods=['get'], url_path='historial-global')
    def historial_global(self, request):
        qs = HistorialCliente.objects.select_related('cliente').order_by('-fecha')
        # filtros opcionales
        tipos = request.query_params.get('tipos', '')
        if tipos:
            allow = [t.strip() for t in tipos.split(',') if t.strip()]
            if allow:
                qs = qs.filter(tipo__in=allow)
        limit = int(request.query_params.get('limit', 50))
        from .serializers import HistorialClienteListSerializer
        data = HistorialClienteListSerializer(qs[:limit], many=True).data
        return Response(data)
