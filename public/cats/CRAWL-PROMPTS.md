# Crawl animation assets

Generated September 29, 2026 using the built-in image generation tool. Existing static cat images were identity references. Selected PNG outputs were copied unchanged; each has eight poses on a transparent 1774 × 887 canvas. The renderer detects silhouettes rather than assuming uniform cell margins.

Assets: `silver-crawl.png`, `tuxedo-crawl.png`, `siamese-crawl.png`, `ginger-crawl.png`.

## Base prompt

Use case: identity-preserve. Reference image is the existing desktop cat; preserve its breed, fur colors and realistic anatomy. Create a production animation SPRITE SHEET, not a collage: exactly EIGHT sequential frames in an exact 4-column by 2-row grid, read left-to-right then top-to-bottom. Canvas 2048x1024, each cell 512x512. No grid lines or labels. Each cell shows the SAME full-body cat, side profile facing RIGHT, doing successive eighths of ONE low sneaking/crawling gait cycle IN PLACE. Belly low, bent elbows/hocks, alternating forepaw and rear paw contact, visible paw lift and reach. Frame 1 near forepaw extended forward and near hindpaw back; frames 2-4 retract and plant, frame 5 opposite limbs extended, frames 6-8 recover into frame 1. All eight poses must have different leg silhouettes. Head and torso anchored identically, same scale, nose at 88% cell width, ground at 80% cell height, body centered at 60% height. Entire tail extends left behind body, all feet inside each cell with 7% padding; tail held low with a slight curl. Tiny shoulder shift and tail movement, NOT eight identical photos. Photorealistic fur, soft consistent neutral lighting. Genuine TRANSPARENT alpha background, no floor, no shadows, no checkerboard drawn in, no text or watermark.

## Breed-specific additions

- Tuxedo: Image 1 is the tuxedo cat identity reference (black fur, white chest/paws, green eyes). Image 2 is a layout and gait reference only: match its exact 4x2 grid and pose progression, but make every cat the tuxedo cat from image 1.
- Siamese: Image 1 is the Siamese cat identity reference (cream body, chocolate face and paws, blue eyes). Image 2 is a layout and gait reference only: match its exact 4x2 grid and pose progression, but make every cat the Siamese cat from image 1.
- Ginger: Image 1 is the ginger tabby identity reference (orange striped coat, green eyes). Image 2 is a layout and gait reference only: match its exact 4x2 grid and pose progression, but make every cat the ginger tabby from image 1.

Silver used only its existing static image as reference. Other breeds used their static image first and the generated silver sheet second.
