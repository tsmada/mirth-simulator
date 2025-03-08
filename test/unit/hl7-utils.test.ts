/// <reference types="jest" />

import { getHL7Field, setHL7Field, createHL7Segment, getHL7Segments, insertHL7SegmentAfter, removeHL7Segments } from '../../src/lib/hl7-utils';
import { Logger } from '../../src/types/mirth';

// Mock the logger
const mockLogger: Logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Make logger available globally
declare const global: any;
global.logger = mockLogger;

describe('HL7 Utilities', () => {
  const sampleHL7 = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230901120000||ADT^A01|123456|P|2.3\r' +
                    'PID|||12345^^^MRN||DOE^JOHN||19800101|M\r' +
                    'NK1|1|DOE^JANE|SPO|123 MAIN ST^^ANYTOWN^ST^12345';
  
  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();
  });
  
  describe('getHL7Field', () => {
    test('should extract field correctly', () => {
      const messageType = getHL7Field(sampleHL7, 'MSH', 9, 1);
      expect(messageType).toBe('ADT');
      
      const trigger = getHL7Field(sampleHL7, 'MSH', 9, 2);
      expect(trigger).toBe('A01');
      
      const lastName = getHL7Field(sampleHL7, 'PID', 5, 1);
      expect(lastName).toBe('DOE');
    });
    
    test('should handle missing segments gracefully', () => {
      const value = getHL7Field(sampleHL7, 'PV1', 2);
      expect(value).toBe('');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
    
    test('should handle invalid field numbers gracefully', () => {
      const value = getHL7Field(sampleHL7, 'MSH', 99);
      expect(value).toBe('');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
  
  describe('setHL7Field', () => {
    test('should update field correctly', () => {
      const updatedHL7 = setHL7Field(sampleHL7, 'MSH', 9, 'ADT^A04');
      expect(getHL7Field(updatedHL7, 'MSH', 9)).toBe('ADT^A04');
      
      const nameUpdated = setHL7Field(sampleHL7, 'PID', 5, 'SMITH^JOHN');
      expect(getHL7Field(nameUpdated, 'PID', 5)).toBe('SMITH^JOHN');
    });
    
    test('should handle missing segments gracefully', () => {
      const result = setHL7Field(sampleHL7, 'PV1', 2, 'INPATIENT');
      expect(result).toBe(sampleHL7);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
    
    test('should update component correctly', () => {
      const result = setHL7Field(sampleHL7, 'PID', 5, 'SMITH', 1);
      expect(getHL7Field(result, 'PID', 5, 1)).toBe('SMITH');
      expect(getHL7Field(result, 'PID', 5, 2)).toBe('JOHN');
    });
  });
  
  describe('createHL7Segment', () => {
    test('should create segment correctly', () => {
      const segment = createHL7Segment('PV1', ['1', 'INPATIENT', 'ROOM123']);
      expect(segment).toBe('PV1|1|INPATIENT|ROOM123');
    });
    
    test('should handle empty fields', () => {
      const segment = createHL7Segment('PV1');
      expect(segment).toBe('PV1');
    });
  });
  
  describe('getHL7Segments', () => {
    test('should get all matching segments', () => {
      const nk1Segments = getHL7Segments(sampleHL7, 'NK1');
      expect(nk1Segments).toHaveLength(1);
      expect(nk1Segments[0]).toContain('DOE^JANE');
    });
    
    test('should return empty array for non-existent segments', () => {
      const segments = getHL7Segments(sampleHL7, 'OBX');
      expect(segments).toHaveLength(0);
    });
  });
  
  describe('insertHL7SegmentAfter', () => {
    test('should insert segment after specified segment', () => {
      const newSegment = 'PV1|1|INPATIENT';
      const result = insertHL7SegmentAfter(sampleHL7, newSegment, 'PID');
      
      const segments = result.split('\r');
      const pidIndex = segments.findIndex(s => s.startsWith('PID'));
      expect(segments[pidIndex + 1]).toBe(newSegment);
    });
    
    test('should handle non-existent target segment', () => {
      const newSegment = 'PV1|1|INPATIENT';
      const result = insertHL7SegmentAfter(sampleHL7, newSegment, 'OBX');
      expect(result).toBe(sampleHL7);
    });
  });
  
  describe('removeHL7Segments', () => {
    test('should remove all instances of specified segment', () => {
      const result = removeHL7Segments(sampleHL7, 'NK1');
      expect(result).not.toContain('NK1');
      expect(result.split('\r')).toHaveLength(2); // MSH and PID only
    });
    
    test('should handle non-existent segments', () => {
      const result = removeHL7Segments(sampleHL7, 'OBX');
      expect(result).toBe(sampleHL7);
    });
  });
}); 