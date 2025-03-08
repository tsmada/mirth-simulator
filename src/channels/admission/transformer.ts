import { getHL7Field, setHL7Field, insertHL7SegmentAfter } from '../../lib/hl7-utils';
import { Logger } from '../../types/mirth';

declare const logger: Logger;
declare let msg: string;
declare const $c: (key: string, value?: any) => any;

/**
 * ADT transformer
 * Adds custom fields and standardizes patient data
 */
export function transformMessage(): string {
  try {
    // Get the current timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    
    // Set processing timestamp in MSH-7
    let transformedMsg = setHL7Field(msg, 'MSH', 7, timestamp);
    
    // Standardize patient name format (upper case last name)
    let patientName = getHL7Field(transformedMsg, 'PID', 5);
    if (patientName) {
      const nameParts = patientName.split('^');
      if (nameParts.length >= 2) {
        nameParts[0] = nameParts[0].toUpperCase();
        patientName = nameParts.join('^');
        transformedMsg = setHL7Field(transformedMsg, 'PID', 5, patientName);
      }
    }
    
    // Add a custom Z segment with routing information
    const routingData = 'ADMISSION';
    
    // Store routing data in channel map for later use
    $c('routingData', routingData);
    
    // Add our custom Z segment
    transformedMsg = insertHL7SegmentAfter(
      transformedMsg,
      `ZRT|${routingData}`,
      'MSH'
    );

    logger.info('Transformed message:', transformedMsg);
    
    logger.info('Message transformation complete');
    return transformedMsg;
  } catch (error) {
    logger.error('Error in transformer script:', error);
    return msg;
  }
}

// Return the result of the function call
transformMessage(); 