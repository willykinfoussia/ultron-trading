"""
Consensus Export Service - exports consensus reports in PDF and CSV formats.
"""

import csv
import io
import logging
from typing import Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)

from app.services.analysis import consensus

logger = logging.getLogger("ultron-trading.export.consensus")


async def get_consensus_report_dict(symbol: str) -> Dict[str, Any]:
    """
    Get consensus report as a dictionary.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        
    Returns:
        Consensus report dictionary
    """
    symbol = symbol.upper()
    try:
        report = await consensus.get_consensus_report(symbol)
        return report
    except Exception as e:
        logger.error(f"Failed to get consensus report for {symbol}: {e}")
        # Return empty structure on error
        return {
            "symbol": symbol,
            "computed_at": "",
            "overall": {
                "score": 0,
                "verdict": "HOLD",
                "confidence": 0.0,
                "signal_distribution": {"buy": 0, "sell": 0, "hold": 0, "neutral": 0},
            },
            "categories": [],
            "risk_metrics": {
                "expected_return": 0.0,
                "volatility_estimate": 0.0,
                "sharpe_estimate": 0.0,
                "max_drawdown_estimate": 0.0,
                "var_95": 0.0,
                "risk_reward_ratio": 0.0,
            },
            "key_metrics": [],
            "insights": [],
            "conflicts": [],
            "chart_data": {},
            "method_details": [],
        }


