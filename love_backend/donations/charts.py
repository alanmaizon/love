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
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from donations.models import Donation

def combined_charts(request):
    # ------------------
    # Donation Trend (Last 30 Days - Lollipop Chart)
    # ------------------
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=29)  # Last 30 days
    dates = [start_date + timedelta(days=i) for i in range(30)]
    
    trend_totals = []
    for date in dates:
        total = Donation.objects.filter(
            status='confirmed', created_at__date=date
        ).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        trend_totals.append(max(total, 0))  # Ensure no negative values

    # Remove zero values (hide empty days)
    filtered_dates = [dates[i] for i in range(len(trend_totals)) if trend_totals[i] > 0]
    filtered_totals = [trend_totals[i] for i in range(len(trend_totals)) if trend_totals[i] > 0]

    # ------------------
    # Donations by Charity (Pie Chart)
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

    # 🎨 Colors
    primary_color = "#D16F52"  # Lollipop dot color
    line_color = "#F1F0E2"  # Stick color
    text_color = "#F1F0E2"  # Label color
    pie_colors = ['#BBAA91', '#F1F0E2', '#E4C7B7', '#D16F52', '#D8AE48', '#A47864']

    # ------------------
    # Create a composite figure with subplots (VERTICAL LAYOUT)
    # ------------------
    fig, axs = plt.subplots(2, 1, figsize=(8, 12), facecolor='none')
    plt.subplots_adjust(hspace=0.5, right=0.85)  # Adjust spacing

    # 📍 Lollipop Chart
    if filtered_dates:
        markerline, stemline, baseline = axs[0].stem(filtered_dates, filtered_totals, linefmt=line_color, basefmt=" ")
    
        # ✅ Set the marker (dot) color
        markerline.set_markerfacecolor(primary_color)
        markerline.set_markeredgecolor(primary_color)
    
        axs[0].set_title('Donation Trend (Last 30 Days)', color=text_color, fontsize=14)
        axs[0].set_xticks(filtered_dates[::7])  # Show labels every 7 days
        axs[0].set_xticklabels([date.strftime('%d-%m') for date in filtered_dates[::7]], color=text_color, fontsize=10)
        
        # ✅ Add labels above points
        for i, v in enumerate(filtered_totals):
            axs[0].text(filtered_dates[i], v + float(max(filtered_totals)) * 0.05, f'€{v}', 
                        ha='center', fontsize=10, color=text_color)
    
        axs[0].spines['top'].set_visible(False)
        axs[0].spines['right'].set_visible(False)
        axs[0].spines['left'].set_visible(False)
        axs[0].spines['bottom'].set_color(text_color)
        axs[0].tick_params(axis='x', colors=text_color)
        axs[0].set_yticks([])  # Hide Y-axis
    

    else:
        axs[0].set_visible(False)  # Hide chart if no data


    # 🥧 Pie Chart
    explode_values = [0.05] * len(labels)  # Slightly separate slices
    wedges, texts, autotexts = axs[1].pie(
        sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=pie_colors,
        explode=explode_values, shadow=True
    )
    axs[1].axis('equal')
    axs[1].set_title('Donation Split by Charity (50% allocated)', color=text_color, fontsize=14)

    # ✅ Improve Pie Chart Readability
    for text in texts:
        text.set_color(text_color)  # Charity names
    for autotext in autotexts:
        autotext.set_color(text_color)  # Percentage labels

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)

    return HttpResponse(buf.getvalue(), content_type='image/png')
