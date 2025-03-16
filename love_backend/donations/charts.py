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
        trend_totals.append(max(total, 0))  # Ensure no negative values

    # ------------------
    # Chart 2: Donations by Charity (Pie Chart)
    # ------------------
    confirmed_donations = Donation.objects.filter(status='confirmed')
    charity_totals = confirmed_donations.values('charity__name').annotate(
        total=Sum(ExpressionWrapper(F('amount') * Decimal('0.5'), output_field=DecimalField()))
    )
    labels = [item['charity__name'] for item in charity_totals]
    sizes = [float(item['total']) for item in charity_totals]  # Convert Decimal to float
    if not labels:
        labels = ['No Donations']
        sizes = [1]

    # Custom color palette
    custom_colors = ['#BBAA91', '#F1F0E2', '#E4C7B7', '#D16F52', '#D8AE48', '#A47864']
    colors = custom_colors[:len(labels)]  # Ensure we don't exceed the number of colors available

    # ------------------
    # Create a composite figure with subplots (VERTICAL LAYOUT for mobile)
    # ------------------
    fig, axs = plt.subplots(2, 1, figsize=(6, 10), facecolor='none')

    # Add more space between the two graphs
    plt.subplots_adjust(hspace=0.4, right=0.85)  

    # Chart 1: Donation Trend (Line Chart) - Only Positive Numbers
    axs[0].plot(dates, trend_totals, marker='o', linestyle='-', color=custom_colors[0])  # Use custom color
    axs[0].set_title('Donation Trend (Last 7 Days)', color='white', fontsize=14)
    axs[0].set_xlabel('Date', color='white', fontsize=12)
    axs[0].set_xticks(dates)
    axs[0].set_xticklabels([date.strftime('%d-%m') for date in dates], color='white', fontsize=10)
    axs[0].set_ylabel('Total Donations', color='white', fontsize=12)
    axs[0].grid(True, color='gray')
    axs[0].spines['top'].set_color('white')
    axs[0].spines['bottom'].set_color('white')
    axs[0].spines['left'].set_color('white')
    axs[0].spines['right'].set_color('white')
    axs[0].tick_params(axis='x', colors='white')
    axs[0].tick_params(axis='y', colors='white')

    # **Ensure Y-axis only shows positive values**
    axs[0].set_ylim(bottom=0)

    # Chart 2: Pie Chart for Donation Split by Charity (NO PERCENTAGES)
    wedges, texts = axs[1].pie(sizes, labels=labels, startangle=90, colors=colors)
    axs[1].axis('equal')
    axs[1].set_title('Donation Split by Charity (50% allocated)', color='white', fontsize=14)

    # Set labels (charity names) to white
    for text in texts:
        text.set_color('white')

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, bbox_inches='tight')  
    plt.close(fig)
    buf.seek(0)

    return HttpResponse(buf.getvalue(), content_type='image/png')