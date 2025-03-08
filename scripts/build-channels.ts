import * as fs from 'fs';
import * as path from 'path';
import { transformSync } from '@babel/core';
import { execSync } from 'child_process';

function buildChannels() {
  // First compile with TypeScript
  console.log('Compiling channel scripts with TypeScript...');
  execSync('tsc -p tsconfig.channels.json');

  // Then process with Babel for maximum compatibility
  console.log('Processing with Babel for legacy JavaScript support...');
  
  function processDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        console.log(`Processing ${fullPath}`);
        const source = fs.readFileSync(fullPath, 'utf8');
        
        const result = transformSync(source, {
          filename: file,
          presets: [
            ['@babel/preset-env', {
              targets: {
                ie: '9'
              },
              modules: false,
              loose: true
            }]
          ],
          plugins: [
            ['@babel/plugin-transform-modules-commonjs', { loose: true }],
            '@babel/plugin-transform-destructuring',
            '@babel/plugin-transform-spread',
            '@babel/plugin-transform-parameters',
            '@babel/plugin-transform-block-scoping'
          ]
        });

        if (result && result.code) {
          // Clean up the code for Rhino
          let code = result.code
            // Remove 'use strict'
            .replace(/"use strict";\s*/g, '')
            // Remove imports
            .replace(/^.*require\(.*\);?\s*$/gm, '')
            // Remove exports
            .replace(/^.*exports.*=.*$/gm, '')
            // Remove empty lines
            .replace(/^\s*[\r\n]/gm, '');

          // Add function call at the end if it's a filter or transformer
          if (file.includes('filter.js')) {
            code += '\nfilterMessage();';
          } else if (file.includes('transformer.js')) {
            code += '\ntransformMessage();';
          }

          fs.writeFileSync(fullPath, code);
        }
      }
    }
  }

  processDirectory(path.join(process.cwd(), 'dist', 'channels'));
  console.log('Channel scripts built successfully!');
}

buildChannels(); 