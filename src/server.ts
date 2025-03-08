import * as net from 'net';
import { MirthSimulator } from '../simulator/mirth-simulator';
import * as fs from 'fs';
import * as path from 'path';

const LISTEN_PORT = 6661;
const START_BLOCK = '\x0b';  // VT
const END_BLOCK = '\x1c';    // FS
const END_MESSAGE = '\x0d';  // CR

export class HL7Server {
  private server: net.Server;
  private simulator: MirthSimulator;
  private filterScript: string;
  private transformerScript: string;

  constructor() {
    this.simulator = new MirthSimulator();
    this.server = net.createServer((socket) => this.handleConnection(socket));
    
    // Load channel scripts
    this.filterScript = fs.readFileSync(
      path.join(process.cwd(), 'src/channels/admission/filter.ts'),
      'utf8'
    );
    
    this.transformerScript = fs.readFileSync(
      path.join(process.cwd(), 'src/channels/admission/transformer.ts'),
      'utf8'
    );
  }

  start() {
    this.server.listen(LISTEN_PORT, () => {
      console.log(`HL7 server listening on port ${LISTEN_PORT}`);
      console.log('Send HL7 messages to test the channel processing');
      console.log('Example message:');
      console.log('MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20240101120000||ADT^A01|123456|P|2.3');
      console.log('PID|||12345^^^MRN||SMITH^JOHN||19800101|M');
    });
  }

  private handleConnection(socket: net.Socket) {
    let messageBuffer = '';
    let inMessage = false;

    socket.on('data', (data) => {
      const chunk = data.toString();
      
      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];
        
        if (char === START_BLOCK) {
          inMessage = true;
          messageBuffer = '';
          continue;
        }
        
        if (char === END_BLOCK) {
          inMessage = false;
          this.processMessage(messageBuffer, socket);
          continue;
        }
        
        if (inMessage && char !== END_MESSAGE) {
          messageBuffer += char;
        }
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }

  private processMessage(message: string, socket: net.Socket) {
    console.log('\nReceived message:');
    console.log(message.replace(/\r/g, '\n'));
    
    try {
      // Run the filter
      const filterResult = this.simulator.executeScript(this.filterScript, { msg: message });
      
      if (filterResult) {
        // If message passes filter, run the transformer
        const transformResult = this.simulator.executeScript(this.transformerScript, { msg: message });
        
        console.log('\nTransformed message:');
        console.log(transformResult.replace(/\r/g, '\n'));
        
        // Send acknowledgment
        const ack = this.generateACK(message, 'AA', 'Message processed successfully');
        this.sendResponse(socket, ack);
      } else {
        // Send rejection acknowledgment
        const ack = this.generateACK(message, 'AR', 'Message filtered out');
        this.sendResponse(socket, ack);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const ack = this.generateACK(message, 'AE', 'Error processing message');
      this.sendResponse(socket, ack);
    }
  }

  private generateACK(message: string, code: string, text: string): string {
    const lines = message.split('\r');
    const msh = lines[0].split('|');
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    
    return [
      `MSH|^~\\&|MIRTH_NODE|${msh[5]}|${msh[2]}|${msh[3]}|${timestamp}||ACK^A01|${msh[9]}|P|2.3`,
      `MSA|${code}|${msh[9]}|${text}`
    ].join('\r');
  }

  private sendResponse(socket: net.Socket, message: string) {
    const response = START_BLOCK + message + END_BLOCK + END_MESSAGE;
    socket.write(response);
  }
} 