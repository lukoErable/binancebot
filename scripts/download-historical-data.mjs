// scripts/download-historical-data.mjs
import fs from 'fs';
import path from 'path';

// Créer le répertoire de données s'il n'existe pas
const dataDir = './data/historical';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory:', dataDir);
}

// Fonction pour télécharger les données depuis Binance
async function downloadBinanceData(symbol, interval, startTime, endTime) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
  
  try {
    console.log(`📡 Downloading ${symbol} ${interval} data...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const klines = await response.json();
    
    // Convertir en format CSV
    let csvContent = 'timestamp,open,high,low,close,volume\n';
    
    klines.forEach(kline => {
      const timestamp = kline[0];
      const open = parseFloat(kline[1]);
      const high = parseFloat(kline[2]);
      const low = parseFloat(kline[3]);
      const close = parseFloat(kline[4]);
      const volume = parseFloat(kline[5]);
      
      csvContent += `${timestamp},${open},${high},${low},${close},${volume}\n`;
    });
    
    return csvContent;
  } catch (error) {
    console.error(`❌ Error downloading ${symbol} ${interval}:`, error.message);
    return null;
  }
}

// Fonction pour diviser une période en chunks de 1000 bougies
function getTimeChunks(startDate, endDate, interval) {
  const chunks = [];
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  // Calculer la durée d'une bougie en millisecondes
  const intervalMs = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }[interval];
  
  const maxCandles = 1000;
  const chunkDuration = maxCandles * intervalMs;
  
  let currentStart = start;
  
  while (currentStart < end) {
    const currentEnd = Math.min(currentStart + chunkDuration, end);
    chunks.push({
      startTime: currentStart,
      endTime: currentEnd
    });
    currentStart = currentEnd;
  }
  
  return chunks;
}

// Fonction principale pour télécharger les données
async function downloadHistoricalData(symbol, interval, startDate, endDate) {
  console.log(`🚀 Starting download for ${symbol} ${interval} from ${startDate} to ${endDate}`);
  
  const chunks = getTimeChunks(startDate, endDate, interval);
  let allData = 'timestamp,open,high,low,close,volume\n';
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`📦 Downloading chunk ${i + 1}/${chunks.length}...`);
    
    const data = await downloadBinanceData(symbol, interval, chunk.startTime, chunk.endTime);
    
    if (data) {
      // Supprimer l'en-tête des chunks suivants
      const lines = data.split('\n');
      const dataLines = i === 0 ? lines : lines.slice(1);
      allData += dataLines.join('\n') + '\n';
    }
    
    // Pause pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return allData;
}

// Configuration des téléchargements - BTCUSDT uniquement sur plusieurs années
const downloads = [
  // Données 1m pour les 6 derniers mois (plus récentes)
  { symbol: 'BTCUSDT', interval: '1m', startDate: '2024-07-01', endDate: '2024-12-31' },
  
  // Données 5m pour les 2 dernières années
  { symbol: 'BTCUSDT', interval: '5m', startDate: '2023-01-01', endDate: '2024-12-31' },
  
  // Données 15m pour les 3 dernières années
  { symbol: 'BTCUSDT', interval: '15m', startDate: '2022-01-01', endDate: '2024-12-31' },
  
  // Données 1h pour les 5 dernières années
  { symbol: 'BTCUSDT', interval: '1h', startDate: '2020-01-01', endDate: '2024-12-31' },
  
  // Données 4h pour les 5 dernières années
  { symbol: 'BTCUSDT', interval: '4h', startDate: '2020-01-01', endDate: '2024-12-31' },
  
  // Données 1d pour les 5 dernières années
  { symbol: 'BTCUSDT', interval: '1d', startDate: '2020-01-01', endDate: '2024-12-31' },
];

async function main() {
  console.log('🚀 Starting BTCUSDT historical data download...');
  console.log('📊 This will download BTCUSDT data from 2020 to 2024');
  console.log('⏰ Multiple timeframes: 1m (6m), 5m (2y), 15m (3y), 1h/4h/1d (5y)');
  
  for (const download of downloads) {
    try {
      const data = await downloadHistoricalData(
        download.symbol,
        download.interval,
        download.startDate,
        download.endDate
      );
      
      if (data) {
        const filename = `${download.symbol}_${download.interval}_${download.startDate}_${download.endDate}.csv`;
        const filePath = path.join(dataDir, filename);
        
        fs.writeFileSync(filePath, data);
        const candleCount = data.split('\n').length - 1;
        console.log(`✅ Saved ${filename} (${candleCount} candles)`);
      }
    } catch (error) {
      console.error(`❌ Failed to download ${download.symbol} ${download.interval}:`, error.message);
    }
    
    // Pause entre les téléchargements
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎉 BTCUSDT download completed!');
  console.log(`📁 Data files saved in: ${dataDir}`);
  console.log('\n📋 Available datasets:');
  downloads.forEach(({ symbol, interval, startDate, endDate }) => {
    console.log(`   - ${symbol} ${interval} (${startDate} to ${endDate})`);
  });
  
  console.log('\n💡 You can now use the Local Backtest feature with BTCUSDT data!');
}

// Exécuter le script
main().catch(console.error);