def generate_csv_report(report: Dict[str, Any]) -> bytes:
    """
    Generate CSV report from consensus data.
    
    Args:
        report: Consensus report dictionary
        
    Returns:
        CSV content as bytes
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Section", "Field", "Value"])
    
    # Write basic info
    writer.writerow(["Info", "Symbol", report.get("symbol", "")])
    writer.writerow(["Info", "Computed At", report.get("computed_at", "")])
    
    # Write overall section
    overall = report.get("overall", {})
    writer.writerow(["Overall", "Score", overall.get("score", 0)])
    writer.writerow(["Overall", "Verdict", overall.get("verdict", "")])
    writer.writerow(["Overall", "Confidence", overall.get("confidence", 0.0)])
    
    signal_dist = overall.get("signal_distribution", {})
    for signal, count in signal_dist.items():
        writer.writerow(["Overall", f"Signal_{signal.upper()}", count])
    
    # Write categories
    categories = report.get("categories", [])
    for idx, category in enumerate(categories):
        writer.writerow([f"Category_{idx+1}", "Name", category.get("category", "")])
        writer.writerow([f"Category_{idx+1}", "Score", category.get("score", 0)])
        writer.writerow([f"Category_{idx+1}", "Confidence", category.get("confidence", 0.0)])
        writer.writerow([f"Category_{idx+1}", "Weight", category.get("weight", 0.0)])
        
        signal_counts = category.get("signal_counts", {})
        for signal, count in signal_counts.items():
            writer.writerow([f"Category_{idx+1}", f"Signal_{signal.upper()}", count])
        
        # Write methods
        methods = category.get("methods", [])
        for m_idx, method in enumerate(methods):
            writer.writerow([f"Category_{idx+1}_Method_{m_idx+1}", "Method_ID", method.get("method_id", "")])
            writer.writerow([f"Category_{idx+1}_Method_{m_idx+1}", "Method_Name", method.get("method_name", "")])
            writer.writerow([f"Category_{idx+1}_Method_{m_idx+1}", "Signal", method.get("signal", "")])
            writer.writerow([f"Category_{idx+1}_Method_{m_idx+1}", "Confidence", method.get("confidence", 0.0)])
            writer.writerow([f"Category_{idx+1}_Method_{m_idx+1}", "Key_Result", method.get("key_result", "")])
    
    # Write risk metrics
    risk_metrics = report.get("risk_metrics", {})
    for metric, value in risk_metrics.items():
        writer.writerow(["Risk_Metrics", metric, value])
    
    # Write key metrics
    key_metrics = report.get("key_metrics", [])
    for idx, km in enumerate(key_metrics):
        writer.writerow([f"Key_Metric_{idx+1}", "Label", km.get("label", "")])
        writer.writerow([f"Key_Metric_{idx+1}", "Value", km.get("value", "")])
        writer.writerow([f"Key_Metric_{idx+1}", "Trend", km.get("trend", "")])
    
    # Write insights
    insights = report.get("insights", [])
    for idx, insight in enumerate(insights):
        writer.writerow([f"Insight_{idx+1}", "Type", insight.get("type", "")])
        writer.writerow([f"Insight_{idx+1}", "Title", insight.get("title", "")])
        writer.writerow([f"Insight_{idx+1}", "Description", insight.get("description", "")])
        writer.writerow([f"Insight_{idx+1}", "Confidence", insight.get("confidence", 0.0)])
    
    # Write conflicts
    conflicts = report.get("conflicts", [])
    for idx, conflict in enumerate(conflicts):
        writer.writerow([f"Conflict_{idx+1}", "Type", conflict.get("type", "")])
        writer.writerow([f"Conflict_{idx+1}", "Categories", "; ".join(conflict.get("categories", []))])
        writer.writerow([f"Conflict_{idx+1}", "Description", conflict.get("description", "")])
        writer.writerow([f"Conflict_{idx+1}", "Severity", conflict.get("severity", "")])
    
    # Write chart data (simplified)
    chart_data = report.get("chart_data", {})
    if chart_data:
        writer.writerow(["Chart_Data", "Signal_Distribution", str(chart_data.get("signal_distribution", {}))])
        writer.writerow(["Chart_Data", "Method_Confidences", str(chart_data.get("method_confidences", []))])
        writer.writerow(["Chart_Data", "Category_Scores", str(chart_data.get("category_scores", []))])
    
    # Write method details
    method_details = report.get("method_details", [])
    for idx, method in enumerate(method_details):
        writer.writerow([f"Method_Detail_{idx+1}", "Method_ID", method.get("method_id", "")])
        writer.writerow([f"Method_Detail_{idx+1}", "Method_Name", method.get("method_name", "")])
        writer.writerow([f"Method_Detail_{idx+1}", "Category", method.get("category", "")])
        writer.writerow([f"Method_Detail_{idx+1}", "Signal", method.get("signal", "")])
        writer.writerow([f"Method_Detail_{idx+1}", "Confidence", method.get("confidence", 0.0)])
        writer.writerow([f"Method_Detail_{idx+1}", "Key_Result", method.get("key_result", "")])
        writer.writerow([f"Method_Detail_{idx+1}", "Weight_In_Consensus", method.get("weight_in_consensus", 0.0)])
    
    csv_content = output.getvalue()
    output.close()
    return csv_content.encode('utf-8')


def generate_pdf_report(report: Dict[str, Any]) -> bytes:
    """
    Generate PDF report from consensus data.
    
    Args:
        report: Consensus report dictionary
        
    Returns:
        PDF content as bytes
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.darkblue
    )
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=8,
        textColor=colors.darkblue
    )
    normal_style = styles['Normal']
    
    # Add title
    title = Paragraph(f"Consensus Report for {report.get('symbol', 'UNKNOWN')}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    # Add timestamp
    if report.get("computed_at"):
        timestamp = Paragraph(f"Generated on: {report['computed_at']}", normal_style)
        elements.append(timestamp)
        elements.append(Spacer(1, 12))
    
    # Overall section
    elements.append(Paragraph("Overall Summary", heading_style))
    overall = report.get("overall", {})
    overall_data = [
        ["Metric", "Value"],
        ["Score", str(overall.get("score", 0))],
        ["Verdict", overall.get("verdict", "")],
        ["Confidence", f"{overall.get('confidence', 0.0):.1%}"],
    ]
    
    signal_dist = overall.get("signal_distribution", {})
    for signal, count in signal_dist.items():
        overall_data.append([f"Signal {signal.upper()}", str(count)])
    
    overall_table = Table(overall_data, colWidths=[2*inch, 3*inch])
    overall_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(overall_table)
    elements.append(Spacer(1, 20))
    
    # Categories section
    categories = report.get("categories", [])
    if categories:
        elements.append(Paragraph("Category Analysis", heading_style))
        for idx, category in enumerate(categories):
            elements.append(Paragraph(f"{category.get('category', '').title()} Analysis", subheading_style))
            
            cat_data = [
                ["Metric", "Value"],
                ["Score", str(category.get("score", 0))],
                ["Confidence", f"{category.get('confidence', 0.0):.1%}"],
                ["Weight", f"{category.get('weight', 0.0):.1%}"],
            ]
            
            signal_counts = category.get("signal_counts", {})
            for signal, count in signal_counts.items():
                cat_data.append([f"Signal {signal.upper()}", str(count)])
            
            cat_table = Table(cat_data, colWidths=[2*inch, 3*inch])
            cat_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(cat_table)
            elements.append(Spacer(1, 12))
            
            # Methods details for this category
            methods = category.get("methods", [])
            if methods:
                elements.append(Paragraph("Methods:", normal_style))
                method_data = [["Method ID", "Signal", "Confidence", "Key Result"]]
                for method in methods:
                    method_data.append([
                        method.get("method_id", ""),
                        method.get("signal", ""),
                        f"{method.get('confidence', 0.0):.1%}",
                        method.get("key_result", "")
                    ])
                
                method_table = Table(method_data, colWidths=[1.5*inch, 1*inch, 1*inch, 2.5*inch])
                method_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                elements.append(method_table)
                elements.append(Spacer(1, 12))
    
    # Risk Metrics section
    risk_metrics = report.get("risk_metrics", {})
    if any(v != 0 for v in risk_metrics.values()):
        elements.append(Paragraph("Risk Metrics", heading_style))
        risk_data = [["Metric", "Value"]]
        for metric, value in risk_metrics.items():
            # Format certain metrics as percentages
            if metric in ['sharpe_estimate', 'risk_reward_ratio']:
                formatted_value = f"{value:.2f}"
            elif 'return' in metric or 'var' in metric or 'drawdown' in metric:
                formatted_value = f"{value:.2%}"
            else:
                formatted_value = f"{value:.4f}"
            risk_data.append([metric.replace('_', ' ').title(), formatted_value])
        
        risk_table = Table(risk_data, colWidths=[2*inch, 3*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(risk_table)
        elements.append(Spacer(1, 20))
    
    # Key Metrics section
    key_metrics = report.get("key_metrics", [])
    if key_metrics:
        elements.append(Paragraph("Key Metrics", heading_style))
        km_data = [["Label", "Value", "Trend"]]
        for km in key_metrics:
            km_data.append([
                km.get("label", ""),
                km.get("value", ""),
                km.get("trend", "")
            ])
        
        km_table = Table(km_data, colWidths=[2*inch, 2*inch, 1*inch])
        km_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(km_table)
        elements.append(Spacer(1, 12))
    
    # Insights section
    insights = report.get("insights", [])
    if insights:
        elements.append(Paragraph("Insights", heading_style))
        for insight in insights:
            insight_text = f"<b>{insight.get('title', '')}</b>: {insight.get('description', '')}"
            p = Paragraph(insight_text, normal_style)
            elements.append(p)
            elements.append(Spacer(1, 6))
        elements.append(Spacer(1, 12))
    
    # Conflicts section
    conflicts = report.get("conflicts", [])
    if conflicts:
        elements.append(Paragraph("Conflicts", heading_style))
        for conflict in conflicts:
            conflict_text = f"<b>{conflict.get('type', '').title()}</b>: {conflict.get('description', '')} (Severity: {conflict.get('severity', '')})"
            p = Paragraph(conflict_text, normal_style)
            elements.append(p)
            elements.append(Spacer(1, 6))
        elements.append(Spacer(1, 12))
    
    # Method Details section
    method_details = report.get("method_details", [])
    if method_details:
        elements.append(Paragraph("Method Details", heading_style))
        method_data = [["Method ID", "Category", "Signal", "Confidence", "Key Result", "Weight"]]
        for method in method_details:
            method_data.append([
                method.get("method_id", ""),
                method.get("category", ""),
                method.get("signal", ""),
                f"{method.get('confidence', 0.0):.1%}",
                method.get("key_result", ""),
                f"{method.get('weight_in_consensus', 0.0):.1%}"
            ])
        
        method_table = Table(method_data, colWidths=[1*inch, 1*inch, 1*inch, 1*inch, 2*inch, 1*inch])
        method_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1, 9)),
]))