/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type {
  VideoChallenge,
  VideoConstraints,
  VideoRecorderState,
} from '../../types/verification';
import Button from '../ui/Button';
import Card from '../ui/Card';

export interface VideoRecordingComponentProps {
  challenge: VideoChallenge;
  constraints: VideoConstraints;
  onRecordingComplete: (
    blob: Blob,
    metadata: { fileName: string; fileSize: number; mimeType: string; durationSeconds: number },
  ) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
  className?: string;
}

function VideoRecordingComponent({
  challenge,
  constraints,
  onRecordingComplete,
  isUploading = false,
  uploadError = null,
  className = '',
}: VideoRecordingComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    recordedBlob: null,
    recordedVideoUrl: null,
    recordingDuration: 0,
    error: null,
  });

  const [isCameraAccessing, setIsCameraAccessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Timer for recording duration
  useEffect(() => {
    if (!state.isRecording) {
      setRecordingTime(0);
      return;
    }

    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRecording]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (state.recordedVideoUrl) {
        URL.revokeObjectURL(state.recordedVideoUrl);
      }
    };
  }, [state.recordedVideoUrl]);

  const startRecording = useCallback(async () => {
    try {
      setIsCameraAccessing(true);
      setState((prev) => ({ ...prev, error: null }));

      // Request camera and audio access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      streamRef.current = stream;

      // Set video element source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create MediaRecorder
      const mimeType = 'video/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(recordedBlob);

        setState((prev) => ({
          ...prev,
          recordedBlob,
          recordedVideoUrl: videoUrl,
          recordingDuration: recordingTime,
        }));

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setState((prev) => ({ ...prev, isRecording: true }));
      setRecordingTime(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setIsCameraAccessing(false);
    }
  }, [recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false }));
    }
  }, [state.isRecording]);

  const discardRecording = useCallback(() => {
    if (state.recordedVideoUrl) {
      URL.revokeObjectURL(state.recordedVideoUrl);
    }
    chunksRef.current = [];
    setState({
      isRecording: false,
      recordedBlob: null,
      recordedVideoUrl: null,
      recordingDuration: 0,
      error: null,
    });
    setRecordingTime(0);
  }, [state.recordedVideoUrl]);

  const handleSubmit = useCallback(async () => {
    if (!state.recordedBlob) return;

    try {
      const duration = state.recordingDuration;

      // Validate duration
      if (duration < constraints.minDurationSeconds) {
        setState((prev) => ({
          ...prev,
          error: `Video must be at least ${constraints.minDurationSeconds} seconds long`,
        }));
        return;
      }

      if (duration > constraints.maxDurationSeconds) {
        setState((prev) => ({
          ...prev,
          error: `Video must be no longer than ${constraints.maxDurationSeconds} seconds`,
        }));
        return;
      }

      // Validate file size
      if (state.recordedBlob.size > constraints.maxFileSize) {
        const maxSizeMB = (constraints.maxFileSize / (1024 * 1024)).toFixed(1);
        setState((prev) => ({
          ...prev,
          error: `Video size exceeds ${maxSizeMB}MB limit`,
        }));
        return;
      }

      // Call the upload handler
      await onRecordingComplete(state.recordedBlob, {
        fileName: `verification-${Date.now()}.webm`,
        fileSize: state.recordedBlob.size,
        mimeType: 'video/webm',
        durationSeconds: duration,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, [state.recordedBlob, state.recordingDuration, constraints, onRecordingComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRecordingValid =
    state.recordedBlob &&
    state.recordingDuration >= constraints.minDurationSeconds &&
    state.recordingDuration <= constraints.maxDurationSeconds &&
    state.recordedBlob.size <= constraints.maxFileSize;

  return (
    <Card variant="default" padding="lg" className={className}>
      <div className="space-y-6">
        {/* Challenge Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Verification Challenge</h3>
          <p className="text-blue-800 mb-3">{challenge.instruction}</p>
          {challenge.randomValue && (
            <div className="bg-white border-l-4 border-blue-600 pl-3 py-2">
              <p className="text-sm text-gray-600">Say this phrase:</p>
              <p className="font-mono font-bold text-lg text-blue-600">{challenge.randomValue}</p>
            </div>
          )}
          {challenge.timestamp && (
            <div className="bg-white border-l-4 border-blue-600 pl-3 py-2">
              <p className="text-sm text-gray-600">Display this timestamp:</p>
              <p className="font-mono font-bold text-lg text-blue-600">{challenge.timestamp}</p>
            </div>
          )}
        </div>

        {/* Video Preview/Recorder */}
        <div className="space-y-4">
          {state.isRecording ||
          (!state.recordedVideoUrl && state.isRecording === false && !state.recordedBlob) ? (
            <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          ) : state.recordedVideoUrl ? (
            <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <video src={state.recordedVideoUrl} controls className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600">Camera preview will appear here</p>
              </div>
            </div>
          )}

          {/* Recording Timer */}
          {state.isRecording && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <span className="font-semibold text-red-900">Recording in progress</span>
              </div>
              <span className="font-mono text-lg font-bold text-red-600">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          {/* Duration Constraints Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
            <p>
              Duration: {constraints.minDurationSeconds}-{constraints.maxDurationSeconds} seconds (
              {state.recordedBlob && `${state.recordingDuration}s recorded`})
            </p>
            <p>Max file size: {(constraints.maxFileSize / (1024 * 1024)).toFixed(1)}MB</p>
          </div>
        </div>

        {/* Error Messages */}
        {(state.error || uploadError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-900 font-semibold mb-1">Error</p>
            <p className="text-red-800">{state.error || uploadError}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 justify-between">
          {!state.recordedBlob ? (
            <>
              <Button
                onClick={startRecording}
                disabled={state.isRecording || isCameraAccessing || isUploading}
                isLoading={isCameraAccessing}
                variant="primary"
                size="md"
                fullWidth
              >
                {state.isRecording ? 'Recording...' : 'Start Recording'}
              </Button>
              {state.isRecording && (
                <Button onClick={stopRecording} variant="danger" size="md">
                  Stop
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-3 flex-1">
                <Button
                  onClick={discardRecording}
                  disabled={isUploading}
                  variant="outline"
                  size="md"
                  fullWidth
                >
                  Retake
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isRecordingValid || isUploading}
                  isLoading={isUploading}
                  variant="primary"
                  size="md"
                  fullWidth
                >
                  Submit Video
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Validation Status */}
        {state.recordedBlob && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={state.recordingDuration >= constraints.minDurationSeconds ? '✓' : '✗'}
              >
                {' '}
              </span>
              <span
                className={
                  state.recordingDuration >= constraints.minDurationSeconds
                    ? 'text-green-700'
                    : 'text-red-700'
                }
              >
                Minimum duration: {constraints.minDurationSeconds}s ({state.recordingDuration}s
                recorded)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={state.recordingDuration <= constraints.maxDurationSeconds ? '✓' : '✗'}
              >
                {' '}
              </span>
              <span
                className={
                  state.recordingDuration <= constraints.maxDurationSeconds
                    ? 'text-green-700'
                    : 'text-red-700'
                }
              >
                Maximum duration: {constraints.maxDurationSeconds}s ({state.recordingDuration}s
                recorded)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={state.recordedBlob.size <= constraints.maxFileSize ? '✓' : '✗'}>
                {' '}
              </span>
              <span
                className={
                  state.recordedBlob.size <= constraints.maxFileSize
                    ? 'text-green-700'
                    : 'text-red-700'
                }
              >
                File size: {(state.recordedBlob.size / (1024 * 1024)).toFixed(2)}MB /{' '}
                {(constraints.maxFileSize / (1024 * 1024)).toFixed(1)}MB max
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default VideoRecordingComponent;
