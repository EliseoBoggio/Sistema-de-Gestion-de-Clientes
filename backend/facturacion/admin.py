from django.contrib import admin
from .models import Proyecto, Factura, FacturaItem, Pago

class FacturaItemInline(admin.TabularInline):
    model = FacturaItem
    extra = 1

@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    inlines = [FacturaItemInline]
    list_display = ("nro","cliente","fecha","vencimiento","estado","total")

admin.site.register([Proyecto, FacturaItem, Pago])


