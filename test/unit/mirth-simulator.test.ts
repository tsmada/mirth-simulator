import { MirthSimulator } from '../../simulator/mirth-simulator';

describe('MirthSimulator', () => {
  let simulator: MirthSimulator;
  
  beforeEach(() => {
    simulator = new MirthSimulator();
  });
  
  describe('Map Operations', () => {
    test('should store and retrieve values in maps', () => {
      const script = `
        $c('testKey', 'testValue');
        return $c('testKey');
      `;
      
      const result = simulator.executeScript(script);
      expect(result).toBe('testValue');
    });
    
    test('should handle multiple map operations', () => {
      const script = `
        $c('key1', 'value1');
        $g('key2', 'value2');
        $co('key3', 'value3');
        
        return {
          channelValue: $c('key1'),
          globalValue: $g('key2'),
          connectorValue: $co('key3')
        };
      `;
      
      const result = simulator.executeScript(script);
      expect(result).toEqual({
        channelValue: 'value1',
        globalValue: 'value2',
        connectorValue: 'value3'
      });
    });
  });
  
  describe('Message Handling', () => {
    test('should handle message modifications', () => {
      const script = `
        msg = msg.toUpperCase();
        return msg;
      `;
      
      const result = simulator.executeScript(script, { msg: 'test message' });
      expect(result).toBe('TEST MESSAGE');
    });
    
    test('should persist message modifications', () => {
      const firstScript = `
        msg = 'modified message';
      `;
      
      const secondScript = `
        return msg;
      `;
      
      simulator.executeScript(firstScript);
      const result = simulator.executeScript(secondScript);
      expect(result).toBe('modified message');
    });
  });
  
  describe('XML Support', () => {
    test('should parse XML strings', () => {
      const script = `
        const xmlDoc = XML('<root><child>value</child></root>');
        return xmlDoc.getElementsByTagName('child')[0].textContent;
      `;
      
      const result = simulator.executeScript(script);
      expect(result).toBe('value');
    });
  });
  
  describe('Error Handling', () => {
    test('should handle script errors gracefully', () => {
      const script = `
        throw new Error('Test error');
      `;
      
      expect(() => simulator.executeScript(script)).toThrow('Test error');
    });
    
    test('should handle invalid map operations', () => {
      const script = `
        return $c('nonexistent');
      `;
      
      const result = simulator.executeScript(script);
      expect(result).toBeUndefined();
    });
  });
  
  describe('State Management', () => {
    test('should reset state correctly', () => {
      const setupScript = `
        $c('key1', 'value1');
        $g('key2', 'value2');
        msg = 'test message';
      `;
      
      simulator.executeScript(setupScript);
      simulator.reset();
      
      const state = simulator.getState();
      expect(state.maps.channelMap).toEqual([]);
      expect(state.maps.globalMap).toEqual([]);
      expect(state.msg).toBeNull();
    });
    
    test('should get current state', () => {
      const script = `
        $c('key1', 'value1');
        msg = 'test message';
      `;
      
      simulator.executeScript(script);
      const state = simulator.getState();
      
      expect(state.maps.channelMap).toContainEqual('value1');
      expect(state.msg).toBe('test message');
    });
  });
}); 