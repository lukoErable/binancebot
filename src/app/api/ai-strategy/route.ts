import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * AI Strategy Generator API
 * Uses OpenAI to generate complete trading strategies
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// COMPREHENSIVE LIST - ALL AVAILABLE INDICATORS (from advanced-indicators.ts)
const ALL_AVAILABLE_INDICATORS = `
### TREND INDICATORS - Moving Averages
NUMERIC: sma5, sma10, sma20, sma30, sma50, sma100, sma200, ema5, ema10, ema12, ema20, ema26, ema30, ema50, ema100, ema200, sma7, sma25, sma99, wma10, wma20, hma10, hma20, dema10, dema20, tema10, tema20, kama10, kama20, smma10, smma20, zlema10, zlema20, alma10, alma20, vwma10, vwma20
BOOLEAN: isGoldenCross, isDeathCross, isBullishMA, isBearishMA, isBullishTrend, isBearishTrend, isUptrend, isDowntrend, isUptrendConfirmed3, isDowntrendConfirmed3, isTrendReversalUp, isTrendReversalDown

### TREND SYSTEMS  
NUMERIC: macd, macdSignal, macdHistogram, ppo, ppoSignal, ppoHistogram, trix, adx, plusDI, minusDI, viPlus, viMinus, parabolicSAR, supertrend, aroonUp, aroonDown, aroonOscillator
BOOLEAN: isMACDBullish, isMACDBearish, isMACDCrossoverBullish, isMACDCrossoverBearish, isEMAFastSlowBullCross, isEMAFastSlowBearCross, isPriceCrossedAboveEMA50, isPriceCrossedBelowEMA50

### ICHIMOKU SYSTEM
NUMERIC: tenkanSen, kijunSen, chikouSpan, senkouSpanA, senkouSpanB, kumoTop, kumoBottom
BOOLEAN: isPriceAboveCloud, isPriceBelowCloud, isPriceInCloud, isTenkanAboveKijun, isTenkanBelowKijun, isBullishIchimoku, isBearishIchimoku

### MOMENTUM OSCILLATORS
NUMERIC: rsi, rsi9, rsi14, rsi21, stochRSI, stochK, stochD, stochKSlow, stochDSlow, williamsR, cci, roc, momentum, ultimateOscillator, awesomeOscillator, cmo, fisherTransform, coppockCurve, dpo
BOOLEAN: isOversold, isOverbought, isMomentumBullish, isMomentumBearish, isRSICrossedAbove30, isRSICrossedBelow70

### VOLATILITY INDICATORS
NUMERIC: bbUpper, bbMiddle, bbLower, bbWidth, bbPercent, standardDeviation, trueRange, atr, atr14, atr21, natr, kcUpper, kcMiddle, kcLower, donchianUpper, donchianMiddle, donchianLower, chaikinVolatility, massIndex
BOOLEAN: bbSqueeze, isHighVolatility, isLowVolatility, isVolatilityExpanding, isVolatilityContracting, isNearBBLower, isNearBBUpper, isBelowBBLower, isAboveBBUpper

### VOLUME INDICATORS
NUMERIC: volume, volumeSMA20, volumeRatio, obv, vwap, vwapUpper, vwapLower, adLine, cmf, chaikinOscillator, mfi, eom, forceIndex, nvi, pvi, vpoc, vah, val
BOOLEAN: isHighVolume, isLowVolume, isVolumeIncreasing, isVolumeDecreasing, isVolumeAboveAverage, isVolumeBelowAverage, isPriceAboveVWAP, isPriceBelowVWAP, isNearVWAP

### MARKET STRUCTURE & LEVELS
NUMERIC: pivotPoint, r1, r2, r3, s1, s2, s3, fib236, fib382, fib500, fib618, fib786, fib1272, fib1618, fib2618, fractalHigh, fractalLow, alligatorJaw, alligatorTeeth, alligatorLips, gatorOscillator, heikinAshiOpen, heikinAshiHigh, heikinAshiLow, heikinAshiClose
BOOLEAN: isFractalHigh, isFractalLow

### CANDLE PATTERNS  
BOOLEAN: isBullishCandle, isBearishCandle, isBullishEngulfing, isBearishEngulfing, isDoji, isHammer, isShootingStar

### MARKET STATE
BOOLEAN: isBullMarket, isBearMarket, isSidewaysMarket, isTrending, isRanging, overallBullish, overallBearish, overallNeutral
NUMERIC: trendStrength, momentumStrength, volatilityStrength, volumeStrength

### PRICE DATA
NUMERIC: price, open, high, low, close, priceChange, priceChangePercent, priceChange24h

Operators: GT, GTE, LT, LTE, EQ, NEQ
`;

