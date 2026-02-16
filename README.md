# ComfyUI DD Nodes

Custom nodes for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) by Digital Divas.

## Nodes

### Text Nodes
- **DD Text Concatenate** - Concatenates two text strings with an optional separator
- **DD Text Replace** - Replaces occurrences of a search string within text
- **DD Show Text** - Displays text output in the UI

### Image Nodes
- **DD Image Resize** - Resizes an image to specified dimensions (nearest, bilinear, bicubic, area)
- **DD Image Batch** - Combines two images into a single batch
- **DD Get Image Size** - Returns the width and height of an image

### Math Nodes
- **DD Integer Math** - Performs math operations on two integers (add, subtract, multiply, divide, modulo, power, min, max)
- **DD Float Math** - Performs math operations on two floats
- **DD Int to Float** - Converts an integer to a float
- **DD Float to Int** - Converts a float to an integer with rounding mode selection

## Installation

Clone this repository into your ComfyUI `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/digital-divas-admin/ComfyUI_DD_Nodes.git
```

Restart ComfyUI to load the nodes.

## License

MIT License - see [LICENSE](LICENSE) for details.
