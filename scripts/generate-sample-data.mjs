import fs from 'fs';
import path from 'path';

// Créer le répertoire de données s'il n'existe pas
const dataDir = './data/historical';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory:', dataDir);
}

// Générer des données d'exemple pour BTCUSDT 1m
function generateSampleData(symbol, timeframe, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let csvContent = 'timestamp,open,high,low,close,volume\n';
  
  // Générer des données minute par minute
  let currentTime = start.getTime();
  let currentPrice = symbol === 'BTCUSDT' ? 42000 : 
                   symbol === 'ETHUSDT' ? 2500 :
                   symbol === 'ADAUSDT' ? 0.5 : 300; // Prix de départ selon le symbole

  while (currentTime <= end.getTime()) {
    // Simulation de mouvement de prix réaliste
    const volatility = symbol === 'BTCUSDT' ? 200 : 
                      symbol === 'ETHUSDT' ? 50 :
                      symbol === 'ADAUSDT' ? 0.05 : 10;
    
    const change = (Math.random() - 0.5) * volatility;
    currentPrice = Math.max(currentPrice + change, currentPrice * 0.5); // Prix minimum 50% du prix actuel

    const open = currentPrice;
    const high = currentPrice + Math.random() * volatility * 0.5;
    const low = currentPrice - Math.random() * volatility * 0.5;
    const close = currentPrice + (Math.random() - 0.5) * volatility * 0.3;
    const volume = Math.random() * 1000 + 100;

    csvContent += `${currentTime},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${volume.toFixed(2)}\n`;
    
    // Avancer d'une minute
    currentTime += 60 * 1000;
  }

  return csvContent;
}

// Générer plusieurs datasets d'exemple
const datasets = [
  { symbol: 'BTCUSDT', timeframe: '1m', startDate: '2024-01-01', endDate: '2024-01-07' },
  { symbol: 'BTCUSDT', timeframe: '1m', startDate: '2024-01-08', endDate: '2024-01-14' },
  { symbol: 'BTCUSDT', timeframe: '5m', startDate: '2024-01-01', endDate: '2024-01-31' },
  { symbol: 'ETHUSDT', timeframe: '1m', startDate: '2024-01-01', endDate: '2024-01-07' },
  { symbol: 'ADAUSDT', timeframe: '1m', startDate: '2024-01-01', endDate: '2024-01-07' },
];

console.log('🚀 Generating sample historical data...');

datasets.forEach(({ symbol, timeframe, startDate, endDate }) => {
  const filename = `${symbol}_${timeframe}_${startDate}_${endDate}.csv`;
  const filePath = path.join(dataDir, filename);
  
  console.log(`📊 Generating ${filename}...`);
  const csvContent = generateSampleData(symbol, timeframe, startDate, endDate);
  
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ Created ${filename} (${csvContent.split('\n').length - 1} candles)`);
});

console.log('🎉 Sample data generation completed!');
console.log(`📁 Data files created in: ${dataDir}`);
console.log('\n📋 Available datasets:');
datasets.forEach(({ symbol, timeframe, startDate, endDate }) => {
  console.log(`   - ${symbol} ${timeframe} (${startDate} to ${endDate})`);
});

console.log('\n💡 You can now use the Local Backtest feature in your trading app!');