// TIMEFRAME-SPECIFIC STRATEGY RECOMMENDATIONS
const TIMEFRAME_STRATEGIES = {
  '1m': {
    focus: 'Trading haute fréquence',
    indicators: 'Utilise RSI, Stochastic, volume rapide, EMA courtes (5,10,20)',
    tp: '0.3-0.8%',
    sl: '0.2-0.5%',
    maxTime: '3-10 min',
    style: 'Réactivité maximale, beaucoup de trades, petits profits'
  },
  '5m': {
    focus: 'Trading court terme',
    indicators: 'RSI, MACD rapide, volume, EMA (12,26), Bollinger Bands',
    tp: '0.8-1.5%',
    sl: '0.5-1%',
    maxTime: '10-30 min',
    style: 'Momentum court terme, réactivité élevée'
  },
  '15m': {
    focus: 'Swing trading court',
    indicators: 'MACD, RSI, ATR, EMA (20,50), Bollinger Bands, Stochastic',
    tp: '1.5-3%',
    sl: '1-2%',
    maxTime: '30-120 min',
    style: 'Capture des mouvements intraday, momentum moyen'
  },
  '1h': {
    focus: 'Swing trading moyen',
    indicators: 'MACD, ADX, EMA (50,100,200), Supertrend, Aroon, Parabolic SAR',
    tp: '2-4%',
    sl: '1.5-3%',
    maxTime: '2-8 heures',
    style: 'Suivi de tendances horaires, positions intraday/overnight'
  },
  '4h': {
    focus: 'Position trading',
    indicators: 'ADX, EMA longues (100,200), Pivot Points, Fibonacci, Awesome Oscillator',
    tp: '3-6%',
    sl: '2-4%',
    maxTime: '12-48 heures',
    style: 'Tendances moyennes, positions de plusieurs jours'
  },
  '1d': {
    focus: 'Trading tendanciel',
    indicators: 'EMA longues (50,100,200), ADX, Golden/Death Cross, Pivot Weekly, Volume',
    tp: '5-15%',
    sl: '3-8%',
    maxTime: '3-14 jours',
    style: 'Suivi des grandes tendances, positions long terme'
  }
};

