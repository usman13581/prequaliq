#!/usr/bin/env python3
"""Regenerate sample PDFs for AI profile-assist testing."""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

OUT = Path(__file__).resolve().parent / "pdfs"


def write_pdf(path, title, lines, footer=None):
    c = canvas.Canvas(str(path), pagesize=A4)
    w, h = A4
    y = h - 25 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20 * mm, y, title)
    y -= 12 * mm
    c.setFont("Helvetica", 10)
    for line in lines:
        if y < 25 * mm:
            c.showPage()
            y = h - 25 * mm
            c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y, line[:110])
        y -= 6 * mm
    if footer:
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(20 * mm, 15 * mm, footer)
    c.save()
    print("wrote", path.name)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    write_pdf(
        OUT / "01-nordic-facility-liability-insurance.pdf",
        "LIABILITY INSURANCE CERTIFICATE / ANSVARSFÖRSÄKRING",
        [
            "Policyholder / Försäkringstagare: Nordic Facility Services AB",
            "Organisation number / Org.nr: 556812-3344",
            "VAT / Tax ID: SE556812334401",
            "Address: Kungsgatan 45, 753 21 Uppsala, Sweden",
            "Phone: +46 18 10 22 00",
            "Website: https://www.nordicfacility.example",
            "",
            "Insurer / Försäkringsgivare: If Skadeförsäkring AB",
            "Insurance policy number: IF-UPP-2026-7781",
            "Coverage type: Public liability / Ansvarsförsäkring",
            "Insurance coverage amount: 15000000 SEK",
            "Valid from: 2026-01-01",
            "Valid to / Giltig till: 2027-12-31",
            "",
            "This certificate confirms that the policyholder holds a valid liability",
            "insurance for facility cleaning and sanitation services.",
            "Issued for public procurement qualification purposes.",
        ],
        "Sample test document for Prequaliq AI profile assist — not a real policy.",
    )
    write_pdf(
        OUT / "02-nordic-facility-company-registration.pdf",
        "COMPANY REGISTRATION EXTRACT / BOLAGSVERKET",
        [
            "Company name / Företagsnamn: Nordic Facility Services AB",
            "Registration number / Organisationsnummer: 556812-3344",
            "Tax ID / Momsregistreringsnummer: SE556812334401",
            "Legal form: Aktiebolag (AB)",
            "Registered address: Kungsgatan 45",
            "City / Postort: Uppsala",
            "Country: Sweden",
            "Postal code: 753 21",
            "Phone: +46 18 10 22 00",
            "Website: https://www.nordicfacility.example",
            "Year established / Bildat: 2004",
            "Number of employees / Antal anställda: 62",
            "Annual turnover / Omsättning (latest year): 18500000 SEK",
            "Business activities: Facility cleaning, sanitation, janitorial services",
            "CPV related: 90920000 Facility related sanitation services",
            "",
            "Directors: Jonas Berg (CEO)",
            "Status: Active / Aktivt",
        ],
        "Sample test document for Prequaliq AI profile assist.",
    )
    write_pdf(
        OUT / "03-nordic-facility-iso9001.pdf",
        "CERTIFICATE — ISO 9001:2015 QUALITY MANAGEMENT SYSTEM",
        [
            "Organisation: Nordic Facility Services AB",
            "Organisation number: 556812-3344",
            "Site: Kungsgatan 45, Uppsala, Sweden",
            "",
            "Standard: ISO 9001:2015 Quality Management System",
            "Scope: Cleaning and facility sanitation services for public and private clients",
            "Certificate number: QMS-NF-2024-0912",
            "Issued by: Nordic Cert AB (sample)",
            "Issue date: 2024-03-15",
            "Valid to: 2027-03-14",
            "",
            "Quality management system: Yes — ISO 9001 aligned QMS implemented",
            "The organisation maintains documented procedures for quality control,",
            "customer complaints, and continuous improvement for municipal cleaning contracts.",
        ],
        "Sample ISO-style certificate for Prequaliq AI extraction tests.",
    )
    write_pdf(
        OUT / "04-nordic-facility-iso14001.pdf",
        "CERTIFICATE — ISO 14001:2015 ENVIRONMENTAL MANAGEMENT",
        [
            "Organisation: Nordic Facility Services AB",
            "Organisation number: 556812-3344",
            "Address: Kungsgatan 45, Uppsala, Sweden",
            "",
            "Standard: ISO 14001:2015 Environmental Management System",
            "Scope: Environmental management for facility cleaning operations",
            "Certificate number: EMS-NF-2025-0441",
            "Issued by: Nordic Cert AB (sample)",
            "Valid to: 2028-01-31",
            "",
            "Environmental management system: Yes — ISO 14001 certified",
            "Chemicals handling and waste sorting procedures are documented.",
        ],
        "Sample environmental certificate for Prequaliq AI tests.",
    )
    write_pdf(
        OUT / "05-uppsala-entity-profile-letter.pdf",
        "UPPSALA STAD — FASTIGHET & SERVICE",
        [
            "Procuring entity / Upphandlande myndighet",
            "Entity name: Uppsala Stad — Fastighet & Service",
            "Address: Stationsgatan 12",
            "City: Uppsala",
            "Country: Sweden",
            "Phone: +46 18 727 00 00",
            "Contact person: Maria Lindqvist",
            "First name: Maria",
            "Last name: Lindqvist",
            "Email: maria.lindqvist@uppsalastad.e2e",
            "",
            "Department responsible for facility cleaning procurements.",
            "This letterhead is a sample document for AI profile assist testing.",
        ],
        "Sample PE document for Prequaliq AI profile assist.",
    )
    write_pdf(
        OUT / "06-minimal-company-only.pdf",
        "BUSINESS CARD / COMPANY NOTE",
        [
            "Company: Test Incomplete AB",
            "Registration number: 559999-0001",
            "City: Stockholm",
            "Country: Sweden",
            "",
            "(Intentionally minimal — use for incomplete profile / completeness checks)",
        ],
        "Minimal sample for negative / completeness testing.",
    )
    print(f"Done: {len(list(OUT.glob('*.pdf')))} PDFs in {OUT}")


if __name__ == "__main__":
    main()
