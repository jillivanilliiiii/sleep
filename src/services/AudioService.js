import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Thresholds for event detection (dB metering values, -160 = silence, 0 = max)
const SNORING_THRESHOLD = -20;    // loud, rhythmic noise
const TALKING_THRESHOLD = -28;    // speech-level noise
const SILENCE_THRESHOLD = -50;    // background silence

const SEGMENT_DURATION_MS = 10000; // 10s segments for continuous recording
const EVENT_MIN_DURATION_MS = 3000; // event must last at least 3s to be saved

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
    this.eventBuffer = [];
    this.currentEvent = null;
    this.segmentTimer = null;
    this.sessionDir = null;
    this.segmentIndex = 0;
    this.savedSegments = [];
  }

  async requestPermissions() {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async startSession(sessionId) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Mikrofon-Berechtigung verweigert');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

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
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });

      recording.setOnRecordingStatusUpdate(this._onStatusUpdate.bind(this));
      await recording.startAsync();
      this.recording = recording;

      // Schedule next segment
      this.segmentTimer = setTimeout(async () => {
        await this._rotateSegment();
      }, SEGMENT_DURATION_MS);
    } catch (e) {
      console.error('Segment start error:', e);
    }
  }

  _onStatusUpdate(status) {
    if (!status.isRecording) return;

    const level = status.metering ?? -160;

    if (this.onLevelUpdate) {
      this.onLevelUpdate(level);
    }

    this._analyzeLevel(level, status.durationMillis || 0);
  }

  _analyzeLevel(level, timestamp) {
    let detectedType = null;

    if (level >= SNORING_THRESHOLD) {
      detectedType = EventType.SNORING;
    } else if (level >= TALKING_THRESHOLD) {
      // Talking tends to have more variation; snoring is more sustained
      detectedType = EventType.TALKING;
    } else if (level >= SILENCE_THRESHOLD) {
      detectedType = EventType.NOISE;
    }

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
        if (level > this.currentEvent.peakLevel) {
          this.currentEvent.peakLevel = level;
        }
        // Upgrade type if louder
        if (
          detectedType === EventType.SNORING &&
          this.currentEvent.type !== EventType.SNORING
        ) {
          this.currentEvent.type = EventType.SNORING;
        }
      }
    } else {
      if (this.currentEvent) {
        const duration = Date.now() - this.currentEvent.startTime;
        if (duration >= EVENT_MIN_DURATION_MS) {
          const event = {
            ...this.currentEvent,
            endTime: Date.now(),
            duration,
          };
          this.eventBuffer.push(event);
          if (this.onEventDetected) {
            this.onEventDetected(event);
          }
        }
        this.currentEvent = null;
      }
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
        const destPath = `${this.sessionDir}segment_${this.segmentIndex}.m4a`;
        await FileSystem.moveAsync({ from: uri, to: destPath });
        this.savedSegments.push({
          index: this.segmentIndex,
          path: destPath,
          startTime: Date.now() - SEGMENT_DURATION_MS,
          endTime: Date.now(),
        });
      }
      this.segmentIndex++;
    } catch (e) {
      console.error('Segment rotation error:', e);
    }

    await this._startSegment();
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
        this.eventBuffer.push({
          ...this.currentEvent,
          endTime: Date.now(),
          duration,
        });
      }
      this.currentEvent = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        if (uri) {
          const destPath = `${this.sessionDir}segment_${this.segmentIndex}.m4a`;
          await FileSystem.moveAsync({ from: uri, to: destPath });
          this.savedSegments.push({
            index: this.segmentIndex,
            path: destPath,
            startTime: Date.now() - SEGMENT_DURATION_MS,
            endTime: Date.now(),
          });
        }
      } catch (e) {
        console.error('Stop recording error:', e);
      }
      this.recording = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    });

    return {
      events: this.eventBuffer,
      segments: this.savedSegments,
    };
  }

  getEvents() {
    return [...this.eventBuffer];
  }

  /**
   * Extract a short audio clip around an event for playback.
   * Returns the path of the relevant segment file.
   */
  getSegmentPathForEvent(event) {
    const segment = this.savedSegments.find(
      (s) => s.index === event.segmentIndex
    );
    return segment ? segment.path : null;
  }

  async playAudioFile(uri) {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    return sound;
  }
}

export default new AudioService();
