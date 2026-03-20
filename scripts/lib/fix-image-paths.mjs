/**
 * Converts all _images and resources references to /assets/
 * @param {string} content - The markdown content to process
 * @returns {string} Content with fixed image paths
 */
export function fixImagePaths(content) {
  return (
    content
      // Handle any relative path to _images (../../_images/, ../../../_images/, etc.)
      .replace(/(\.\.\/)+_images\/([\w-]+\.(png|svg))/g, "/assets/$2")
      // Handle direct _images references
      .replace(/_images\/([\w-]+\.(png|svg))/g, "/assets/$1")
      // Handle resources paths for create-pepr-operator tutorial
      .replace(/resources\/create-pepr-operator\/(light|dark)\.png/g, "/assets/$1.png")
  );
}
