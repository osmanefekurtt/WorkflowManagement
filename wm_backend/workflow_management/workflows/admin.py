# workflows/admin.py
from django.contrib import admin
from .models import Work, Movement, Category, SalesChannel, WorkType

@admin.register(Work)
class WorkAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'created', 'updated']  # 'status' kaldırıldı
    list_filter = ['category', 'created']  # 'status' kaldırıldı
    search_fields = ['name', 'note']
    date_hierarchy = 'created'

@admin.register(Movement)
class MovementAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'get_work_name', 'created']
    list_filter = ['action', 'created', 'user']
    search_fields = ['description', 'work__name']
    readonly_fields = ['user', 'work', 'action', 'description', 'changes', 'created']
    date_hierarchy = 'created'
    
    def get_work_name(self, obj):
        return obj.work.name if obj.work else '-'
    get_work_name.short_description = 'İş'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'order', 'created']
    list_filter = ['is_active', 'created']
    search_fields = ['name']
    list_editable = ['is_active', 'order']
    ordering = ['order', 'name']


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'order', 'created']
    list_filter = ['is_active', 'created']
    search_fields = ['name']
    list_editable = ['is_active', 'order']
    ordering = ['order', 'name']


@admin.register(SalesChannel)
class SalesChannelAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'order', 'created']
    list_filter = ['is_active', 'created']
    search_fields = ['name']
    list_editable = ['is_active', 'order']
    ordering = ['order', 'name']