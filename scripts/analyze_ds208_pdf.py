import fitz # PyMuPDF
import os

pdf_path = r'D:\Himanshu\akshar_ds208_extracted\AKSHAR DS 208\Akshar DS 208.pdf'
doc = fitz.open(pdf_path)

print(f"Total pages in brochure: {len(doc)}")

out_dir = r'D:\Himanshu\Laxminarayan_Group_admin_login_FINAL\assets\projects\ds-208\brochure_pages'
os.makedirs(out_dir, exist_ok=True)

for i in range(len(doc)):
    page = doc[i]
    text = page.get_text()
    print(f"\n================ PAGE {i+1} ================")
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    print("\n".join(lines[:15])) # print first 15 lines of text
    
    # Render page as PNG image for inspection and floor plans
    pix = page.get_pixmap(dpi=150)
    page_img_path = os.path.join(out_dir, f"page_{i+1:02d}.png")
    pix.save(page_img_path)

print(f"\nAll pages rendered to {out_dir}")
