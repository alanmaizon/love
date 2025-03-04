from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bride_name = models.CharField(max_length=255, default="Anna")
    groom_name = models.CharField(max_length=255, default="Alan")
    wedding_date = models.DateField()
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=255)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=100)
    bank_identifier = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Charity(models.Model):
    """
    The Charity model represents a charity organization that the wedding couple supports.
    Guests will choose one of these charities when making a donation.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='charity_logos/', blank=True, null=True)
    
    class Meta:
        verbose_name_plural = "Charities"

    def __str__(self):
        return self.name


class Donation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='donations', null=True, blank=True)
    charity = models.ForeignKey('Charity', on_delete=models.CASCADE, related_name='donations')
    donor_name = models.CharField(max_length=255)
    donor_email = models.EmailField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Donation by {self.donor_name} - {self.amount}"
