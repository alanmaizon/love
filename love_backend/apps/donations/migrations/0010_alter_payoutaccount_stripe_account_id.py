from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("donations", "0009_alter_donation_charity_protect"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payoutaccount",
            name="stripe_account_id",
            field=models.CharField(db_index=True, max_length=255),
        ),
    ]
