# donations/combined_charts.py
import io
from datetime import datetime, timedelta
from decimal import Decimal
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from django.http import HttpResponse
from django.db.models import Sum, F, DecimalField, ExpressionWrapper
from donations.models import Donation

def combined_charts(request):
    # ------------------
    # Chart 1: Donation Trend (Last 30 Days - Bar Chart)
    # ------------------
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=29)  # Last 30 days
    dates = [start_date + timedelta(days=i) for i in range(30)]
    
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
    sizes = [float(item['total']) for item in charity_totals]
    if not labels:
        labels = ['No Donations']
        sizes = [1]

    # 🎨 Custom Gradient for Bar Chart
    gradient_colors = np.linspace(0.2, 1, len(dates))  # Light to dark gradient
    cmap = mcolors.LinearSegmentedColormap.from_list("", ["#FF9A8B", "#D16F52"])  # Gradient colors
    bar_colors = cmap(gradient_colors)

    # 🎨 Color Palette for Pie Chart
    custom_colors = ['#BBAA91', '#F1F0E2', '#E4C7B7', '#D16F52', '#D8AE48', '#A47864']
    colors = custom_colors[:len(labels)]

    # ------------------
    # Create a composite figure with subplots (VERTICAL LAYOUT)
    # ------------------
    fig, axs = plt.subplots(2, 1, figsize=(8, 12), facecolor='none')

    # Add spacing between the graphs
    plt.subplots_adjust(hspace=0.5, right=0.85)

    # 📊 Chart 1: Donation Trend (Bar Chart)
    axs[0].bar(dates, trend_totals, color=bar_colors)  # Bar chart with gradient
    axs[0].set_title('Donation Trend (Last 30 Days)', color='black', fontsize=14)
    axs[0].set_xlabel('Date', color='black', fontsize=12)
    axs[0].set_xticks(dates[::7])  # Show labels every 7 days
    axs[0].set_xticklabels([date.strftime('%d-%m') for date in dates[::7]], color='black', fontsize=10)
    axs[0].set_ylabel('Total Donations (€)', color='black', fontsize=12)
    axs[0].grid(True, color='gray', linestyle='--', alpha=0.6)
    axs[0].tick_params(axis='x', colors='black')
    axs[0].tick_params(axis='y', colors='black')
    axs[0].set_ylim(bottom=0)  # Ensure only positive values

    # ✅ Add labels above bars
    for i, v in enumerate(trend_totals):
        axs[0].text(dates[i], float(v) + float(max(trend_totals)) * 0.02, f'€{v}', 
                    ha='center', fontsize=10, color='black')

    # 🥧 Chart 2: Pie Chart for Donation Split by Charity
    explode_values = [0.05] * len(labels)  # Slightly separate slices
    wedges, texts, autotexts = axs[1].pie(
        sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors,
        explode=explode_values, shadow=True
    )
    axs[1].axis('equal')
    axs[1].set_title('Donation Split by Charity (50% allocated)', color='black', fontsize=14)

    # ✅ Improve Pie Chart Readability
    for text in texts:
        text.set_color('black')  # Charity names
    for autotext in autotexts:
        autotext.set_color('black')  # Percentage labels

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)

    return HttpResponse(buf.getvalue(), content_type='image/png')
