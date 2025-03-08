import * as net from 'net';

const START_BLOCK = Buffer.from([0x0B]);  // VT
const END_BLOCK = Buffer.from([0x1C]);    // FS
const END_MESSAGE = Buffer.from([0x0D]);  // CR

class HL7Client {
  private socket: net.Socket;

  constructor(port: number = 6661) {
    this.socket = new net.Socket();
    this.socket.connect(port, 'localhost', () => {
      console.log('Connected to server');
    });

    this.socket.on('data', (data) => {
      console.log('\nReceived response:');
      // Strip control characters for display
      const response = data.toString().replace(/[\x0B\x1C\x0D]/g, '');
      console.log(response);
    });

    this.socket.on('close', () => {
      console.log('Connection closed');
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }

  sendMessage(message: string) {
    // Construct MLLP-framed message using Buffers
    const framedMessage = Buffer.concat([
      START_BLOCK,
      Buffer.from(message),
      END_BLOCK,
      END_MESSAGE
    ]);

    this.socket.write(framedMessage);
  }

  close() {
    this.socket.end();
  }
}

// Example usage
const client = new HL7Client();

// Sample ADT message
const message = [
  'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20240101120000||ADT^A01|123456|P|2.3',
  'PID|||12345^^^MRN||SMITH^JOHN||19800101|M'
].join('\r');

// Send the message after a short delay to ensure connection is established
setTimeout(() => {
  console.log('\nSending message:');
  console.log(message);
  client.sendMessage(message);

  // Close the connection after response is received
  setTimeout(() => {
    client.close();
  }, 1000);
}, 500); 