const SYSTEM_PROMPT = `Tu es un expert en trading algorithmique Bitcoin. Génère une stratégie de trading UNIQUEMENT pour la timeframe spécifiée.

**IMPORTANT - ADAPTATION À LA TIMEFRAME:**
La stratégie DOIT être optimisée pour la timeframe demandée. Utilise les indicateurs et paramètres appropriés selon la durée des chandeliers.

TOUS LES INDICATEURS DISPONIBLES:
${ALL_AVAILABLE_INDICATORS}

Available Colors (pick ONE unique - EXACT name only): emerald, rose, indigo, violet, amber, lime, sky, fuchsia, pink, red, green, slate, stone, cyan, orange, teal, purple

FORMAT EXACT (JSON compact sans espaces):
{"name":"Strategy Name","description":"Brief desc","color":"emerald","longNotes":"🟢 Conditions d'ACHAT (LONG): ...","shortNotes":"🔴 Conditions de VENTE (SHORT): ...","strategyLogic":"💡 Logique: ...","longEntryConditions":{"operator":"AND","conditions":[{"type":"comparison","indicator":"rsi","operator":"LT","value":30},{"type":"boolean","indicator":"isBullishTrend","value":true}]},"shortEntryConditions":{"operator":"AND","conditions":[{"type":"comparison","indicator":"rsi","operator":"GT","value":70},{"type":"boolean","indicator":"isBearishTrend","value":true}]},"longExitConditions":{"operator":"OR","conditions":[{"type":"boolean","indicator":"isBearishTrend","value":true}]},"shortExitConditions":{"operator":"OR","conditions":[{"type":"boolean","indicator":"isBullishTrend","value":true}]},"profitTargetPercent":2.5,"stopLossPercent":1.5,"maxPositionTime":60,"positionSize":0.05,"cooldownPeriod":5}

**OPÉRATEURS LOGIQUES COMPLEXES - NOUVELLE CAPACITÉ:**
Tu peux créer des groupes imbriqués avec des opérateurs mixtes (ET/OU combinés) pour des stratégies sophistiquées:

EXEMPLE DE GROUPE IMBRIQUÉ:
{"operator":"OR","conditions":[
  {"operator":"AND","conditions":[{"type":"comparison","indicator":"rsi","operator":"LT","value":30},{"type":"boolean","indicator":"isBullishTrend","value":true}]},
  {"operator":"AND","conditions":[{"type":"comparison","indicator":"macd","operator":"GT","value":"macdSignal"},{"type":"boolean","indicator":"isHighVolume","value":true}]}
]}

Cela signifie: (RSI < 30 ET isBullishTrend) OU (MACD > Signal ET isHighVolume)

EXEMPLES DE STRATÉGIES COMPLEXES:

1. STRATÉGIE MOMENTUM + VOLUME:
{"operator":"OR","conditions":[
  {"operator":"AND","conditions":[{"type":"comparison","indicator":"rsi","operator":"LT","value":30},{"type":"boolean","indicator":"isHighVolume","value":true},{"type":"boolean","indicator":"isBullishTrend","value":true}]},
  {"operator":"AND","conditions":[{"type":"comparison","indicator":"stochK","operator":"LT","value":20},{"type":"boolean","indicator":"isVolumeAboveAverage","value":true}]}
]}

2. STRATÉGIE BOLLINGER + MACD:
{"operator":"AND","conditions":[
  {"operator":"OR","conditions":[{"type":"boolean","indicator":"isBelowBBLower","value":true},{"type":"comparison","indicator":"bbPercent","operator":"LT","value":0.2}]},
  {"operator":"OR","conditions":[{"type":"boolean","indicator":"isMACDBullish","value":true},{"type":"comparison","indicator":"macd","operator":"GT","value":"macdSignal"}]}
]}

RÈGLES STRICTES:
1. LONG et SHORT obligatoires, 2-4 conditions par entrée
2. value = NUMBER (30, 70) OU STRING d'indicateur ("ema50", "price") pour comparaisons dynamiques
3. Choisir des indicateurs VARIÉS et ADAPTÉS à la timeframe
4. Inclure OBLIGATOIREMENT: "color", "longNotes", "shortNotes", "strategyLogic"
5. JSON compact SANS espaces ni retours à la ligne
6. **DIVERSITÉ OBLIGATOIRE**: Varie les types d'indicateurs - utilise RSI, MACD, Bollinger, Stochastic, Volume, ADX, ATR, etc. ÉVITE de toujours utiliser Ichimoku
7. **NOUVEAU**: Tu peux créer des groupes imbriqués avec des opérateurs mixtes pour des stratégies plus sophistiquées

**INDICATEURS RECOMMANDÉS PAR CATÉGORIE:**
- MOMENTUM: RSI, Stochastic, Williams %R, CCI, ROC
- TENDANCE: MACD, EMA, SMA, ADX, Parabolic SAR, Supertrend
- VOLATILITÉ: Bollinger Bands, ATR, Standard Deviation
- VOLUME: OBV, VWAP, Volume Ratio, MFI, CMF
- OSCILLATEURS: Awesome Oscillator, Ultimate Oscillator, Fisher Transform
`;

