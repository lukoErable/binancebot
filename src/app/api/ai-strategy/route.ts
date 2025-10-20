import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * AI Strategy Generator API
 * Uses OpenAI to generate complete trading strategies
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// All available indicators with descriptions
const AVAILABLE_INDICATORS = `
### Price & Volume
- price: Current price
- open, high, low: OHLC data
- volume: Trading volume
- volumeSMA20: 20-period volume average
- volumeRatio: Current volume vs average
- vwap: Volume Weighted Average Price

### Moving Averages
- ema12, ema26, ema50, ema100, ema200: Exponential Moving Averages
- sma7, sma25, sma50, sma99, sma200: Simple Moving Averages

### Momentum Indicators
- rsi, rsi9, rsi21: Relative Strength Index (different periods)
- macd, macdSignal, macdHistogram: MACD indicator
- stochK, stochD: Stochastic oscillator
- cci: Commodity Channel Index

### Volatility
- bbUpper, bbMiddle, bbLower: Bollinger Bands
- bbWidth: Band width (volatility measure)
- bbPercent: %B - Price position within bands
- atr, atr14, atr21: Average True Range

### Trend Indicators
- adx: Average Directional Index (trend strength)
- obv: On-Balance Volume

### Boolean Signals (True/False)
- isBullishTrend: EMA50 > EMA200 (uptrend)
- isBearishTrend: EMA50 < EMA200 (downtrend)
- isUptrend: Price > EMA50
- isDowntrend: Price < EMA50
- isUptrendConfirmed3, isDowntrendConfirmed3: 3 consecutive closes vs EMA50
- isTrendReversalUp, isTrendReversalDown: confirmed trend reversals
- isOversold: RSI < 30
- isOverbought: RSI > 70
- isMACDBullish: MACD > Signal
- isMACDBearish: MACD < Signal
- isMACDCrossoverBullish: Recent bullish crossover
- isMACDCrossoverBearish: Recent bearish crossover
- isEMAFastSlowBullCross, isEMAFastSlowBearCross: EMA12/26 crosses
- isPriceCrossedAboveEMA50, isPriceCrossedBelowEMA50: price/EMA50 cross
- isHighVolume: Volume > 1.5x average
- isLowVolume: Volume < 0.5x average
- isPriceAboveVWAP, isPriceBelowVWAP, isNearVWAP: VWAP signals
- isNearBBLower: Near lower Bollinger Band
- isNearBBUpper: Near upper Bollinger Band
- isBelowBBLower: Below lower band
- isAboveBBUpper: Above upper band
- isBullishCandle, isBearishCandle: Candle direction
- isBullishEngulfing, isBearishEngulfing: Engulfing patterns
- isDoji, isHammer, isShootingStar: Candlestick patterns

### Comparison Operators
- GT: Greater than
- GTE: Greater than or equal
- LT: Less than
- LTE: Less than or equal
- EQ: Equal
- NEQ: Not equal
`;

