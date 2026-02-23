Objective: Implement a robust JSON Save/Load system for the elements array in the comicStore.

1. The SchemaThe project should be serialized into a single JSON object. For images, we store the reference URL or Asset Library ID.

JSON

{
  "metadata": {
    "title": "Project Title",
    "canvasSize": { "width": 800, "height": 1200 }
  },
  "elements": [
    {
      "id": "uuid",
      "type": "panel",
      "points": [x1, y1, x2, y2...],
      "imageRef": "asset_name.png",
      "imageTransform": { "x": 0, "y": 0, "scale": 1 }
    }
  ]
}

2. Geometry Restoration MathWhen loading a panel, the Agent must recalculate the "Cover" scale for images within polygons using the Bounding Box of the vertices $P$.$$x_{min} = \min(x_i), \quad x_{max} = \max(x_i)$$$$y_{min} = \min(y_i), \quad y_{max} = \max(y_i)$$The scale factor $S$ for the image fill is calculated as:$$S = \max\left(\frac{x_{max} - x_{min}}{w_{img}}, \frac{y_{max} - y_{min}}{h_{img}}\right)$$3. Verification Workflow (Mock AI)Step 1: Create a "Mock Generate" button.Step 2: When clicked, it assigns a random local asset to the selected panel.Step 3: Save to JSON, refresh the page, and Load.Success: The image must reappear inside the polygon with the correct clipping and scale.