export async function POST(request: Request) {
  try {
    const { prompt, type, existingStrategies, timeframe } = await request.json();
    
    // Default to 1m if no timeframe provided
    const currentTimeframe = timeframe || '1m';
    const tfConfig = TIMEFRAME_STRATEGIES[currentTimeframe as keyof typeof TIMEFRAME_STRATEGIES] || TIMEFRAME_STRATEGIES['1m'];

    // Simplified existing strategies context
    let existingNote = '';
    let existingColorsNote = '';
    if (existingStrategies && existingStrategies.length > 0) {
      const focuses = existingStrategies.map((s: any) => s.focus).join(', ');
      existingNote = `. Évite ces approches déjà utilisées: ${focuses}`;
      
      // Extract colors from existing strategies
      const usedColors = existingStrategies
        .filter((s: any) => s.color)
        .map((s: any) => s.color);
      if (usedColors.length > 0) {
        existingColorsNote = `. Couleurs déjà utilisées: ${usedColors.join(', ')}. Choisis une couleur DIFFÉRENTE`;
      }
    }

    // Build user prompt based on timeframe AND type - L'IA peut utiliser TOUS les indicateurs disponibles
    let userPrompt = '';
    
    // Adapt strategy parameters based on timeframe
    const timeframeContext = `
TIMEFRAME: ${currentTimeframe}
FOCUS: ${tfConfig.focus}
INDICATEURS RECOMMANDÉS: ${tfConfig.indicators}
PROFIT TARGET: ${tfConfig.tp}
STOP LOSS: ${tfConfig.sl}
MAX POSITION TIME: ${tfConfig.maxTime}
STYLE: ${tfConfig.style}
`;
    
    if (type === 'aggressive') {
      userPrompt = `${timeframeContext}
Génère une stratégie de trading optimisée pour ${currentTimeframe}. Utilise les indicateurs appropriés à cette timeframe (Ichimoku, Supertrend, Fisher, Aroon, etc.). Crée une stratégie UNIQUE${existingNote}${existingColorsNote}`;
    } else if (type === 'conservative') {
      userPrompt = `${timeframeContext}
Génère une stratégie de trading optimisée pour ${currentTimeframe}. Utilise les indicateurs de tendance forte (ADX, Golden Cross, Ichimoku complet, etc.). Crée une stratégie UNIQUE${existingNote}${existingColorsNote}`;
    } else if (type === 'balanced') {
      userPrompt = `${timeframeContext}
Génère une stratégie de trading optimisée pour ${currentTimeframe}. Mix d'indicateurs de momentum et tendance. Crée une stratégie UNIQUE${existingNote}${existingColorsNote}`;
    } else {
      userPrompt = `${timeframeContext}
Génère une stratégie Bitcoin optimisée pour ${currentTimeframe}. Utilise TOUS les indicateurs disponibles. Crée une stratégie UNIQUE${existingNote}${existingColorsNote}`;
    }

    console.log('🤖 Generating strategy with OpenAI...');
    console.log('Timeframe:', currentTimeframe);
    console.log('Prompt type:', type);
    console.log('User input:', prompt);
    console.log('Existing strategies count:', existingStrategies?.length || 0);
    console.log('\n📝 FULL USER PROMPT SENT TO AI:');
    console.log('=====================================');
    console.log(userPrompt);
    console.log('=====================================\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('✅ Strategy generated successfully');
    console.log('Raw response length:', response.length);
    console.log('\n🤖 AI RESPONSE (first 1000 chars):');
    console.log('=====================================');
    console.log(response.substring(0, 1000));
    console.log('=====================================\n');
    
    // Clean the response (remove markdown if present)
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Parse and validate the JSON response
    let strategy;
    try {
      strategy = JSON.parse(cleanedResponse);
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Problematic response (first 500 chars):', cleanedResponse.substring(0, 500));
      throw new Error(`Invalid JSON from OpenAI: ${parseError.message}`);
    }
    
    // Validate required fields
    console.log('Validating strategy structure...');
    console.log('Strategy name:', strategy.name);
    console.log('Has longEntryConditions:', !!strategy.longEntryConditions);
    console.log('Has shortEntryConditions:', !!strategy.shortEntryConditions);
    
    if (!strategy.name) {
      console.error('❌ Missing strategy name');
      throw new Error('Invalid strategy structure from AI: missing name');
    }
    
    if (!strategy.longEntryConditions || !strategy.longEntryConditions.conditions) {
      console.error('❌ Missing or invalid longEntryConditions');
      console.log('longEntryConditions:', JSON.stringify(strategy.longEntryConditions));
      throw new Error('Invalid strategy structure from AI: missing longEntryConditions');
    }
    
    // Auto-generate SHORT conditions if missing (inverse of LONG)
    if (!strategy.shortEntryConditions || !strategy.shortEntryConditions.conditions) {
      console.log('⚠️ Missing shortEntryConditions - auto-generating inverse of LONG...');
      
      // Create inverse conditions automatically
      const inverseConditions = strategy.longEntryConditions.conditions.map((cond: any) => {
        if (cond.type === 'comparison') {
          // Inverse the operator
          let inverseOp = cond.operator;
          if (cond.operator === 'LT') inverseOp = 'GT';
          else if (cond.operator === 'GT') inverseOp = 'LT';
          else if (cond.operator === 'LTE') inverseOp = 'GTE';
          else if (cond.operator === 'GTE') inverseOp = 'LTE';
          
          return {
            ...cond,
            operator: inverseOp,
            description: cond.description?.replace('LONG', 'SHORT').replace('Buy', 'Sell')
          };
        } else if (cond.type === 'boolean') {
          // Inverse boolean indicators
          let inverseIndicator = cond.indicator;
          if (cond.indicator === 'isBullishTrend') inverseIndicator = 'isBearishTrend';
          else if (cond.indicator === 'isBearishTrend') inverseIndicator = 'isBullishTrend';
          else if (cond.indicator === 'isUptrend') inverseIndicator = 'isDowntrend';
          else if (cond.indicator === 'isDowntrend') inverseIndicator = 'isUptrend';
          else if (cond.indicator === 'isMACDBullish') inverseIndicator = 'isMACDBearish';
          else if (cond.indicator === 'isMACDBearish') inverseIndicator = 'isMACDBullish';
          
          return {
            ...cond,
            indicator: inverseIndicator,
            description: cond.description?.replace('LONG', 'SHORT').replace('Buy', 'Sell')
          };
        }
        return cond;
      });
      
      strategy.shortEntryConditions = {
        operator: 'AND',
        conditions: inverseConditions
      };
      
      console.log('✅ Auto-generated SHORT conditions from LONG');
    }
    
    // Auto-generate SHORT exit conditions if missing
    if (strategy.longExitConditions && (!strategy.shortExitConditions || !strategy.shortExitConditions.conditions)) {
      console.log('⚠️ Missing shortExitConditions - auto-generating from LONG exits...');
      
      const inverseExits = strategy.longExitConditions.conditions.map((cond: any) => {
        if (cond.type === 'boolean') {
          let inverseIndicator = cond.indicator;
          if (cond.indicator === 'isBullishTrend') inverseIndicator = 'isBearishTrend';
          else if (cond.indicator === 'isBearishTrend') inverseIndicator = 'isBullishTrend';
          else if (cond.indicator === 'isMACDBullish') inverseIndicator = 'isMACDBearish';
          else if (cond.indicator === 'isMACDBearish') inverseIndicator = 'isMACDBullish';
          
          return { ...cond, indicator: inverseIndicator };
        }
        return cond;
      });
      
      strategy.shortExitConditions = {
        operator: 'OR',
        conditions: inverseExits
      };
    }

    // Add strategyType, simulationMode, and timeframe
    strategy.strategyType = 'CUSTOM';
    strategy.simulationMode = true;
    strategy.timeframe = currentTimeframe; // Use the provided timeframe
    
    // Force presence of user-friendly notes
    strategy.longNotes = strategy.longNotes || '🟢 Conditions d\'ACHAT (LONG): ...';
    strategy.shortNotes = strategy.shortNotes || '🔴 Conditions de VENTE (SHORT): ...';
    strategy.strategyLogic = strategy.strategyLogic || '💡 Logique: ...';
    
    // Ensure default values
    strategy.profitTargetPercent = strategy.profitTargetPercent || 2.0;
    strategy.stopLossPercent = strategy.stopLossPercent || 1.5;
    strategy.maxPositionTime = strategy.maxPositionTime || 60;
    strategy.positionSize = strategy.positionSize || 0.01;
    strategy.cooldownPeriod = strategy.cooldownPeriod !== undefined ? strategy.cooldownPeriod : 5;
    
    // Convert minutes to milliseconds for maxPositionTime and cooldownPeriod
    if (strategy.maxPositionTime) {
      strategy.maxPositionTime = strategy.maxPositionTime * 60 * 1000;
    }
    if (strategy.cooldownPeriod !== undefined) {
      strategy.cooldownPeriod = strategy.cooldownPeriod * 60 * 1000;
    }

    console.log('✅ Strategy validated and ready:', strategy.name);
    
    console.log('\nCOMPLETE STRATEGY GENERATED BY AI:');
    console.log('=====================================');
    console.log(JSON.stringify(strategy, null, 2));
    console.log('=====================================\n');

    return NextResponse.json({
      success: true,
      strategy
    });

  } catch (error: any) {
    console.error('❌ Error generating strategy:', error);
    
    // Handle OpenAI specific errors
    if (error.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid OpenAI API key. Please check your .env configuration.'
      }, { status: 401 });
    }
    
    if (error.status === 429) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI rate limit exceeded. Please try again later.'
      }, { status: 429 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate strategy with AI'
    }, { status: 500 });
  }
}

