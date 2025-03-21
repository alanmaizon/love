# donations/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile
from datetime import date

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(
            user=instance,
            bride_name="Anna",
            groom_name="Alan",
            wedding_date=date(2025, 4, 26),  # default wedding date
            bio='',
            location='Ireland',
        )
    else:
        instance.profile.save()
