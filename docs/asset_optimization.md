# Asset Optimization Guide

To drastically improve load times and reduce the file size of the game assets, we use **WebP** compression and dimension resizing via the official Google `cwebp` tool.

## Prerequisites

You need to install the `webp` package using Homebrew. This provides the `cwebp` command-line encoder, which is highly optimized and written in C.

```bash
brew install webp
```

## Usage

### Converting a Single Image
To convert a single image to WebP (with a quality of 85) and resize it to a maximum width of 600 pixels while maintaining its aspect ratio:

```bash
cwebp -q 85 -resize 600 0 assets/hq/my_image.png -o assets/optimized/my_image.webp
```
*(The `0` for height tells `cwebp` to automatically calculate the height to maintain the original aspect ratio).*

### Batch Processing an Entire Folder
To process the entire `assets/hq` folder automatically, you can run the following bash command from the root of the project. This will find all PNGs, perfectly mirror your folder structure inside `assets/optimized`, convert and resize them, and save them as `.webp` files.

```bash
# Find all PNGs in the assets/hq folder, mirror the directory structure, and convert to WebP
find assets/hq -type f -name "*.png" -exec bash -c '
  for file; do
    # Get the path relative to assets/hq
    rel_path="${file#assets/hq/}"
    
    # Define the output file path in assets/lq
    out_file="assets/lq/${rel_path%.*}.webp"
    
    # Create the parent directories for the output file
    mkdir -p "$(dirname "$out_file")"
    
    # Convert and resize
    cwebp -q 85 -resize 600 0 "$file" -o "$out_file"
  done
' _ {} +
```

### Why `cwebp`?
* **Performance:** It is written in highly optimized C, making it incredibly fast.
* **Official Tools:** It utilizes the exact compression algorithms engineered by the team that created the WebP format.
* **Standalone:** Avoids the need for Python environments, `pip` installs, or maintaining external script files.
