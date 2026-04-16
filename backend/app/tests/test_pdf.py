from pathlib import Path
import sys

from app.utils.pdf_tools import pdf_bytes_to_images


BACKEND_DIR = Path(__file__).resolve().parents[2]


def main():
    pdf_path = (
        Path(sys.argv[1]).expanduser().resolve()
        if len(sys.argv) > 1
        else BACKEND_DIR / "static" / "test_pdf.pdf"
    )

    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        print("Usage: python -m app.tests.test_pdf <path_to_pdf>")
        return

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    pages = pdf_bytes_to_images(pdf_bytes)

    print(f"Pages: {len(pages)}")
    for p in pages:
        p.show()  # Opens first page for confirmation


if __name__ == "__main__":
    main()



# POST -> SAVEPDF
# PDF -> INFERENCE -> OUTPUT
# GET -> GET OUTPUT 

# 2 api call -> handler -> 2 functions
