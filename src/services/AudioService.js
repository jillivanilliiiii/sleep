import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

// dB-Schwellwerte (expo-av metering: -160 = Stille, 0 = Maximum)
const SNORING_THRESHOLD = -20;   // laut & anhaltend → Schnarchen
const TALKING_THRESHOLD = -28;   // Sprachpegel → Reden
const SILENCE_THRESHOLD = -50;   // Hintergrundgeräusch

const SEGMENT_DURATION_MS = 10000; // 10-Sekunden-Segmente
const EVENT_MIN_DURATION_MS = 3000; // Ereignis muss mind. 3 s dauern

export const EventType = {
  SNORING: 'snoring',
  TALKING: 'talking',
  NOISE: 'noise',
};

class AudioService {
  constructor() {
    this.recording = null;
    this.isMonitoring = false;
    this.onEventDetected = null;
    this.onLevelUpdate = null;
    this.onUploadProgress = null;
    this.eventBuffer = [];
    this.currentEvent = null;
    this.segmentTimer = null;
    this.sessionDir = null;
    this.sessionId = null;
    this.segmentIndex = 0;
    this.savedSegments = [];
  }

  async requestPermissions() {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async startSession(sessionId) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) throw new Error('Mikrofon-Berechtigung verweigert');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    this.sessionId = sessionId;
    this.sessionDir = `${FileSystem.documentDirectory}sessions/${sessionId}/`;
    await FileSystem.makeDirectoryAsync(this.sessionDir, { intermediates: true });

    this.isMonitoring = true;
    this.segmentIndex = 0;
    this.savedSegments = [];
    this.currentEvent = null;
    this.eventBuffer = [];

    await this._startSegment();
    return true;
  }

  async _startSegment() {
    if (!this.isMonitoring) return;
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
      });
      recording.setOnRecordingStatusUpdate(this._onStatusUpdate.bind(this));
      await recording.startAsync();
      this.recording = recording;
      this.segmentTimer = setTimeout(() => this._rotateSegment(), SEGMENT_DURATION_MS);
    } catch (e) {
      console.error('Segment start error:', e);
    }
  }

  _onStatusUpdate(status) {
    if (!status.isRecording) return;
    const level = status.metering ?? -160;
    this.onLevelUpdate?.(level);
    this._analyzeLevel(level, status.durationMillis || 0);
  }

  _analyzeLevel(level, timestamp) {
    let detectedType = null;
    if (level >= SNORING_THRESHOLD) detectedType = EventType.SNORING;
    else if (level >= TALKING_THRESHOLD) detectedType = EventType.TALKING;
    else if (level >= SILENCE_THRESHOLD) detectedType = EventType.NOISE;

    if (detectedType) {
      if (!this.currentEvent) {
        this.currentEvent = {
          type: detectedType,
          startTime: Date.now(),
          startTimestamp: timestamp,
          segmentIndex: this.segmentIndex,
          peakLevel: level,
          samples: 1,
        };
      } else {
        this.currentEvent.samples++;
        if (level > this.currentEvent.peakLevel) this.currentEvent.peakLevel = level;
        if (detectedType === EventType.SNORING && this.currentEvent.type !== EventType.SNORING) {
          this.currentEvent.type = EventType.SNORING;
        }
      }
    } else if (this.currentEvent) {
      const duration = Date.now() - this.currentEvent.startTime;
      if (duration >= EVENT_MIN_DURATION_MS) {
        const event = { ...this.currentEvent, endTime: Date.now(), duration };
        this.eventBuffer.push(event);
        this.onEventDetected?.(event);
      }
      this.currentEvent = null;
    }
  }

  async _rotateSegment() {
    if (!this.isMonitoring || !this.recording) return;
    const oldRecording = this.recording;
    this.recording = null;

    try {
      await oldRecording.stopAndUnloadAsync();
      const uri = oldRecording.getURI();
      if (uri) {
        const localPath = `${this.sessionDir}segment_${this.segmentIndex}.m4a`;
        await FileSystem.moveAsync({ from: uri, to: localPath });
        const seg = {
          index: this.segmentIndex,
          localPath,
          firebaseUrl: null,
          startTime: Date.now() - SEGMENT_DURATION_MS,
          endTime: Date.now(),
        };
        this.savedSegments.push(seg);
        // Upload to Firebase in background (don't block recording)
        this._uploadSegment(seg);
      }
      this.segmentIndex++;
    } catch (e) {
      console.error('Segment rotation error:', e);
    }
    await this._startSegment();
  }

  async _uploadSegment(seg) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const fileInfo = await FileSystem.getInfoAsync(seg.localPath);
      if (!fileInfo.exists) return;

      // Read file as blob
      const response = await fetch(seg.localPath);
      const blob = await response.blob();

      const storageRef = ref(storage, `audio/${uid}/${this.sessionId}/segment_${seg.index}.m4a`);
      await uploadBytes(storageRef, blob, { contentType: 'audio/mp4' });
      seg.firebaseUrl = await getDownloadURL(storageRef);
    } catch (e) {
      console.warn('Upload segment error (non-fatal):', e);
    }
  }

  async stopSession() {
    this.isMonitoring = false;

    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
      this.segmentTimer = null;
    }

    // Finalize open event
    if (this.currentEvent) {
      const duration = Date.now() - this.currentEvent.startTime;
      if (duration >= EVENT_MIN_DURATION_MS) {
        this.eventBuffer.push({ ...this.currentEvent, endTime: Date.now(), duration });
      }
      this.currentEvent = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        if (uri) {
          const localPath = `${this.sessionDir}segment_${this.segmentIndex}.m4a`;
          await FileSystem.moveAsync({ from: uri, to: localPath });
          const seg = {
            index: this.segmentIndex,
            localPath,
            firebaseUrl: null,
            startTime: Date.now() - SEGMENT_DURATION_MS,
            endTime: Date.now(),
          };
          this.savedSegments.push(seg);
          await this._uploadSegment(seg); // await final segment upload
        }
      } catch (e) {
        console.error('Stop recording error:', e);
      }
      this.recording = null;
    }

    // Upload any remaining segments that haven't been uploaded yet
    await Promise.allSettled(
      this.savedSegments
        .filter((s) => !s.firebaseUrl)
        .map((s) => this._uploadSegment(s))
    );

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    });

    return {
      events: this.eventBuffer,
      segments: this.savedSegments,
      sessionDir: this.sessionDir,
    };
  }

  async playAudioFile(uri) {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    return sound;
  }
}

export default new AudioService();
