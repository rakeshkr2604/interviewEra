'use client'

import { useEffect, useRef } from 'react'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import { micPermissionMonitor } from '@/lib/voice/mic-permission-monitor'
import { micDeviceMonitor } from '@/lib/voice/mic-device-monitor'
import { emitMicPipelineTelemetry } from '@/lib/voice/mic-pipeline-telemetry'

export interface UseMicPipelineLifecycleParams {
  enabled: boolean
  telemetryCtx: InterviewTelemetryContext
  phaseRef: React.MutableRefObject<string>
  inputModeRef: React.MutableRefObject<'voice' | 'text' | 'deepgram'>
  onPermissionRevoked: () => void
  onPermissionGranted: () => void
  onCaptureInvalid: (source: 'permission' | 'device' | 'track') => void
}

/**
 * Session-scoped permission + device lifecycle for the voice pipeline.
 * Detects revoked permission and invalid capture without page refresh.
 */
export function useMicPipelineLifecycle(params: UseMicPipelineLifecycleParams): void {
  const {
    enabled,
    telemetryCtx,
    phaseRef,
    inputModeRef,
    onPermissionRevoked,
    onPermissionGranted,
    onCaptureInvalid,
  } = params

  const onPermissionRevokedRef = useRef(onPermissionRevoked)
  const onPermissionGrantedRef = useRef(onPermissionGranted)
  const onCaptureInvalidRef = useRef(onCaptureInvalid)

  useEffect(() => {
    onPermissionRevokedRef.current = onPermissionRevoked
    onPermissionGrantedRef.current = onPermissionGranted
    onCaptureInvalidRef.current = onCaptureInvalid
  }, [onPermissionRevoked, onPermissionGranted, onCaptureInvalid])

  useEffect(() => {
    if (!enabled) return

    const unsubPermission = micPermissionMonitor.subscribe((state, transition) => {
      if (state === 'denied' && (transition === 'revoked' || transition === 'denied')) {
        emitMicPipelineTelemetry('mic_permission_revoked', telemetryCtx, {
          transition,
          phase: phaseRef.current,
          input_mode: inputModeRef.current,
        })
        onPermissionRevokedRef.current()
        if (phaseRef.current === 'candidate_answering' && inputModeRef.current !== 'text') {
          onCaptureInvalidRef.current('permission')
        }
        return
      }
      if (state === 'granted' && (transition === 'granted' || transition === 'restored')) {
        onPermissionGrantedRef.current()
      }
    }, telemetryCtx)

    const stopDevice = micDeviceMonitor.start(telemetryCtx, {
      onDeviceInvalid: () => {
        if (phaseRef.current !== 'candidate_answering') return
        if (inputModeRef.current === 'text') return
        onCaptureInvalidRef.current('device')
      },
      onDeviceRecovered: () => {
        emitMicPipelineTelemetry('device_recovered', telemetryCtx, {
          phase: phaseRef.current,
          input_mode: inputModeRef.current,
        })
      },
    })

    return () => {
      unsubPermission()
      stopDevice()
    }
  }, [enabled, telemetryCtx, phaseRef, inputModeRef])
}
