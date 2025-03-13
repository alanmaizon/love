# donations/combined_charts.py
import io
from datetime import datetime, timedelta
from decimal import Decimal
import matplotlib
matplotlib.use('Agg')  # Use the Agg backend in non-GUI environments
import matplotlib.pyplot as plt
from django.http import HttpResponse
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from donations.models import Donation

def combined_charts(request):
    # ------------------
    # Chart 1: Donation Trend (Last 7 Days)
    # ------------------
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=6)
    dates = [start_date + timedelta(days=i) for i in range(7)]
    trend_totals = []
    for date in dates:
        total = Donation.objects.filter(
            status='confirmed', created_at__date=date
        ).aggregate(total=Sum('amount'))['total'] or 0
        trend_totals.append(total)

    # ------------------
    # Chart 2: Donations by Charity (Pie Chart)
    # ------------------
    confirmed_donations = Donation.objects.filter(status='confirmed')
    charity_totals = confirmed_donations.values('charity__name').annotate(
        total=Sum(ExpressionWrapper(F('amount') * Decimal('0.5'), output_field=DecimalField()))
    )
    labels = [item['charity__name'] for item in charity_totals]
    sizes = [float(item['total']) for item in charity_totals]  # convert Decimal to float
    if not labels:
        labels = ['No Donations']
        sizes = [1]

    # Custom color palette
    custom_colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFF2']
    colors = custom_colors[:len(labels)]  # Ensure we don't exceed the number of colors available

    # ------------------
    # Create a composite figure with subplots
    # ------------------
    fig, axs = plt.subplots(1, 2, figsize=(12, 5), facecolor='none')  # Transparent background
    axs = axs.flatten()

    # Chart 1: Donation Trend (Line Chart)
    axs[0].plot(dates, trend_totals, marker='o', linestyle='-', color=custom_colors[0])  # Use custom color
    axs[0].set_title('Donation Trend', color='white')
    axs[0].set_xlabel('Date', color='white')
    axs[0].set_xticks(dates)
    axs[0].set_xticklabels([date.strftime('%d-%m') for date in dates], color='white')
    axs[0].set_ylabel('Total Donations', color='white')
    axs[0].grid(True, color='gray')
    axs[0].spines['top'].set_color('white')
    axs[0].spines['bottom'].set_color('white')
    axs[0].spines['left'].set_color('white')
    axs[0].spines['right'].set_color('white')
    axs[0].tick_params(axis='x', colors='white')  # Make x-axis numbers white
    axs[0].tick_params(axis='y', colors='white')  # Make y-axis numbers white

    # Chart 2: Pie Chart for Donation Split by Charity
    wedges, texts, autotexts = axs[1].pie(
        sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors
    )
    axs[1].axis('equal')  # Ensure the pie is drawn as a circle.
    axs[1].set_title('Donation Split by Charity', color='white')

    # Set labels (charity names) to white
    for text in texts:
        text.set_color('white')

    # Leave the percentage values black (autotexts)
    
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True)  # Transparent background
    plt.close(fig)
    buf.seek(0)

    return HttpResponse(buf.getvalue(), content_type='image/png')
