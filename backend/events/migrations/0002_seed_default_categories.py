from django.db import migrations


DEFAULT_CATEGORIES = [
    {'label': 'Familia',  'icon': 'people',                  'color': '#22C55E', 'order': 0},
    {'label': 'Escuela',  'icon': 'school',                  'color': '#A78BFA', 'order': 1},
    {'label': 'Salud',    'icon': 'medical',                  'color': '#FCA5A5', 'order': 2},
    {'label': 'Deporte',  'icon': 'football',                 'color': '#FCD34D', 'order': 3},
    {'label': 'Hogar',    'icon': 'home',                     'color': '#86EFAC', 'order': 4},
    {'label': 'Comida',   'icon': 'restaurant',               'color': '#FB923C', 'order': 5},
    {'label': 'Otro',     'icon': 'ellipsis-horizontal',      'color': '#9CA3AF', 'order': 6},
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model('events', 'Category')
    for data in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            label=data['label'],
            family=None,
            defaults={**data, 'is_default': True},
        )


def unseed_categories(apps, schema_editor):
    Category = apps.get_model('events', 'Category')
    Category.objects.filter(family__isnull=True, is_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]
