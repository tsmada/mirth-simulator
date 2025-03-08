# Mirth Node Runtime

A modern development environment for Mirth Connect channel scripts, allowing you to develop and test Mirth channels locally without needing a full Mirth Connect server.

## Features

- 🚀 Local development server for testing HL7 messages
- 🔄 Live script reloading with watch mode
- ✨ TypeScript support for better development experience
- 🧪 Unit testing framework for channels
- 🛠️ HL7 message processing utilities
- 📝 MLLP (Minimal Lower Layer Protocol) support
- ✅ Proper acknowledgment (ACK) generation

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mirth-node-runtime.git

# Install dependencies
cd mirth-node-runtime
npm install
```

## Usage

### Development Server

Start the development server to test your channel:

```bash
npm run dev
```

This will:
- Start an HL7 server on port 6661
- Watch for changes in your channel scripts
- Process incoming messages through your channel
- Send appropriate acknowledgments

### Testing

Run the test suite:

```bash
npm test
```

Run tests for a specific file:

```bash
npm test -- --file test/unit/admission-channel.test.ts
```

### Building

Build the TypeScript code:

```bash
npm run build
```

## Channel Development

Channels are defined in the `src/channels` directory. Each channel typically consists of:

- `filter.ts` - Determines which messages are accepted
- `transformer.ts` - Transforms accepted messages

Example channel structure:
```
src/channels/
  admission/
    filter.ts      # Filters ADT messages
    transformer.ts # Transforms patient data
```

### Example Channel

Here's a simple ADT channel that processes admission messages:

```typescript
// filter.ts
export function filterMessage(): boolean {
  const messageType = getHL7Field(msg, 'MSH', 9, 1);
  const trigger = getHL7Field(msg, 'MSH', 9, 2);
  
  // Accept only ADT messages with specific triggers
  return messageType === 'ADT' && ['A01', 'A02', 'A03', 'A04'].includes(trigger);
}

// transformer.ts
export function transformMessage(): string {
  // Uppercase patient last name
  const patientName = getHL7Field(msg, 'PID', 5);
  if (patientName) {
    const [lastName, firstName] = patientName.split('^');
    return setHL7Field(msg, 'PID', 5, `${lastName.toUpperCase()}^${firstName}`);
  }
  return msg;
}
```
## Container

Download the 3.10 linux file from here and colocate in this directory for building https://mirthdownloadarchive.s3.amazonaws.com/connect-downloads.html?prefix=connect/3.1.0.7420.b1421/


## Testing Your Channel

You can test your channel using the included test client:

```bash
# In one terminal, start the server
npm run dev

# In another terminal, run the test client
ts-node src/test-client.ts
```

Or send messages using any HL7 client (like HAPI TestPanel) to `localhost:6661`.

Example message:
```
MSH|^~\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20240101120000||ADT^A01|123456|P|2.3
PID|||12345^^^MRN||Smith^John||19800101|M
```

## HL7 Utility Functions

The project includes several utility functions for working with HL7 messages:

- `getHL7Field(message, segment, field, component?)` - Extract field values
- `setHL7Field(message, segment, field, value, component?)` - Set field values
- `insertHL7SegmentAfter(message, newSegment, afterSegment)` - Insert segments
- `removeHL7Segments(message, segmentName)` - Remove segments

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by Mirth Connect's channel processing
- Built with TypeScript and Node.js
- Uses Jest for testing
