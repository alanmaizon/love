from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("donations", "0008_delete_profile"),
    ]

    operations = [
        migrations.AlterField(
            model_name="donation",
            name="charity",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="donations",
                to="donations.charity",
            ),
        ),
    ]
