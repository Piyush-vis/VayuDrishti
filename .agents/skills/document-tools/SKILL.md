---
name: document-tools
description: >-
  Document generation, parsing, and data manipulation tools. Use when creating, reading, or editing
  Word (.docx), Excel (.xlsx / .csv), PDF documents, or generating formatted reports and presentation tables.
---

# Document Tools & Data Exporter

This skill provides guidelines and lightweight Python utilities to generate, parse, and manipulate structured document formats (`.docx`, `.xlsx`, `.csv`, `.pdf`).

---

## 1. Supported Formats & Recommended Tooling

| Format | Recommended Python Library | Best Use Case |
|---|---|---|
| **Excel (`.xlsx`, `.csv`)** | `pandas`, `openpyxl` | Tabular data exports, metrics reports, simulation dumps |
| **Word (`.docx`)** | `python-docx` | Structured technical reports, hackathon documentation, briefs |
| **PDF (`.pdf`)** | `reportlab`, `fpdf2`, `pypdf` | Exportable certificates, invoices, summary audit documents |
| **JSON / Structured Dumps** | Native `json`, `pathlib` | Schema exports, test fixtures, cached API responses |

---

## 2. Best Practices

1. **Deterministic Data Formatting**:
   - Format numbers cleanly: 2 decimal places for floating values (`f"{val:.2f}"`), human-readable timestamps (`YYYY-MM-DD HH:MM:SS UTC`).
   - Include clear table column headers, units (e.g. `µg/m³`, `ppm`, `°C`), and metadata header blocks.

2. **Safe File Operations**:
   - Write files to dedicated artifact or export directories (e.g. `exports/`, `reports/`).
   - Use UTF-8 encoding explicitly when writing text and CSV files on Windows systems: `open(file, 'w', encoding='utf-8')`.
