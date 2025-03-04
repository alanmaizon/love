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
    # Chart 2: Donations by Charity (Bar Chart)
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
    colors = plt.cm.Paired(range(len(labels)))
    
    # ------------------
    # Create a composite figure with subplots
    # ------------------
    fig, axs = plt.subplots(1, 2, figsize=(12, 5))  # Adjusted to 1 row and 2 columns
    # Flatten the axes array for easier indexing.
    axs = axs.flatten()
    
    # Chart 1: Donation Trend (Line Chart)
    axs[0].plot(dates, trend_totals, marker='o', linestyle='-', color='blue')
    axs[0].set_title('Donation Trend (Last 7 Days)')
    axs[0].set_xlabel('Date')
    axs[0].set_xticks(dates)
    axs[0].set_xticklabels([date.strftime('%d-%m') for date in dates])
    axs[0].set_ylabel('Total Donations')
    axs[0].grid(True)
    
    # Subplot 2: Pie Chart for Donation Split by Charity
    axs[1].pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors)
    axs[1].axis('equal')  # Ensure the pie is drawn as a circle.
    axs[1].set_title('Donation Split by Charity (50% allocated)')
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    
    return HttpResponse(buf.getvalue(), content_type='image/png')
