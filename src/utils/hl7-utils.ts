export function getHL7Field(message: string, segment: string, field: number, component: number = 1): string {
  try {
    // Find the segment
    const lines = message.split('\n');
    const segmentLine = lines.find(line => line.startsWith(segment));
    if (!segmentLine) return '';

    // Split into fields
    const fields = segmentLine.split('|');
    if (field >= fields.length) return '';

    // Get components if needed
    const fieldValue = fields[field];
    if (component === 1) {
      const components = fieldValue.split('^');
      return components[0] || '';
    } else if (component > 1) {
      const components = fieldValue.split('^');
      return components[component - 1] || '';
    }

    return fieldValue || '';
  } catch (error) {
    console.error('Error extracting HL7 field:', error);
    return '';
  }
}

export function setHL7Field(message: string, segment: string, field: number, value: string, component: number = 0): string {
  try {
    const lines = message.split('\n');
    const segmentIndex = lines.findIndex(line => line.startsWith(segment));
    if (segmentIndex === -1) return message;

    const fields = lines[segmentIndex].split('|');
    
    // Handle component updates
    if (component > 0) {
      const components = (fields[field] || '').split('^');
      components[component - 1] = value;
      // Only keep up to the last non-empty component
      while (components.length > 0 && !components[components.length - 1]) {
        components.pop();
      }
      fields[field] = components.join('^');
    } else {
      fields[field] = value;
    }

    lines[segmentIndex] = fields.join('|');
    return lines.join('\n');
  } catch (error) {
    console.error('Error setting HL7 field:', error);
    return message;
  }
}

export function createHL7Segment(segmentName: string, ...fields: string[]): string {
  if (!fields || fields.length === 0) return segmentName;
  // Remove trailing empty fields
  while (fields.length > 0 && !fields[fields.length - 1]) {
    fields.pop();
  }
  return fields.length > 0 ? `${segmentName}|${fields.join('|')}` : segmentName;
} 