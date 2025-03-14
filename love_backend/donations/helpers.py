from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.utils.html import strip_tags
from decimal import Decimal

def send_donation_confirmation_email(donation):
    """
    Sends a stylish email confirmation using SVG images from static files.
    """
    subject = "🎉 Thank You for Your Gift!"
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [donation.donor_email]
    flower_top_url = static("images/flower_top.svg")
    flower_bottom_url = static("images/flower_bottom.svg")

    context = {
        "donor_name": donation.donor_name,
        "amount": donation.amount,
        "reference_id": f"GIFT-{donation.id}",
        "charity_name": donation.charity.name,
        "couple_allocation": donation.amount * Decimal('0.5'),
        "charity_allocation": donation.amount * Decimal('0.5'),
        "flower_top_url": flower_top_url,
        "flower_bottom_url": flower_bottom_url,
    }

    html_content = render_to_string("thank_you.html", context)
    text_content = strip_tags(html_content)
    email = EmailMultiAlternatives(subject, text_content, from_email, recipient_list)
    email.attach_alternative(html_content, "text/html")

    email.send()