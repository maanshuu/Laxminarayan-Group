import os
import pymupdf

os.makedirs('assets/projects/nilkanth/floor_plans', exist_ok=True)
os.makedirs('assets/projects/ds-208/floor_plans', exist_ok=True)

# 1. Nilkanth Floor plans & Plot plan (DPI=180 for crisp blueprint readability)
doc1 = pymupdf.open('uploads/nilkanth_villa/Floor plan 1.pdf')
doc1[0].get_pixmap(dpi=180).save('assets/projects/nilkanth/floor_plans/nilkanth_villa_type_a_floorplan.png')
print('OK: Nilkanth Type A floorplan saved')

doc2 = pymupdf.open('uploads/nilkanth_villa/Floor plan 2.pdf')
doc2[0].get_pixmap(dpi=180).save('assets/projects/nilkanth/floor_plans/nilkanth_villa_type_b_floorplan.png')
print('OK: Nilkanth Type B floorplan saved')

doc3 = pymupdf.open('uploads/nilkanth_villa/Plot Plan.pdf')
doc3[0].get_pixmap(dpi=180).save('assets/projects/nilkanth/floor_plans/nilkanth_master_layout_plan.png')
print('OK: Nilkanth Master Plot plan saved')

# 2. DS 208 Floor plans from Brochure
ds_doc = pymupdf.open('uploads/ds208/Akshar DS 208 Brochure.pdf')
# Page 4: Shops Ground Floor Plan
ds_doc[3].get_pixmap(dpi=150).save('assets/projects/ds-208/floor_plans/ds208_shops_ground_floorplan.png')
print('OK: DS 208 Shops Ground Floorplan saved')

# Page 5: First & Typical Master Floor Plan
ds_doc[4].get_pixmap(dpi=150).save('assets/projects/ds-208/floor_plans/ds208_typical_master_floorplan.png')
print('OK: DS 208 Typical Master Floorplan saved')

# Page 8: 2 BHK Floor Plans
ds_doc[7].get_pixmap(dpi=150).save('assets/projects/ds-208/floor_plans/ds208_2bhk_floorplan.png')
print('OK: DS 208 2 BHK Floorplan saved')

# Page 10: 3 BHK Floor Plan
ds_doc[9].get_pixmap(dpi=150).save('assets/projects/ds-208/floor_plans/ds208_3bhk_floorplan.png')
print('OK: DS 208 3 BHK Floorplan saved')
