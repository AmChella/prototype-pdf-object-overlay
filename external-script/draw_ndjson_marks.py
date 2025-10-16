
import argparse
import json
import logging
from pathlib import Path
from PIL import Image, ImageDraw

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def draw_marks(ndjson_path, img_prefix, output_dir, radius, color, thickness):
    """
    Reads coordinates from an NDJSON file and draws them on a series of images.

    Usage example:
    python draw_ndjson_marks.py document-generated-texpos.ndjson document-images --output-dir annotated
    """

    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)

    # Read NDJSON file and group coordinates by page
    coords_by_page = {}
    with open(ndjson_path, 'r') as f:
        for line in f:
            try:
                data = json.loads(line)
                page = data.get('page')
                x_sp = float(data.get('xsp'))
                y_sp = float(data.get('ysp'))

                if page is not None and x_sp is not None and y_sp is not None:
                    if page not in coords_by_page:
                        coords_by_page[page] = []
                    coords_by_page[page].append((x_sp, y_sp))
                else:
                    logging.warning(f"Skipping malformed line: {line.strip()}")

            except (json.JSONDecodeError, TypeError, ValueError) as e:
                logging.warning(f"Skipping malformed line: {line.strip()} ({e})")
    
    # Process each page
    for page, coords in coords_by_page.items():
        img_path = Path(f"{img_prefix}-{page:02}.png")
        if not img_path.exists():
            img_path = Path(f"{img_prefix}-{page}.png")
        
        if not img_path.exists():
            logging.warning(f"Image not found for page {page}: {img_path}")
            continue

        # Open image and draw coordinates
        with Image.open(img_path).convert("RGBA") as img:
            draw = ImageDraw.Draw(img)
            
            # Get image dimensions for coordinate conversion
            img_width, img_height = img.size
            
            for x_sp, y_sp in coords:
                # Convert from scaled points (sp) to pixels
                x_px = (x_sp / 65536) * (img_width / 597.50787)
                y_px = img_height - (y_sp / 65536) * (img_height / 845.04684)


                # Draw a circle at the coordinate
                draw.ellipse(
                    [(x_px - radius, y_px - radius), (x_px + radius, y_px + radius)],
                    outline=color,
                    width=thickness
                )

            # Save the annotated image
            output_path = output_dir / f"{img_path.stem}-annotated.png"
            img.save(output_path)
            logging.info(f"Saved annotated image: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Draw coordinates from NDJSON file onto images.")
    parser.add_argument("ndjson_path", type=Path, help="Path to the NDJSON file")
    parser.add_argument("img_prefix", type=str, help="Prefix for the image files (e.g., 'document-images')")
    parser.add_argument("--output-dir", type=Path, default=Path("."), help="Output directory for annotated images")
    parser.add_argument("--radius", type=int, default=10, help="Radius of the circles to draw")
    parser.add_argument("--color", type=str, default="red", help="Color of the circles")
    parser.add_argument("--thickness", type=int, default=2, help="Thickness of the circle outline")

    args = parser.parse_args()

    draw_marks(args.ndjson_path, args.img_prefix, args.output_dir, args.radius, args.color, args.thickness)