const SYSTEM_PROMPT = `Generate Bitcoin trading strategy as compact JSON. You can use ANY indicators available.

Available Indicators:
- Numeric: rsi, rsi9, rsi21, ema12, ema26, ema50, ema100, ema200, sma7, sma25, sma50, sma99, sma200, macd, macdSignal, macdHistogram, bbUpper, bbMiddle, bbLower, bbWidth, bbPercent, atr, atr14, atr21, stochK, stochD, adx, cci, obv, volumeSMA20, volumeRatio, price, volume, vwap
- Boolean: isBullishTrend, isBearishTrend, isUptrend, isDowntrend, isUptrendConfirmed3, isDowntrendConfirmed3, isTrendReversalUp, isTrendReversalDown, isOversold, isOverbought, isMACDBullish, isMACDBearish, isMACDCrossoverBullish, isMACDCrossoverBearish, isEMAFastSlowBullCross, isEMAFastSlowBearCross, isPriceCrossedAboveEMA50, isPriceCrossedBelowEMA50, isHighVolume, isLowVolume, isPriceAboveVWAP, isPriceBelowVWAP, isNearVWAP, isNearBBLower, isNearBBUpper, isBelowBBLower, isAboveBBUpper, isBullishCandle, isBearishCandle, isBullishEngulfing, isBearishEngulfing, isDoji, isHammer, isShootingStar

Available Colors (pick ONE unique - EXACT name only): emerald, rose, indigo, violet, amber, lime, sky, fuchsia, pink, red, green, slate, stone

Format (copy exactly - ADD fields: "color", "longNotes", "shortNotes", "strategyLogic"):
{"name":"Strategy Name","description":"Brief desc","color":"emerald","longNotes":"🟢 Conditions d'ACHAT (LONG): ...","shortNotes":"🔴 Conditions de VENTE (SHORT): ...","strategyLogic":"💡 Logique: ...","longEntryConditions":{"operator":"AND","conditions":[{"type":"comparison","indicator":"rsi","operator":"LT","value":30},{"type":"comparison","indicator":"price","operator":"GT","value":"ema50"},{"type":"boolean","indicator":"isBullishTrend","value":true}]},"shortEntryConditions":{"operator":"AND","conditions":[{"type":"comparison","indicator":"rsi","operator":"GT","value":70},{"type":"comparison","indicator":"price","operator":"LT","value":"ema50"},{"type":"boolean","indicator":"isBearishTrend","value":true}]},"longExitConditions":{"operator":"OR","conditions":[{"type":"comparison","indicator":"price","operator":"LT","value":"ema50"},{"type":"boolean","indicator":"isBearishTrend","value":true}]},"shortExitConditions":{"operator":"OR","conditions":[{"type":"comparison","indicator":"price","operator":"GT","value":"ema50"},{"type":"boolean","indicator":"isBullishTrend","value":true}]},"profitTargetPercent":2.5,"stopLossPercent":1.5,"maxPositionTime":60,"positionSize":0.05,"cooldownPeriod":5}

Rules: BOTH long+short required, 2-4 conditions per entry, NO spaces, value can be NUMBER (30, 70) OR INDICATOR NAME as STRING ("ema50", "macd", "price") for comparison, value=true/false for boolean, choose diverse indicators, MUST include fields: "color", "longNotes", "shortNotes", "strategyLogic". Use indicator comparisons (e.g. price vs ema50, rsi vs 50) for more dynamic strategies.
`;

export async function POST(request: Request) {
  try {
    const { prompt, type, existingStrategies } = await request.json();

    // Simplified existing strategies context
    let existingNote = '';
    let existingColorsNote = '';
    if (existingStrategies && existingStrategies.length > 0) {
      const focuses = existingStrategies.map((s: any) => s.focus).join(', ');
      existingNote = `. Avoid: ${focuses}`;
      
      // Extract colors from existing strategies
      const usedColors = existingStrategies
        .filter((s: any) => s.color)
        .map((s: any) => s.color);
      if (usedColors.length > 0) {
        existingColorsNote = `. Colors already used: ${usedColors.join(', ')}. Pick a DIFFERENT color`;
      }
    }

    // Build user prompt based on type - L'IA peut utiliser TOUS les indicateurs disponibles
    let userPrompt = '';
    
    if (type === 'aggressive') {
      userPrompt = `Aggressive scalping: TP 3%, SL 1.5%, 15min. Use ANY indicators you want (rsi, ema, macd, stochK, cci, adx, bbands, atr, volume, patterns, etc). Create unique strategy${existingNote}${existingColorsNote}`;
    } else if (type === 'conservative') {
      userPrompt = `Conservative trend: TP 2%, SL 2.5%, 120min. Use ANY indicators you want (rsi, ema, macd, stochK, cci, adx, bbands, atr, volume, patterns, etc). Create unique strategy${existingNote}${existingColorsNote}`;
    } else if (type === 'balanced') {
      userPrompt = `Balanced swing: TP 2.5%, SL 2%, 60min. Use ANY indicators you want (rsi, ema, macd, stochK, cci, adx, bbands, atr, volume, patterns, etc). Create unique strategy${existingNote}${existingColorsNote}`;
    } else {
      userPrompt = `BTC strategy: TP 2.5%, SL 1.5%, 60min. Use ANY indicators you want. Create unique strategy${existingNote}${existingColorsNote}`;
    }

    console.log('🤖 Generating strategy with OpenAI...');
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
    strategy.timeframe = '1m'; // Default timeframe for AI-generated strategies
    
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
    
    console.log('\n📊 COMPLETE STRATEGY GENERATED BY AI:');
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

