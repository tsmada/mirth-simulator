import { Logger, MirthMap } from '../src/types/mirth';
import { EventEmitter } from 'events';
import { DOMParser } from 'xmldom';
import * as babel from '@babel/core';
import { transformSync } from '@babel/core';
import { getHL7Field, setHL7Field, insertHL7SegmentAfter } from '../src/lib/hl7-utils';

interface ScriptContext {
  msg?: string;
}

/**
 * Simple implementation of MirthMap for local development
 */
class LocalMirthMap<T = any> implements MirthMap<T> {
  private data: Map<string, T>;
  
  constructor() {
    this.data = new Map<string, T>();
  }
  
  get(key: string): T {
    return this.data.get(key) as T;
  }
  
  put(key: string, value: T): T {
    this.data.set(key, value);
    return value;
  }
  
  containsKey(key: string): boolean {
    return this.data.has(key);
  }
  
  remove(key: string): T {
    const value = this.data.get(key);
    this.data.delete(key);
    return value as T;
  }
  
  values(): T[] {
    return Array.from(this.data.values());
  }
  
  keys(): string[] {
    return Array.from(this.data.keys());
  }
  
  getAll(): [string, T][] {
    return Array.from(this.data.entries());
  }
  
  clear(): void {
    this.data.clear();
  }
}

/**
 * Local development logger
 */
class LocalLogger implements Logger {
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    console.info(message, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    console.debug(message, ...args);
  }
}

interface ExecuteScriptOptions {
  msg?: string;
}

interface ScriptState {
  msg?: any;
}

/**
 * Mirth Connect simulator for local development
 */
export class MirthSimulator extends EventEmitter {
  private logger: Logger;
  private msg: string | null;
  private tmp: any;
  private XML: (xmlString: string) => Document;
  private phase: string[];
  private channelMap: LocalMirthMap;
  private connectorMap: LocalMirthMap;
  private globalMap: LocalMirthMap;
  private configurationMap: LocalMirthMap;
  private globalChannelMap: LocalMirthMap;
  private responseMap: LocalMirthMap;

  constructor(options: { logLevel?: string } = {}) {
    super();
    this.logger = new LocalLogger();
    this.msg = null;
    this.tmp = {};
    this.XML = (xmlString: string) => {
      const parser = new DOMParser();
      return parser.parseFromString(xmlString, 'text/xml');
    };
    this.phase = ['simulator'];
    this.channelMap = new LocalMirthMap();
    this.connectorMap = new LocalMirthMap();
    this.globalMap = new LocalMirthMap();
    this.configurationMap = new LocalMirthMap();
    this.globalChannelMap = new LocalMirthMap();
    this.responseMap = new LocalMirthMap();
  }
  
  /**
   * Execute a Mirth script in the simulator
   */
  public executeScript(script: string, context: ScriptContext = {}): any {
    try {
      // Create maps if they don't exist
      this.channelMap = this.channelMap || new LocalMirthMap<string>();
      this.connectorMap = this.connectorMap || new LocalMirthMap<string>();
      this.globalMap = this.globalMap || new LocalMirthMap<string>();
      this.responseMap = this.responseMap || new LocalMirthMap<string>();
      this.configurationMap = this.configurationMap || new LocalMirthMap<string>();
      this.globalChannelMap = this.globalChannelMap || new LocalMirthMap<string>();

      // Clean the script by removing imports, exports, type declarations, and interfaces
      const cleanedScript = script
        .replace(/import\s+.*?;?\s*(?=\n|$)/g, '')
        .replace(/export\s+.*?{/g, '{')
        .replace(/export\s+/g, '')
        .replace(/declare\s+.*?;?\s*(?=\n|$)/g, '')
        .replace(/interface\s+.*?{[^}]*}/g, '')
        .replace(/type\s+.*?;?\s*(?=\n|$)/g, '');

      // Set message state if provided
      if (context.msg !== undefined) {
        this.msg = context.msg;
      }

      // Create the context object with all necessary bindings
      const contextObj = {
        msg: this.msg,
        logger: this.logger,
        XML: this.XML,
        $c: (key: string, value?: string) => {
          if (value !== undefined) {
            this.channelMap.put(key, value);
          }
          return this.channelMap.get(key);
        },
        $co: (key: string, value?: string) => {
          if (value !== undefined) {
            this.connectorMap.put(key, value);
          }
          return this.connectorMap.get(key);
        },
        $g: (key: string, value?: string) => {
          if (value !== undefined) {
            this.globalMap.put(key, value);
          }
          return this.globalMap.get(key);
        },
        $r: (key: string, value?: string) => {
          if (value !== undefined) {
            this.responseMap.put(key, value);
          }
          return this.responseMap.get(key);
        },
        $cfg: (key: string, value?: string) => {
          if (value !== undefined) {
            this.configurationMap.put(key, value);
          }
          return this.configurationMap.get(key);
        },
        $gc: (key: string, value?: string) => {
          if (value !== undefined) {
            this.globalChannelMap.put(key, value);
          }
          return this.globalChannelMap.get(key);
        },
        getHL7Field,
        setHL7Field,
        insertHL7SegmentAfter
      };

      // Create a function with the context parameters and the script body
      const contextKeys = Object.keys(contextObj);
      const contextValues = Object.values(contextObj);

      // Check if this is a module-style script (has filterMessage or transformMessage function)
      const isModuleScript = cleanedScript.includes('function filterMessage') || cleanedScript.includes('function transformMessage');

      let scriptBody;
      if (isModuleScript) {
        scriptBody = `
          try {
            let exports = {};
            let msg = arguments[0];
            ${cleanedScript}
            if (typeof filterMessage === 'function') {
              return filterMessage();
            } else if (typeof transformMessage === 'function') {
              const result = transformMessage();
              if (typeof result === 'string') {
                msg = result;
                this.msg = result;
              }
              return msg;
            }
          } catch (error) {
            throw error;
          }
        `;
      } else {
        // For simple scripts, just execute them directly
        scriptBody = `
          try {
            let msg = arguments[0];
            ${cleanedScript}
            return msg;
          } catch (error) {
            throw error;
          }
        `;
      }

      const scriptFunction = new Function(...contextKeys, scriptBody);

      // Execute the function with the context values
      const result = scriptFunction.call(this, ...contextValues);

      // Update message state if it was modified in the script
      if (result !== undefined && typeof result === 'string') {
        this.msg = result;
      }

      return result;
    } catch (error: any) {
      this.logger.error('Error executing script:', error);
      throw error;
    }
  }
  
