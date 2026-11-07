import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { compileScannerResults } from '@/lib/scannerEngine';

const execPromise = util.promisify(exec);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cachePath = path.join(process.cwd(), 'src', 'lib', 'scan_cache.json');
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'scan_stocks.py');

    let cacheData: any = null;
    let shouldRunScript = forceRefresh;

    if (fs.existsSync(cachePath)) {
      try {
        const fileContent = fs.readFileSync(cachePath, 'utf-8');
        cacheData = JSON.parse(fileContent);
        const ageSeconds = Math.floor(Date.now() / 1000) - (cacheData.timestamp || 0);

        // If cache is older than 5 minutes and user requested fresh, run script
        if (ageSeconds > 300) {
          shouldRunScript = true;
        }
      } catch (e) {
        shouldRunScript = true;
      }
    } else {
      shouldRunScript = true;
    }

    if (shouldRunScript) {
      try {
        // Run python script in background or synchronously with timeout
        await execPromise(`python "${scriptPath}"`, { timeout: 25000 });
        if (fs.existsSync(cachePath)) {
          const freshContent = fs.readFileSync(cachePath, 'utf-8');
          cacheData = JSON.parse(freshContent);
        }
      } catch (err: any) {
        console.error('Python scanner script failed or timed out:', err.message);
        // Fall back to existing cacheData if available
      }
    }

    if (!cacheData || !cacheData.items) {
      return NextResponse.json(
        { error: 'No scan data available. Try running scan_stocks.py first.' },
        { status: 500 }
      );
    }

    const summary = compileScannerResults(cacheData.items, cacheData.timestamp || Math.floor(Date.now() / 1000));

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Scanner API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan stocks' },
      { status: 500 }
    );
  }
}
