/**
 * removeBackground
 * Draws an image onto a canvas and removes the background colour
 * (anything that is near-white, near-grey or near-light-beige) using a
 * flood-fill + edge-feathering approach so only the garment stays.
 */
export function removeBackground(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Sample the four corners – these are almost always background
      const cornerColors = [
        getPixel(data, width, 0, 0),
        getPixel(data, width, width - 1, 0),
        getPixel(data, width, 0, height - 1),
        getPixel(data, width, width - 1, height - 1),
        getPixel(data, width, Math.floor(width / 2), 0), // top-center
      ];

      // Build a visited mask and a queue (flood-fill from all corners)
      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      const isBackground = (r: number, g: number, b: number) => {
        // Is this pixel close to any corner colour OR is it very bright/neutral?
        for (const c of cornerColors) {
          const dist = Math.abs(r - c[0]) + Math.abs(g - c[1]) + Math.abs(b - c[2]);
          if (dist < 80) return true;
        }
        // Also kill pure white / very light grey independently
        if (r > 230 && g > 230 && b > 230) return true;
        return false;
      };

      // Seed from all four edges
      for (let x = 0; x < width; x++) {
        enqueue(x, 0);
        enqueue(x, height - 1);
      }
      for (let y = 0; y < height; y++) {
        enqueue(0, y);
        enqueue(width - 1, y);
      }

      function enqueue(x: number, y: number) {
        const idx = y * width + x;
        if (visited[idx]) return;
        const [r, g, b] = getPixel(data, width, x, y);
        if (isBackground(r, g, b)) {
          visited[idx] = 1;
          queue.push(x, y);
        }
      }

      // BFS flood-fill
      let i = 0;
      while (i < queue.length) {
        const x = queue[i++];
        const y = queue[i++];
        const neighbors = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = ny * width + nx;
          if (visited[nidx]) continue;
          const [r, g, b] = getPixel(data, width, nx, ny);
          if (isBackground(r, g, b)) {
            visited[nidx] = 1;
            queue.push(nx, ny);
          }
        }
      }

      // Apply alpha: erase visited (background) pixels with feathering
      const imageData = ctx.getImageData(0, 0, width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (visited[idx]) {
            imageData.data[idx * 4 + 3] = 0; // fully transparent
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageUrl); // fallback: original image
    img.src = imageUrl;
  });
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}