  /**
   * Reset the simulator state
   */
  reset(): void {
    // Reset all maps
    [
      this.channelMap,
      this.connectorMap,
      this.globalMap,
      this.configurationMap,
      this.globalChannelMap,
      this.responseMap
    ].forEach(map => map.clear());
    
    // Reset message variables
    this.msg = null;
    this.tmp = {};
    
    this.emit('reset');
  }
  
  /**
   * Get the current state of the simulator
   */
  getState(): { maps: { [key: string]: any[] }, msg: string | null } {
    return {
      maps: {
        channelMap: this.channelMap.values(),
        connectorMap: this.connectorMap.values(),
        globalMap: this.globalMap.values(),
        configurationMap: this.configurationMap.values(),
        globalChannelMap: this.globalChannelMap.values(),
        responseMap: this.responseMap.values()
      },
      msg: this.msg
    };
  }

  private handleMapOperation(mapType: string, key: string, value?: any): any {
    const map = {
      channel: this.channelMap,
      connector: this.connectorMap,
      global: this.globalMap,
      config: this.configurationMap,
      globalConfig: this.globalChannelMap,
      response: this.responseMap
    }[mapType];

    if (!map) {
      throw new Error(`Invalid map type: ${mapType}`);
    }

    if (value !== undefined) {
      map.put(key, value);
    }
    return map.get(key);
  }

  private getHL7Field(msg: string, segment: string, field: number, component?: number): string {
    const segments = msg.split('\r');
    const targetSegment = segments.find(s => s.startsWith(segment + '|'));
    
    if (!targetSegment) {
      return '';
    }

    const fields = targetSegment.split('|');
    
    if (field >= fields.length) {
      return '';
    }

    if (component === undefined) {
      return fields[field];
    }

    const components = fields[field].split('^');
    return component < components.length ? components[component] : '';
  }

  private setHL7Field(msg: string, segment: string, field: number, value: string, component?: number): string {
    const segments = msg.split('\r');
    const segmentIndex = segments.findIndex(s => s.startsWith(segment + '|'));
    
    if (segmentIndex === -1) {
      return msg;
    }

    const fields = segments[segmentIndex].split('|');
    
    if (field >= fields.length) {
      return msg;
    }

    if (component === undefined) {
      fields[field] = value;
    } else {
      const components = fields[field].split('^');
      components[component] = value;
      fields[field] = components.join('^');
    }

    segments[segmentIndex] = fields.join('|');
    return segments.join('\r');
  }

  private insertHL7SegmentAfter(msg: string, targetSegment: string, newSegment: string): string {
    const segments = msg.split('\r');
    const targetIndex = segments.findIndex(s => s.startsWith(targetSegment + '|'));
    
    if (targetIndex === -1) {
      return msg;
    }

    segments.splice(targetIndex + 1, 0, newSegment);
    return segments.join('\r');
  }

  private parseXML(xml: string): any {
    try {
      return JSON.parse(xml);
    } catch (error) {
      this.logger.error('Error parsing XML:', error);
      throw error;
    }
  }

  /**
   * Set the simulator state
   */
  private setState(state: ScriptState): void {
    if (state.msg !== undefined) {
      this.msg = state.msg;
    }
  }

  private transform(script: string, context: any): any {
    const result = transformSync(script, {
      filename: 'script.ts',
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript'
      ],
      plugins: ['@babel/plugin-proposal-throw-expressions']
    });

    if (!result || !result.code) {
      throw new Error('Failed to transform script');
    }

    return new Function('context', result.code)(context);
  }
} 