import { Injectable } from "@angular/core";

@Injectable()
/**
 * Utility service providing common operations.
 */
export class UtilsService {

  /**
   * Returns the most frequently occurring element in the array.
   * @param arr Array of numbers
   * @returns The element with the highest frequency
   */
   static getMostFrequentElement(arr) {
    const store = {};
    arr.forEach((num) => store[num] ? store[num] += 1 : store[num] = 1);
    // Find the key with the highest value (frequency)
    return parseInt(Object.keys(store).sort((a, b) => store[b] - store[a])[0]);
  }

  /**
   * Returns the frequency of the most frequently occurring element in the array.
   * @param arr Array of elements
   * @returns The highest frequency count
   */
  static getFrequencyOfMostFrequentElement(arr) {
    var mp = new Map();
    var n = arr.length;

    // Count frequencies of each element
    for (var i = 0; i < n; i++) {
      if (mp.has(arr[i]))
        mp.set(arr[i], mp.get(arr[i]) + 1)
      else
        mp.set(arr[i], 1)
    }

    var keys = [];
    mp.forEach((value, key) => {
      keys.push(key);
    });
    keys.sort((a, b) => a - b);

    // Find the maximum frequency
    let max = -Infinity;
    keys.forEach((key) => {
      let val = mp.get(key);
      if (val > max) {
        max = val;
      }
    });
    return max;
  }

  /**
   * Generate n random numbers between min and max (inclusive), sort, and return as breaks.
   * @param min Minimum value
   * @param max Maximum value
   * @param n Number of random numbers to generate
   * @returns Array of random numbers
   */
  static getRandomUniqueNumbers(min: number, max: number, n: number): number[] {
    if (typeof min !== 'number' || typeof max !== 'number' || n < 1 || min >= max) return [];
    const numbers = [];
    for (let i = 0; i < n; i++) {
      numbers.push(Math.random() * (max - min) + min);
    }
    // Return
    return numbers;
  }

  /**
   * Validates and converts any color format to a standardized hex string.
   * Handles D3 color objects, RGB/RGBA strings, HSL strings, hex strings, and named colors.
   * 
   * @param color - The color to validate and convert (can be object, string, or any format)
   * @returns A valid hex color string (e.g., "#ff0000") or named color string
   */
  static validateColor(color: any): string {
    if (!color || color === undefined || color === null) {
      return "#000000";
    }
    
    // If it's already a hex string, return it
    const colorStr = String(color).trim();
    if (/^#[0-9A-F]{6}$/i.test(colorStr)) return colorStr;
    
    // Handle named colors
    const namedColors = ['black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'gray', 'grey'];
    if (namedColors.includes(colorStr.toLowerCase())) return colorStr;
    
    // Handle D3 RGB objects (e.g., {r: 255, g: 0, b: 0})
    if (typeof color === 'object' && color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      const r = Math.round(color.r);
      const g = Math.round(color.g);
      const b = Math.round(color.b);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Handle RGB/RGBA strings (e.g., "rgb(255, 0, 0)" or "rgba(255, 0, 0, 1)")
    if (/^rgb\(|^rgba\(/.test(colorStr)) {
      // Extract RGB values from string
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Handle HSL strings (e.g., "hsl(0, 100%, 50%)")
    if (/^hsl\(|^hsla\(/.test(colorStr)) {
      // Convert HSL to RGB then to hex
      const match = colorStr.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/);
      if (match) {
        const h = parseInt(match[1]);
        const s = parseInt(match[2]);
        const l = parseInt(match[3]);
        // Simple HSL to RGB conversion
        const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l / 100 - c / 2;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // If all else fails, return black
    return "#000000";
  }

  /**
   * Generates a single color from a D3 color scheme using robust logic that handles all types.
   * Supports sequential single-hue, multi-hue, diverging, cyclical, and categorical color schemes.
   * 
   * @param colorScheme - The color scheme object from COLOR_SCHEMES configuration
   * @param offset - The offset (0 to 1) representing position in the color scale
   * @param binCount - Total number of bins (required for discrete schemes like d3.schemeBlues[5])
   * @returns A valid hex color string
   * 
   * @example
   * // For interpolator-based schemes (Turbo, Viridis, etc.)
   * const color = UtilsService.generateColor(turboScheme, 0.5);
   * 
   * // For discrete schemes (Blues, Greens, etc.)
   * const color = UtilsService.generateColor(bluesScheme, 0.5, 5);
   */
  static generateColor(colorScheme: any, offset: number, binCount?: number): string {
    try {
      const fn = colorScheme["function"];
      let color;
      
      if (typeof fn === "function") {
        // For interpolator functions (Turbo, Viridis, Magma, etc.)
        color = fn(offset);
      } else if (fn && typeof fn === "object" && Array.isArray(fn[binCount])) {
        // For discrete color schemes with specific bin counts (d3.schemeBlues[5], etc.)
        const arr = fn[binCount];
        const idx = Math.floor(offset * (arr.length - 1));
        color = arr[idx];
      } else if (Array.isArray(fn)) {
        // For categorical color schemes (arrays of colors)
        color = fn[Math.floor(offset * (fn.length - 1))];
      } else if (typeof colorScheme["interpolator"] === "function") {
        // Fallback to interpolator if function is not available
        color = colorScheme["interpolator"](offset);
      } else {
        // Final fallback: simple blue to red gradient
        color = offset < 0.5 ? "#0000ff" : "#ff0000";
      }
      
      return UtilsService.validateColor(color);
    } catch (err) {
      // Error fallback: simple blue to red gradient
      return offset < 0.5 ? "#0000ff" : "#ff0000";
    }
  }

  /**
   * Generates gradient stops for a color scheme using the generateColor function.
   * Useful for creating continuous color gradients in visualizations.
   * 
   * @param colorScheme - The color scheme object from COLOR_SCHEMES configuration
   * @param numStops - Number of gradient stops to generate (default: 11)
   * @param binCount - Total number of bins (required for discrete schemes like d3.schemeBlues[5])
   * @returns Array of gradient stops with offset and color properties
   * 
   * @example
   * const stops = UtilsService.generateGradientStops(turboScheme, 11);
   * // Returns: [{offset: 0, color: "#000000"}, {offset: 0.1, color: "#..."}, ...]
   */
  static generateGradientStops(colorScheme: any, numStops: number = 11, binCount?: number): Array<{offset: number, color: string}> {
    const stops = [];
    for (let i = 0; i < numStops; i++) {
      const offset = i / (numStops - 1);
      stops.push({ 
        offset, 
        color: UtilsService.generateColor(colorScheme, offset, binCount) 
      });
    }
    return stops;
  }
}
