/**
 * HL7 utility functions for Mirth Connect
 */

// Import logger type from Mirth types
import { Logger } from '../types/mirth';

// Get the global logger instance
declare const logger: Logger;

/**
 * Normalize line endings in an HL7 message
 * @param message The HL7 message string
 * @returns The message with normalized line endings
 */
function normalizeLineEndings(message: string): string {
  return message.replace(/\r\n|\n|\r/g, '\r');
}

/**
 * Get a field from an HL7 message
 * @param message The HL7 message string
 * @param segment The segment name (e.g., 'MSH', 'PID')
 * @param field The field number (1-based)
 * @param component The component number (1-based, optional)
 * @returns The field value or empty string if not found
 */
export function getHL7Field(message: string, segment: string, field: number, component: number = 0): string {
  try {
    // Normalize line endings
    message = normalizeLineEndings(message);

    // Find the segment
    const lines = message.split('\r');
    const segmentLine = lines.find(line => line.startsWith(segment));
    if (!segmentLine) return '';

    // Handle MSH segment specially
    if (segment === 'MSH') {
      // MSH-1 is the field separator
      if (field === 1) return segmentLine[3];
      // MSH-2 is the encoding characters
      if (field === 2) return segmentLine.substring(3, 8);
      // For other fields, adjust the index since MSH-1 and MSH-2 are special
      const fields = [
        '', // MSH-1 (field separator)
        '', // MSH-2 (encoding characters)
        ...segmentLine.substring(8).split('|')
      ];
      const fieldValue = fields[field];
      if (!fieldValue) return '';

      if (component > 0) {
        const components = fieldValue.split('^');
        return components[component - 1] || '';
      }
      return fieldValue;
    }

    // For non-MSH segments
    const fields = segmentLine.split('|');
    if (field >= fields.length) return '';

    const fieldValue = fields[field];
    if (!fieldValue) return '';

    if (component > 0) {
      const components = fieldValue.split('^');
      return components[component - 1] || '';
    }

    return fieldValue;
  } catch (error) {
    console.error('Error extracting HL7 field:', error);
    return '';
  }
}

/**
 * Set a field in an HL7 message
 * @param message The HL7 message string
 * @param segment The segment name (e.g., 'MSH', 'PID')
 * @param field The field number (1-based)
 * @param value The value to set
 * @param component The component number (1-based, optional)
 * @returns The modified message
 */
export function setHL7Field(message: string, segment: string, field: number, value: string, component: number = 0): string {
  try {
    // Normalize line endings
    message = normalizeLineEndings(message);

    const lines = message.split('\r');
    const segmentIndex = lines.findIndex(line => line.startsWith(segment));
    if (segmentIndex === -1) return message;

    // Handle MSH segment specially
    if (segment === 'MSH') {
      const segmentLine = lines[segmentIndex];
      if (field === 1) {
        // Cannot modify MSH-1
        return message;
      }
      if (field === 2) {
        // Cannot modify MSH-2
        return message;
      }
      // For other fields, adjust the index since MSH-1 and MSH-2 are special
      const fields = [
        '', // MSH-1 (field separator)
        '', // MSH-2 (encoding characters)
        ...segmentLine.substring(8).split('|')
      ];

      if (component > 0) {
        const components = (fields[field] || '').split('^');
        components[component - 1] = value;
        fields[field] = components.join('^');
      } else {
        fields[field] = value;
      }

      lines[segmentIndex] = `MSH|${segmentLine.substring(4, 8)}${fields.slice(2).join('|')}`;
      return lines.join('\r');
    }

    // For non-MSH segments
    const fields = lines[segmentIndex].split('|');
    
    // Ensure we have enough fields
    while (fields.length <= field) {
      fields.push('');
    }
    
    if (component > 0) {
      const components = (fields[field] || '').split('^');
      // Ensure we have enough components
      while (components.length < component) {
        components.push('');
      }
      components[component - 1] = value;
      fields[field] = components.join('^');
    } else {
      fields[field] = value;
    }

    lines[segmentIndex] = fields.join('|');
    return lines.join('\r');
  } catch (error) {
    console.error('Error setting HL7 field:', error);
    return message;
  }
}

/**
 * Create a new HL7 segment
 * @param segmentName The segment name (e.g., 'PID', 'NK1')
 * @param fields Array of field values
 * @returns The formatted segment string
 */
export function createHL7Segment(segmentName: string, fields: string[] = []): string {
  return fields.length > 0 ? `${segmentName}|${fields.join('|')}` : segmentName;
}

/**
 * Get all instances of a segment from an HL7 message
 * @param message The HL7 message string
 * @param segment The segment name (e.g., 'NK1', 'OBX')
 * @returns Array of segment strings
 */
export function getHL7Segments(message: string, segmentName: string): string[] {
  try {
    // Normalize line endings
    message = normalizeLineEndings(message);
    return message.split('\r').filter(line => line.startsWith(segmentName));
  } catch (error) {
    logger.error('Error getting HL7 segments:', error);
    return [];
  }
}

/**
 * Insert a segment into an HL7 message after a specified segment
 * @param message The HL7 message string
 * @param newSegment The segment to insert
 * @param afterSegment The segment name to insert after
 * @returns The modified message
 */
export function insertHL7SegmentAfter(message: string, newSegment: string, afterSegment: string): string {
  try {
    // Normalize line endings
    message = normalizeLineEndings(message);

    const lines = message.split('\r');
    const segmentIndex = lines.findIndex(line => line.startsWith(afterSegment));
    if (segmentIndex === -1) return message;

    lines.splice(segmentIndex + 1, 0, newSegment);
    return lines.join('\r');
  } catch (error) {
    logger.error('Error inserting HL7 segment:', error);
    return message;
  }
}

/**
 * Remove all instances of a segment from an HL7 message
 * @param message The HL7 message string
 * @param segment The segment name to remove
 * @returns The modified message
 */
export function removeHL7Segments(message: string, segmentName: string): string {
  try {
    // Normalize line endings
    message = normalizeLineEndings(message);

    const lines = message.split('\r');
    const filteredLines = lines.filter(line => !line.startsWith(segmentName));
    return filteredLines.join('\r');
  } catch (error) {
    logger.error('Error removing HL7 segments:', error);
    return message;
  }
} 