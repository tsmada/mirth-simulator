// Maps
export interface MirthMap<T = any> {
  get(key: string): T;
  put(key: string, value: T): T;
  containsKey(key: string): boolean;
  remove(key: string): T;
  values(): T[];
  keys(): string[];
}

// Channel Context
export interface ChannelContext {
  // Maps
  connectorMap: MirthMap;
  channelMap: MirthMap;
  sourceMap: MirthMap;
  globalChannelMap: MirthMap;
  globalMap: MirthMap;
  configurationMap: MirthMap;
  responseMap: MirthMap;
  resultMap: MirthMap;
  
  // Map shorthand functions
  $co(key: string, value?: any): any;
  $c(key: string, value?: any): any;
  $s(key: string, value?: any): any;
  $gc(key: string, value?: any): any;
  $g(key: string, value?: any): any;
  $cfg(key: string, value?: any): any;
  $r(key: string, value?: any): any;
  $(key: string): any;
  
  // Message objects
  msg: any;
  tmp: any;
  connectorMessage: ConnectorMessage;
  
  // Utilities
  logger: Logger;
  phase: string[];
}

export interface ConnectorMessage {
  getTransformedData(): string;
  getProcessedRawData(): string | null;
  getRawData(): string;
  getResponseTransformedData(): string;
  getChannelId(): string;
  getMessageId(): string;
}

export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// Attachment handling
export interface AttachmentUtil {
  getMessageAttachmentIds(channelId: string, messageId: string): string[];
  getMessageAttachments(connectorMessage: ConnectorMessage, base64Decode: boolean): any[];
  getMessageAttachment(connectorMessage: ConnectorMessage, attachmentId: string, base64Decode: boolean): any;
}

// Declare global Mirth variables
declare global {
  // Maps
  const connectorMap: MirthMap;
  const channelMap: MirthMap;
  const sourceMap: MirthMap;
  const globalChannelMap: MirthMap;
  const globalMap: MirthMap;
  const configurationMap: MirthMap;
  const responseMap: MirthMap;
  const resultMap: MirthMap;
  
  // Map shorthand functions
  function $co(key: string, value?: any): any;
  function $c(key: string, value?: any): any;
  function $s(key: string, value?: any): any;
  function $gc(key: string, value?: any): any;
  function $g(key: string, value?: any): any;
  function $cfg(key: string, value?: any): any;
  function $r(key: string, value?: any): any;
  function $(key: string): any;
  
  // Message objects
  let msg: any;
  let tmp: any;
  const connectorMessage: ConnectorMessage;
  
  // Utilities
  const logger: Logger;
  const phase: string[];
  const AttachmentUtil: AttachmentUtil;
  
  // XML support
  function XML(xmlString: string): any;
  
  // Java integration
  function importPackage(packageName: string): void;
} 