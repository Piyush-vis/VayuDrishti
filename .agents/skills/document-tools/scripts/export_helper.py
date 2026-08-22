"""
Document Tools & Data Exporter Utility
Provides utilities for generating tabular datasets, CSVs, and markdown reports.
"""

import json
import csv
from pathlib import Path
from datetime import datetime

def export_json_to_csv(data: list, output_csv_path: str):
    """Exports a list of dicts to a clean CSV with standard headers."""
    if not data:
        print("[WARNING] No data provided to export.")
        return
    
    keys = data[0].keys()
    with open(output_csv_path, 'w', newline='', encoding='utf-8') as f:
        dict_writer = csv.DictWriter(f, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)
    print(f"[SUCCESS] CSV exported to: {output_csv_path}")

def generate_markdown_report(title: str, summary_stats: dict, output_md_path: str):
    """Generates a formatted markdown report."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = [
        f"# {title}",
        "",
        f"> Generated on: {now}",
        "",
        "## Summary Metrics",
        "",
        "| Metric | Value |",
        "|---|---|"
    ]
    for k, v in summary_stats.items():
        lines.append(f"| **{k}** | `{v}` |")
    
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    print(f"[SUCCESS] Report written to: {output_md_path}")

if __name__ == "__main__":
    print("[INFO] Document Tools Export Helper is active and ready.")
