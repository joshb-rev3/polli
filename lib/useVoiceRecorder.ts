import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export interface RecordingResult {
  uri: string;
  mimeType: string;
  fileName: string;
  durationMs: number;
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);

  const stopWebStream = () => {
    webStreamRef.current?.getTracks().forEach((t) => t.stop());
    webStreamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      if (Platform.OS === "web") {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("This browser does not support microphone recording.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webStreamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        webChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) webChunksRef.current.push(e.data);
        };
        recorder.start();
        webRecorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setIsRecording(true);
        return;
      }

      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone access was denied. Enable it in Settings to record.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      recordingRef.current = recording;
      startedAtRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      const msg = (err as Error).message || "Could not start recording.";
      if (msg.includes("NotAllowed") || msg.includes("denied")) {
        setError("Microphone access was denied.");
      } else if (msg.includes("NotFound")) {
        setError("No microphone was found on this device.");
      } else {
        setError(msg);
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    setIsRecording(false);
    const durationMs = Math.max(0, Date.now() - startedAtRef.current);

    try {
      if (Platform.OS === "web") {
        const recorder = webRecorderRef.current;
        if (!recorder) return null;

        const blob = await new Promise<Blob>((resolve, reject) => {
          recorder.onstop = () => {
            const type = recorder.mimeType || "audio/webm";
            resolve(new Blob(webChunksRef.current, { type }));
          };
          recorder.onerror = () => reject(new Error("Recording failed."));
          recorder.stop();
        });

        stopWebStream();
        webRecorderRef.current = null;
        const mimeType = blob.type || "audio/webm";
        const uri = URL.createObjectURL(blob);
        return {
          uri,
          mimeType,
          fileName: `recording-${Date.now()}.webm`,
          durationMs,
        };
      }

      const recording = recordingRef.current;
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) return null;
      const status = await recording.getStatusAsync();
      const statusDuration =
        "durationMillis" in status && status.durationMillis
          ? status.durationMillis
          : durationMs;

      return {
        uri,
        mimeType: Platform.OS === "ios" ? "audio/mp4" : "audio/m4a",
        fileName: `recording-${Date.now()}.m4a`,
        durationMs: statusDuration,
      };
    } catch (err) {
      setError((err as Error).message || "Could not finish recording.");
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      webRecorderRef.current?.stop();
      stopWebStream();
    };
  }, []);

  return { isRecording, error, startRecording, stopRecording, clearError: () => setError(null) };
}
