import { AvailableDataSets, Candle, HistoricalDataInfo } from '@/types/trading';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

export class LocalDataLoader {
  private dataDirectory: string;

  constructor(dataDirectory: string = './data/historical') {
    this.dataDirectory = dataDirectory;
  }

  /**
   * Scanne le répertoire de données et retourne les datasets disponibles
   */
  async getAvailableDataSets(): Promise<AvailableDataSets> {
    try {
      if (!fs.existsSync(this.dataDirectory)) {
        return { datasets: [], totalSize: '0 MB' };
      }

      const files = fs.readdirSync(this.dataDirectory);
      const datasets: HistoricalDataInfo[] = [];
      let totalSizeBytes = 0;

      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.zip')) {
          const filePath = path.join(this.dataDirectory, file);
          const stats = fs.statSync(filePath);
          totalSizeBytes += stats.size;

          // Parse filename to extract metadata
          // Format: BTCUSDT_1m_2024-01-01_2024-01-31.csv
          const filename = path.basename(file, path.extname(file));
          const parts = filename.split('_');
          
          if (parts.length >= 4) {
            const symbol = parts[0];
            const timeframe = parts[1];
            const startDate = parts[2];
            const endDate = parts[3];

            // Count lines in CSV to estimate candle count
            let totalCandles = 0;
            if (file.endsWith('.csv')) {
              const content = fs.readFileSync(filePath, 'utf-8');
              totalCandles = content.split('\n').length - 1; // -1 for header
            }

            datasets.push({
              symbol,
              timeframe,
              startDate,
              endDate,
              totalCandles,
              fileSize: this.formatFileSize(stats.size),
              lastUpdated: stats.mtime.toISOString()
            });
          }
        }
      }

      // Sort by timeframe priority, then by date range
      const timeframeOrder = ['1m', '5m', '15m', '1h', '4h', '1d'];
      
      return {
        datasets: datasets.sort((a, b) => {
          // First sort by timeframe priority
          const aTimeframeIndex = timeframeOrder.indexOf(a.timeframe);
          const bTimeframeIndex = timeframeOrder.indexOf(b.timeframe);
          
          if (aTimeframeIndex !== bTimeframeIndex) {
            return aTimeframeIndex - bTimeframeIndex;
          }
          
          // Then by symbol
          if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
          
          // Finally by start date
          return a.startDate.localeCompare(b.startDate);
        }),
        totalSize: this.formatFileSize(totalSizeBytes)
      };
    } catch (error) {
      console.error('Error scanning data directory:', error);
      return { datasets: [], totalSize: '0 MB' };
    }
  }

  /**
   * Charge les données historiques depuis un fichier CSV
   */
  async loadHistoricalData(
    symbol: string, 
    timeframe: string, 
    startDate: string, 
    endDate: string
  ): Promise<Candle[]> {
    try {
      // Chercher le fichier correspondant
      const filename = `${symbol}_${timeframe}_${startDate}_${endDate}.csv`;
      const filePath = path.join(this.dataDirectory, filename);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Data file not found: ${filename}`);
      }

      console.log(`📊 Loading historical data from: ${filename}`);

      // Lire et parser le CSV
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Convertir en format Candle avec validation
      const candles: Candle[] = records.map((record: any, index: number) => {
        // Debug pour les premières lignes
        if (index < 3) {
          console.log(`🔍 CSV Record ${index}:`, record);
        }
        
        const time = record.timestamp ? parseInt(record.timestamp) : (record.date ? new Date(record.date).getTime() : 0);
        const open = parseFloat(record.open);
        const high = parseFloat(record.high);
        const low = parseFloat(record.low);
        const close = parseFloat(record.close);
        const volume = parseFloat(record.volume);
        
        // Validation des valeurs
        if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
          console.warn(`⚠️ Invalid data at record ${index}:`, {
            time, open, high, low, close, volume,
            original: record
          });
        }
        
        return {
          time,
          open,
          high,
          low,
          close,
          volume
        };
      });

      console.log(`✅ Loaded ${candles.length} candles from local data`);
      return candles;

    } catch (error) {
      console.error('Error loading historical data:', error);
      throw error;
    }
  }

  /**
   * Vérifie si des données sont disponibles pour la période demandée
   */
  async hasDataForPeriod(
    symbol: string, 
    timeframe: string, 
    startDate: string, 
    endDate: string
  ): Promise<boolean> {
    const filename = `${symbol}_${timeframe}_${startDate}_${endDate}.csv`;
    const filePath = path.join(this.dataDirectory, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Retourne les périodes disponibles pour un symbole/timeframe donné
   */
  async getAvailablePeriods(symbol: string, timeframe: string): Promise<Array<{startDate: string, endDate: string}>> {
    try {
      const files = fs.readdirSync(this.dataDirectory);
      const periods: Array<{startDate: string, endDate: string}> = [];

      for (const file of files) {
        if (file.startsWith(`${symbol}_${timeframe}_`) && file.endsWith('.csv')) {
          const filename = path.basename(file, '.csv');
          const parts = filename.split('_');
          
          if (parts.length >= 4) {
            periods.push({
              startDate: parts[2],
              endDate: parts[3]
            });
          }
        }
      }

      return periods.sort((a, b) => a.startDate.localeCompare(b.startDate));
    } catch (error) {
      console.error('Error getting available periods:', error);
      return [];
    }
  }

  /**
   * Formate la taille de fichier en format lisible
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Crée un exemple de fichier CSV pour les tests
   */
  async createSampleData(): Promise<void> {
    try {
      // Créer le répertoire s'il n'existe pas
      if (!fs.existsSync(this.dataDirectory)) {
        fs.mkdirSync(this.dataDirectory, { recursive: true });
      }

      // Générer des données d'exemple pour BTCUSDT 1m
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');
      const filename = `BTCUSDT_1m_2024-01-01_2024-01-07.csv`;
      const filePath = path.join(this.dataDirectory, filename);

      let csvContent = 'timestamp,open,high,low,close,volume\n';
      
      // Générer des données minute par minute
      let currentTime = startDate.getTime();
      let currentPrice = 42000; // Prix de départ BTC

      while (currentTime <= endDate.getTime()) {
        // Simulation de mouvement de prix réaliste
        const change = (Math.random() - 0.5) * 200; // Variation de ±100$
        currentPrice = Math.max(currentPrice + change, 1000); // Prix minimum 1000$

        const open = currentPrice;
        const high = currentPrice + Math.random() * 50;
        const low = currentPrice - Math.random() * 50;
        const close = currentPrice + (Math.random() - 0.5) * 100;
        const volume = Math.random() * 1000 + 100;

        csvContent += `${currentTime},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${volume.toFixed(2)}\n`;
        
        currentTime += 60 * 1000; // +1 minute
      }

      fs.writeFileSync(filePath, csvContent);
      console.log(`✅ Created sample data file: ${filename}`);

    } catch (error) {
      console.error('Error creating sample data:', error);
    }
  }
}
