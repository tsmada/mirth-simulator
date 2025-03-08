#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { execSync } from 'child_process';
import { MirthSimulator } from '../simulator/mirth-simulator';

interface CliArgs {
  _: (string | number)[];
  [key: string]: unknown;
  watch?: boolean;
  file?: string;
  server?: string;
  username?: string;
  password?: string;
  channel?: string;
}

interface DeployOptions {
  server: string;
  username: string;
  password?: string;
  channel?: string;
}

// Initialize yargs
const argv = yargs(hideBin(process.argv))
  .command('dev', 'Start development environment', {
    watch: {
      alias: 'w',
      type: 'boolean',
      description: 'Watch for file changes',
      default: false
    }
  })
  .command('build', 'Build Mirth scripts')
  .command('test', 'Run tests', {
    file: {
      alias: 'f',
      type: 'string',
      description: 'Test specific file'
    }
  })
  .command('deploy', 'Deploy to Mirth Connect server', {
    server: {
      alias: 's',
      type: 'string',
      description: 'Mirth Connect server URL',
      default: 'https://localhost:8443'
    },
    username: {
      alias: 'u',
      type: 'string',
      description: 'Mirth Connect username',
      default: 'admin'
    },
    password: {
      alias: 'p',
      type: 'string',
      description: 'Mirth Connect password'
    },
    channel: {
      alias: 'c',
      type: 'string',
      description: 'Deploy specific channel'
    }
  })
  .command('init', 'Initialize new Mirth project')
  .demandCommand(1, 'You need to specify a command')
  .help()
  .parse() as CliArgs;

// Handle commands
const command = argv._[0];

switch (command) {
  case 'dev':
    startDevelopment(argv.watch || false);
    break;
    
  case 'build':
    buildScripts();
    break;
    
  case 'test':
    runTests(argv.file);
    break;
    
  case 'deploy':
    deployToMirth({
      server: argv.server || 'https://localhost:8443',
      username: argv.username || 'admin',
      password: argv.password,
      channel: argv.channel
    });
    break;
    
  case 'init':
    initProject();
    break;
}

/**
 * Start development environment
 */
function startDevelopment(watch: boolean) {
  console.log('Starting Mirth development environment...');
  
  // Initial build
  buildScripts();
  
  // Start HL7 server
  const { HL7Server } = require('../src/server');
  const server = new HL7Server();
  server.start();
  
  if (watch) {
    console.log('Watching for file changes...');
    
    // Watch for file changes
    const watcher = chokidar.watch('src/**/*.{ts,js}', {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });
    
    watcher
      .on('change', (filePath: string) => {
        console.log(`File ${filePath} has been changed`);
        buildFile(filePath);
        runTestsForFile(filePath);
      })
      .on('add', (filePath: string) => {
        console.log(`File ${filePath} has been added`);
        buildFile(filePath);
        runTestsForFile(filePath);
      });
  }
}

/**
 * Build all scripts
 */
function buildScripts() {
  console.log('Building Mirth scripts...');
  
  // Compile TypeScript
  execSync('tsc', { stdio: 'inherit' });
  
  // Process each file
  walkDir('src', (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      buildFile(filePath);
    }
  });
}

/**
 * Build a single file
 */
function buildFile(filePath: string) {
  try {
    // Read the source file
    const source = fs.readFileSync(filePath, 'utf8');
    
    // Get output path
    const relativePath = path.relative('src', filePath);
    const outputPath = path.join('dist', relativePath)
      .replace(/\.(ts|js)$/, '.js');
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the output file
    fs.writeFileSync(outputPath, source);
    
    console.log(`Built ${filePath} -> ${outputPath}`);
  } catch (error) {
    console.error(`Error building ${filePath}:`, error);
  }
}

/**
 * Run tests
 */
function runTests(file?: string) {
  const command = file ? `jest ${file}` : 'jest';
  execSync(command, { stdio: 'inherit' });
}

/**
 * Run tests for a specific file
 */
function runTestsForFile(filePath: string) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const testFile = path.join('test/unit', `${fileName}.test.ts`);
  
  if (fs.existsSync(testFile)) {
    console.log(`Running tests for ${fileName}...`);
    runTests(testFile);
  }
}

/**
 * Deploy to Mirth Connect server
 */
function deployToMirth(options: DeployOptions) {
  if (!options.password) {
    console.error('Password is required for deployment');
    process.exit(1);
  }
  
  console.log('Deploying to Mirth Connect...');
  console.log(`Server: ${options.server}`);
  console.log(`Channel: ${options.channel || 'all channels'}`);
  
  // TODO: Implement Mirth Connect REST API deployment
  console.log('Deployment not yet implemented');
}

/**
 * Initialize new project
 */
function initProject() {
  console.log('Initializing new Mirth project...');
  
  // Create project structure
  const dirs = [
    'src/channels',
    'src/lib',
    'src/types',
    'test/unit',
    'test/integration',
    'test/fixtures',
    'simulator',
    'scripts',
    'dist'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // Create configuration files if they don't exist
  const configs = [
    {
      file: 'package.json',
      content: {
        name: path.basename(process.cwd()),
        version: '1.0.0',
        description: 'Modern Mirth Connect development environment',
        scripts: {
          dev: 'ts-node scripts/cli.ts dev',
          build: 'ts-node scripts/cli.ts build',
          test: 'jest',
          deploy: 'ts-node scripts/cli.ts deploy'
        },
        dependencies: {
          '@babel/core': '^7.23.7',
          '@babel/preset-env': '^7.23.7',
          chokidar: '^3.5.3',
          typescript: '^5.3.3',
          xmldom: '^0.6.0',
          yargs: '^17.7.2'
        },
        devDependencies: {
          '@types/jest': '^29.5.11',
          '@types/node': '^20.10.6',
          '@types/xmldom': '^0.1.34',
          jest: '^29.7.0',
          'ts-jest': '^29.1.1',
          'ts-node': '^10.9.2'
        }
      }
    },
    {
      file: 'tsconfig.json',
      content: {
        compilerOptions: {
          target: 'es2017',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: './dist',
          declaration: true,
          rootDir: './',
          baseUrl: './',
          paths: {
            '@/*': ['src/*']
          }
        },
        include: ['src/**/*', 'simulator/**/*', 'test/**/*', 'scripts/**/*'],
        exclude: ['node_modules', 'dist']
      }
    },
    {
      file: 'jest.config.js',
      content: `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};`
    }
  ];
  
  configs.forEach(({ file, content }) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      );
      console.log(`Created file: ${file}`);
    }
  });
  
  console.log('\nProject initialized successfully!');
  console.log('Run "npm install" to install dependencies');
  console.log('Then run "npm run dev" to start development environment');
}

/**
 * Walk a directory recursively
 */
function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  });
} 