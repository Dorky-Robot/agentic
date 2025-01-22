#!/usr/bin/env node

import express from 'express';
import open from 'open';
import { randomBytes } from 'crypto';

// This script helps obtain refresh tokens for various APIs that use OAuth
// Usage: node get-refresh-token.js [service-name]
// Example: node get-refresh-token.js spotify

const SUPPORTED_SERVICES = {
  spotify: {
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: ['user-read-private', 'user-read-email']
  },
  // Add more services as needed
};

const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

async function getRefreshToken(service) {
  if (!SUPPORTED_SERVICES[service]) {
    console.error(`Service "${service}" not supported. Available services: ${Object.keys(SUPPORTED_SERVICES).join(', ')}`);
    process.exit(1);
  }

  const state = randomBytes(16).toString('hex');
  const app = express();
  let server;

  return new Promise((resolve, reject) => {
    app.get('/callback', async (req, res) => {
      const { code, state: returnedState } = req.query;

      if (state !== returnedState) {
        reject(new Error('State mismatch. Possible CSRF attack.'));
        return;
      }

      // Here you would exchange the code for refresh token
      // Implementation depends on the specific service
      console.log('\nAuthorization Code:', code);
      console.log('\nUse this code to get your refresh token according to the service\'s OAuth documentation.');
      
      res.send('Authorization successful! You can close this window.');
      server.close();
      resolve();
    });

    server = app.listen(PORT, () => {
      const service_config = SUPPORTED_SERVICES[service];
      const authUrl = new URL(service_config.authUrl);
      
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env[`${service.toUpperCase()}_CLIENT_ID`]);
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', service_config.scopes.join(' '));

      console.log(`Opening browser for ${service} authorization...`);
      open(authUrl.toString());
    });
  });
}

// Get service name from command line
const service = process.argv[2]?.toLowerCase();

if (!service) {
  console.error('Please specify a service name.');
  console.log(`Available services: ${Object.keys(SUPPORTED_SERVICES).join(', ')}`);
  process.exit(1);
}

// Ensure required environment variables are set
const requiredEnvVar = `${service.toUpperCase()}_CLIENT_ID`;
if (!process.env[requiredEnvVar]) {
  console.error(`Missing required environment variable: ${requiredEnvVar}`);
  console.log(`Please set your client ID before running this script:`);
  console.log(`export ${requiredEnvVar}=your_client_id_here`);
  process.exit(1);
}

getRefreshToken(service)
  .then(() => {
    console.log('\nAuthorization flow completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
