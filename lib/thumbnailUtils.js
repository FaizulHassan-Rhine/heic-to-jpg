/**
 * Generate a high-quality preview thumbnail from a File, Blob, or image URL.
 * Returns a base64 JPEG data URL (~30-80KB).
 */
export async function generateThumbnail(source, maxSize = 480) {
  return new Promise((resolve) => {
    let objectUrl = null;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Scale down to maxSize while preserving aspect ratio
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          // Enable high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, width, height);

          // Use JPEG at high quality for sharp previews
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          
          // Clean up object URL if we created one
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          
          resolve(dataUrl);
        } catch (error) {
          console.warn("Thumbnail generation error:", error);
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          resolve(null);
        }
      };

      img.onerror = (error) => {
        console.warn("Thumbnail image load error:", error);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        resolve(null);
      };

      // Handle different source types
      if (source instanceof Blob || source instanceof File) {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      } else if (typeof source === "string") {
        img.src = source;
      } else {
        resolve(null);
      }
    } catch (error) {
      console.warn("Thumbnail generation setup error:", error);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(null);
    }
  });
}

/**
 * Generate thumbnails for both input and output files.
 * Returns { inputThumbnail, outputThumbnail }
 */
export async function generateFileThumbnails(inputSource, outputSource, maxSize = 480) {
  const [inputThumbnail, outputThumbnail] = await Promise.all([
    generateThumbnail(inputSource, maxSize),
    generateThumbnail(outputSource, maxSize),
  ]);
  return { inputThumbnail, outputThumbnail };
}

