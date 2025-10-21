
import argparse
import json
import logging
from pathlib import Path
from PIL import Image, ImageDraw

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def draw_bounding_boxes(ndjson_path, img_prefix, output_dir, color, thickness):
    """
    Reads coordinates from an NDJSON file and draws bounding boxes on a series of images.

    Usage example:
    python draw_bounding_boxes.py document-generated-texpos.ndjson document-images --output-dir annotated
    """

    output_dir.mkdir(parents=True, exist_ok=True)

    elements_by_page = {}
    with open(ndjson_path, 'r') as f:
        for line in f:
            try:
                data = json.loads(line)
                page = data.get('page')
                element_id = data.get('id')
                role = data.get('role')
                x_sp = float(data.get('xsp'))
                y_sp = float(data.get('ysp'))
                cw_sp = float(data.get('cwsp'))
                pw_str = data.get('pw', '597.50787pt').replace('pt', '')
                ph_str = data.get('ph', '845.04684pt').replace('pt', '')
                pw = float(pw_str)
                ph = float(ph_str)

                if not all([page, element_id, role, x_sp is not None, y_sp is not None, cw_sp is not None]):
                    logging.warning(f"Skipping malformed line: {line.strip()}")
                    continue

                if page not in elements_by_page:
                    elements_by_page[page] = {}
                if element_id not in elements_by_page[page]:
                    elements_by_page[page][element_id] = {}
                
                role_type = role.split('-')[-1]
                if role_type in ['start', 'end']:
                     elements_by_page[page][element_id][role_type] = (x_sp, y_sp, cw_sp, pw, ph)

            except (json.JSONDecodeError, TypeError, ValueError) as e:
                logging.warning(f"Skipping malformed line: {line.strip()} ({e})")

    for page, elements in elements_by_page.items():
        img_path = Path(f"{img_prefix}-{page}.png")
        if not img_path.exists():
            logging.warning(f"Image not found for page {page}: {img_path}")
            continue

        with Image.open(img_path).convert("RGBA") as img:
            draw = ImageDraw.Draw(img)
            img_width, img_height = img.size

            for element_id, roles in elements.items():
                if 'start' in roles and 'end' in roles:
                    start_x_sp, start_y_sp, cw_sp, pw, ph = roles['start']
                    _, end_y_sp, _, _, _ = roles['end']

                    x1_sp = start_x_sp
                    y1_sp = start_y_sp
                    x2_sp = start_x_sp + cw_sp
                    y2_sp = end_y_sp

                    x1_px = (x1_sp / 65536) * (img_width / pw)
                    y1_px = img_height - (y1_sp / 65536) * (img_height / ph)
                    x2_px = (x2_sp / 65536) * (img_width / pw)
                    y2_px = img_height - (y2_sp / 65536) * (img_height / ph)

                    draw.rectangle(
                        [(x1_px, y1_px), (x2_px, y2_px)],
                        outline=color,
                        width=thickness
                    )

            output_path = output_dir / f"{img_path.stem}-annotated.png"
            img.save(output_path)
            logging.info(f"Saved annotated image: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Draw bounding boxes from NDJSON file onto images.")
    parser.add_argument("ndjson_path", type=Path, help="Path to the NDJSON file")
    parser.add_argument("img_prefix", type=str, help="Prefix for the image files (e.g., 'document-images')")
    parser.add_argument("--output-dir", type=Path, default=Path("annotated"), help="Output directory for annotated images")
    parser.add_argument("--color", type=str, default="blue", help="Color of the bounding boxes")
    parser.add_argument("--thickness", type=int, default=2, help="Thickness of the bounding box outline")

    args = parser.parse_args()

    draw_bounding_boxes(args.ndjson_path, args.img_prefix, args.output_dir, args.color, args.thickness)
