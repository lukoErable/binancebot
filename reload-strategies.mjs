#!/usr/bin/env node

/**
 * Script to force reload strategies via API
 */

async function reloadStrategies() {
  try {
    console.log('🔄 Forcing strategy reload...');
    
    const response = await fetch('http://localhost:3000/api/daemon-init', {
      method: 'POST'
    });
    
    const data = await response.json();
    console.log('✅ Response:', data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

reloadStrategies();

