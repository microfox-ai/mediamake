import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';

export const GET = async (req: NextRequest) => {
  try {
    const clientId = req.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 },
      );
    }

    // Get render history for the client
    const renderHistory = await renderRequestDB.getByClientId(clientId, 50);

    // Convert MongoDB documents to the expected format
    const formattedHistory = renderHistory.map(doc => ({
      id: doc.renderId,
      fileName: doc.fileName,
      codec: doc.codec,
      composition: doc.composition,
      status: doc.status,
      createdAt: doc.createdAt,
      downloadUrl: doc.downloadUrl,
      fileSize: doc.fileSize,
      progress: doc.progress,
      error: doc.error,
      inputProps: doc.inputProps,
      progressData: doc.progressData,
      isDownloadable: doc.isDownloadable,
      bucketName: doc.bucketName,
      renderId: doc.renderId,
      renderType: doc.renderType,
      audioCodec: doc.audioCodec,
      // Lambda configuration fields
      configMode: doc.configMode,
      awsRenderPreset: doc.awsRenderPreset,
      customConfig: doc.customConfig,
      concurrencyUsed: doc.concurrencyUsed,
      framesPerLambdaUsed: doc.framesPerLambdaUsed,
      memoryUsed: doc.memoryUsed,
      diskUsed: doc.diskUsed,
      timeoutUsed: doc.timeoutUsed,
      functionNameUsed: doc.functionNameUsed,
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error('Failed to fetch render history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch render history' },
      { status: 500 },
    );
  }
};
