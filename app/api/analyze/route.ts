import { NextRequest, NextResponse } from 'next/server';
import { Category, Season } from '../../types';

// Server-side classification: filename heuristics only (no vision model on this route).

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, filename } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Simulate AI processing delay (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Extract color from filename
    const color = extractColorFromFilename(filename || imageUrl);
    
    // Extract category from filename (rule-based fallback)
    const category = extractCategoryFromFilename(filename || imageUrl);
    
    // Extract season from filename (rule-based fallback)
    const season = extractSeasonFromFilename(filename || imageUrl);
    
    // Calculate confidence based on how specific the filename is
    const confidence = calculateConfidence(filename, category, color, season);

    return NextResponse.json({
      category: category,
      categorySource: 'rule',
      categoryConfidence: confidence.category,
      color: color,
      colorSource: 'rule',
      colorConfidence: confidence.color,
      season: season,
      seasonSource: 'rule',
      seasonConfidence: confidence.season,
      overallConfidence: confidence.overall,
      note: 'Server-side uses filename-based rules only.',
    });
  } catch (error) {
    console.error('AI classification error:', error);
    return NextResponse.json(
      { error: 'AI classification failed' },
      { status: 500 }
    );
  }
}

// Helper functions for rule-based classification
function extractColorFromFilename(filename: string): string {
  const lowerName = filename.toLowerCase();

  const colorKeywords: Record<string, string> = {
    white: 'white',
    black: 'black',
    blue: 'blue',
    red: 'red',
    green: 'green',
    yellow: 'yellow',
    pink: 'pink',
    purple: 'purple',
    orange: 'orange',
    gray: 'gray',
    grey: 'gray',
    brown: 'brown',
    beige: 'beige',
    navy: 'navy',
    // Chinese keywords
    白: 'white',
    黑: 'black',
    蓝: 'blue',
    红: 'red',
    绿: 'green',
    黄: 'yellow',
    粉: 'pink',
    紫: 'purple',
    橙: 'orange',
    灰: 'gray',
    棕: 'brown',
  };

  for (const [keyword, color] of Object.entries(colorKeywords)) {
    if (lowerName.includes(keyword)) {
      return color;
    }
  }

  return 'unknown';
}

function extractCategoryFromFilename(filename: string): Category {
  const lowerName = filename.toLowerCase();

  // Top keywords
  if (/\b(tshirt|t-shirt|shirt|top|blouse|tank|tee)\b/.test(lowerName)) {
    return 'top';
  }

  // Bottom keywords
  if (/\b(pants|jeans|trousers|bottom|skirt|shorts)\b/.test(lowerName)) {
    return 'bottom';
  }

  // Outerwear keywords
  if (/\b(jacket|coat|outerwear|blazer|vest|cardigan)\b/.test(lowerName)) {
    return 'outerwear';
  }

  // Shoes keywords
  if (/\b(shoes|sneakers|boots|sandals|heels|footwear)\b/.test(lowerName)) {
    return 'shoes';
  }

  // Accessory keywords
  if (/\b(bag|hat|cap|scarf|belt|glasses|accessory)\b/.test(lowerName)) {
    return 'accessory';
  }

  return 'other';
}

function extractSeasonFromFilename(filename: string): Season[] {
  const lowerName = filename.toLowerCase();

  const seasonKeywords: Record<string, Season> = {
    spring: 'spring',
    春: 'spring',
    summer: 'summer',
    夏: 'summer',
    autumn: 'autumn',
    fall: 'autumn',
    秋: 'autumn',
    winter: 'winter',
    冬: 'winter',
  };

  const seasons: Season[] = [];

  for (const [keyword, season] of Object.entries(seasonKeywords)) {
    if (lowerName.includes(keyword)) {
      if (!seasons.includes(season)) {
        seasons.push(season);
      }
    }
  }

  return seasons;
}

function calculateConfidence(filename: string, category: Category, color: string, season: Season[]) {
  // Base confidence on filename specificity
  let categoryConfidence = 0.3; // Default low confidence
  let colorConfidence = 0.3;
  let seasonConfidence = 0.3;

  if (filename) {
    const lowerName = filename.toLowerCase();

    // Higher confidence if specific keywords found
    if (/\b(tshirt|shirt|jacket|pants|jeans|shoes|boots|bag|hat)\b/.test(lowerName)) {
      categoryConfidence = 0.7;
    }

    if (/\b(white|black|blue|red|green|yellow|pink|purple|orange|gray|brown|beige|navy)\b/.test(lowerName)) {
      colorConfidence = 0.7;
    }

    if (/\b(spring|summer|autumn|fall|winter|春|夏|秋|冬)\b/.test(lowerName)) {
      seasonConfidence = 0.6;
    }
  }

  const overallConfidence = (categoryConfidence + colorConfidence + seasonConfidence) / 3;

  return {
    category: categoryConfidence,
    color: colorConfidence,
    season: seasonConfidence,
    overall: overallConfidence,
  };
}