#!/usr/bin/env node

/**
 * Script to check the Swing Trading strategy in the database
 */

import { Pool } from 'pg';

// Database configuration (same as in database.ts)
const pool = new Pool({
  host: process.env.DB_HOST || '91.99.163.156',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tradingbot_db',
  user: process.env.DB_USER || 'tradingbot_user',
  password: process.env.DB_PASSWORD || 'tradingbot_secure_2024',
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function checkSwingTradingStrategy() {
  try {
    console.log('🔍 Checking Swing Trading Strategy...');
    
    // Check all Swing Trading strategies
    const result = await pool.query(`
      SELECT user_email, name, timeframe, is_active, type, created_at 
      FROM strategies 
      WHERE name LIKE '%Swing Trading%' 
      ORDER BY user_email, timeframe
    `);
    
    console.log(`📊 Found ${result.rows.length} Swing Trading strategies:`);
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. 👤 User: ${row.user_email}`);
      console.log(`   📊 Strategy: ${row.name}`);
      console.log(`   ⏰ Timeframe: ${row.timeframe}`);
      console.log(`   🔄 Active: ${row.is_active ? '✅ YES' : '❌ NO'}`);
      console.log(`   📅 Created: ${row.created_at}`);
    });
    
    // Check specifically for lucasfabregoule@gmail.com
    const userResult = await pool.query(`
      SELECT user_email, name, timeframe, is_active, type 
      FROM strategies 
      WHERE user_email = 'lucasfabregoule@gmail.com' 
      AND name LIKE '%Swing Trading%'
    `);
    
    console.log(`\n🎯 Strategies for lucasfabregoule@gmail.com: ${userResult.rows.length}`);
    userResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. 📊 ${row.name} [${row.timeframe}] - ${row.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking strategy:', error.message);
  } finally {
    await pool.end();
  }
}

checkSwingTradingStrategy();
