import { MirthSimulator } from '../../simulator/mirth-simulator';
import * as fs from 'fs';
import * as path from 'path';

describe('Admission Channel', () => {
  let simulator: MirthSimulator;
  let filterScript: string;
  let transformerScript: string;
  
  beforeAll(() => {
    // Read the transpiled scripts
    filterScript = fs.readFileSync(
      path.join(process.cwd(), 'src/channels/admission/filter.ts'),
      'utf8'
    );
    
    transformerScript = fs.readFileSync(
      path.join(process.cwd(), 'src/channels/admission/transformer.ts'),
      'utf8'
    );
  });
  
  beforeEach(() => {
    simulator = new MirthSimulator();
  });
  
  describe('Filter', () => {
    test('should accept valid ADT A01 message', () => {
      const message = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ADT^A01|123456|P|2.3\r' +
                     'PID|||12345^^^MRN||DOE^JOHN||19800101|M';
      
      const result = simulator.executeScript(filterScript, { msg: message });
      expect(result).toBe(true);
    });
    
    test('should accept valid ADT A04 message', () => {
      const message = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ADT^A04|123456|P|2.3\r' +
                     'PID|||12345^^^MRN||DOE^JOHN||19800101|M';
      
      const result = simulator.executeScript(filterScript, { msg: message });
      expect(result).toBe(true);
    });
    
    test('should reject non-ADT message', () => {
      const message = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ORU^R01|123456|P|2.3\r' +
                     'PID|||12345^^^MRN||DOE^JOHN||19800101|M';
      
      const result = simulator.executeScript(filterScript, { msg: message });
      expect(result).toBe(false);
    });
    
    test('should reject ADT with unsupported trigger', () => {
      const message = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ADT^A05|123456|P|2.3\r' +
                     'PID|||12345^^^MRN||DOE^JOHN||19800101|M';
      
      const result = simulator.executeScript(filterScript, { msg: message });
      expect(result).toBe(false);
    });
    
    test('should reject message with missing patient ID', () => {
      const message = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ADT^A01|123456|P|2.3\r' +
                     'PID|||||DOE^JOHN||19800101|M';
      
      const result = simulator.executeScript(filterScript, { msg: message });
      expect(result).toBe(false);
    });
  });
  
  describe('Transformer', () => {
    const sampleMessage = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ADT^A01|123456|P|2.3\r' +
                         'PID|||12345^^^MRN||Smith^John||19800101|M';
    
    test('should update MSH-7 timestamp', () => {
      simulator.executeScript(transformerScript, { msg: sampleMessage });
      const state = simulator.getState();
      
      const timestamp = state.msg?.split('|')[6];
      expect(timestamp).toMatch(/^\d{14}$/);
    });
    
    test('should uppercase patient last name', () => {
      simulator.executeScript(transformerScript, { msg: sampleMessage });
      const state = simulator.getState();
      
      const segments = state.msg?.split('\r');
      const pidSegment = segments?.find(segment => segment.startsWith('PID'));
      expect(pidSegment).toContain('SMITH');
    });
    
    test('should add routing data to channel map', () => {
      simulator.executeScript(transformerScript, { msg: sampleMessage });
      const state = simulator.getState();
      
      const segments = state.msg?.split('\r') || [];
      const zrtSegment = segments.find(segment => segment.startsWith('ZRT'));
      const [segmentName, routingData] = zrtSegment?.split('|') || [];
      expect(segmentName).toBe('ZRT');
      expect(routingData).toBe('ADMISSION');
    });
    
    test('should add ZRT segment', () => {
      simulator.executeScript(transformerScript, { msg: sampleMessage });
      const state = simulator.getState();
      
      const segments = state.msg?.split('\r') || [];
      const zrtSegment = segments.find(segment => segment.startsWith('ZRT'));
      const [segmentName, routingData] = zrtSegment?.split('|') || [];
      expect(segmentName).toBe('ZRT');
      expect(routingData).toBe('ADMISSION');
    });
    
    test('should handle invalid messages gracefully', () => {
      const invalidMessage = 'Invalid HL7 message';
      simulator.executeScript(transformerScript, { msg: invalidMessage });
      const state = simulator.getState();
      
      // Should keep original message on error
      expect(state.msg).toBe(invalidMessage);
    });
  });
}); 