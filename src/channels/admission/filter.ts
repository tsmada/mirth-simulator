import { getHL7Field } from '../../lib/hl7-utils';
import { Logger } from '../../types/mirth';

declare const logger: Logger;
declare const msg: string;

/**
 * Filter for ADT messages
 * Accepts A01, A02, A03, A04 triggers only
 */
export function filterMessage(): boolean {
  try {
    // Get the message type and trigger
    const messageType = getHL7Field(msg, 'MSH', 9, 1);
    const trigger = getHL7Field(msg, 'MSH', 9, 2);
    
    logger.info(`Processing message type: ${messageType}^${trigger}`);
    
    // Check if it's an ADT message
    if (messageType !== 'ADT') {
      logger.debug('Rejecting non-ADT message');
      return false;
    }
    
    // Check if it's one of our accepted triggers
    const acceptedTriggers = ['A01', 'A02', 'A03', 'A04'];
    if (!acceptedTriggers.includes(trigger)) {
      logger.debug(`Rejecting ADT with trigger ${trigger}`);
      return false;
    }
    
    // Additional validation
    const patientId = getHL7Field(msg, 'PID', 3);
    if (!patientId) {
      logger.warn('Rejecting message with missing patient ID');
      return false;
    }
    
    logger.info('Message accepted');
    return true;
  } catch (error) {
    logger.error('Error in filter script:', error);
    return false;
  }
}

// Return the result of the function call
filterMessage(); 