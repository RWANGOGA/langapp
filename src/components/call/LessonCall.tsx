"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";
import type { CallToken } from "@/lib/call-data";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./call.module.css";

// A video/mic track plus the label drawn under its tile. Local and remote
// tiles share the exact same shape, so one render path handles both.
interface StreamTile {
  key: string;
  name: string;
  track: Track;
  local: boolean;
}

type Phase = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

/**
 * A single lesson call. It receives an already-minted, room-scoped token and
 * owns the whole media lifecycle: connect, toggle local devices, mirror every
 * participant's camera, and tear down cleanly. All provider specifics stay in
 * here so the page around it only has to hand it a token (or explain why it
 * could not get one).
 */
export default function LessonCall({ call, onEnded }: { call: CallToken; onEnded?: () => void }) {
  const { t } = useLanguage();
  const roomRef = useRef<Room | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [tiles, setTiles] = useState<StreamTile[]>([]);
  const [peers, setPeers] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const addTile = useCallback((tile: StreamTile) => {
    // Replace a same-key tile (the local preview re-publishes on toggle).
    setTiles((prev) => [...prev.filter((x) => x.key !== tile.key), tile]);
  }, []);

  const dropTile = useCallback((track: Track) => {
    setTiles((prev) => prev.filter((x) => x.track !== track));
  }, []);

  const refreshPeers = useCallback((room: Room) => {
    setPeers(1 + Array.from(room.remoteParticipants.values()).length);
  }, []);

  useEffect(() => {
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.Connected, () => {
      setPhase("connected");
      refreshPeers(room);
    });
    room.on(RoomEvent.Reconnecting, () => setPhase("reconnecting"));
    room.on(RoomEvent.Reconnected, () => {
      setPhase("connected");
      refreshPeers(room);
    });
    room.on(RoomEvent.Disconnected, () => setPhase("disconnected"));

    // A remote camera/screen track becomes a tile; audio tracks are wired
    // straight to the mix by the SDK and need no tile of their own.
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Video) return;
      addTile({ key: `r:${participant.identity}:${track.sid}`, name: participant.identity, track, local: false });
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => dropTile(track));

    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      const track = publication.track;
      if (!track || track.kind !== Track.Kind.Video) return;
      addTile({ key: "local", name: t("call.you"), track, local: true });
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.track) dropTile(publication.track);
    });

    room.on(RoomEvent.ParticipantConnected, () => refreshPeers(room));
    room.on(RoomEvent.ParticipantDisconnected, () => refreshPeers(room));

    // The token was already validated server-side; connect is the client's job.
    room.connect(call.url, call.token).then(() => {
      // Turn devices on as soon as we are in, then reconcile with what actually
      // came up - the toggles must not lie about the real capture state.
      return Promise.all([
        room.localParticipant.setMicrophoneEnabled(true).catch(() => {
          setDeviceError(t("call.permDenied"));
        }),
        room.localParticipant.setCameraEnabled(true).catch(() => {
          setDeviceError(t("call.permDenied"));
        }),
      ]);
    }).then(() => {
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      setCamOn(room.localParticipant.isCameraEnabled);
    }).catch((err) => {
      setPhase("error");
      setDeviceError(err instanceof Error ? err.message : t("call.unavailable"));
    });

    return () => {
      room.removeAllListeners();
      room.disconnect().catch(() => {});
      roomRef.current = null;
    };
    // call is stable for the life of a joined lesson; re-running on it would
    // tear down the room on any unrelated parent re-render.
  }, [call, addTile, dropTile, refreshPeers, t]);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      setDeviceError(null);
    } catch {
      setDeviceError(t("call.permDenied"));
    }
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    try {
      await room.localParticipant.setCameraEnabled(next);
      setCamOn(room.localParticipant.isCameraEnabled);
      setDeviceError(null);
    } catch {
      setDeviceError(t("call.permDenied"));
    }
  };

  const leave = async () => {
    await roomRef.current?.disconnect().catch(() => {});
    setPhase("disconnected");
    onEnded?.();
  };

  const statusKey =
    phase === "connected" ? "call.connected"
      : phase === "reconnecting" ? "call.reconnecting"
      : phase === "error" ? "call.unavailable"
      : phase === "disconnected" ? "call.ended"
      : "call.connecting";

  if (phase === "disconnected") {
    return (
      <div className={styles.stage}>
        <div className={styles.notice} role="status">
          <p className={styles.noticeTitle}>{t("call.ended")}</p>
          {onEnded && <button type="button" className={styles.primaryBtn} onClick={onEnded}>{t("call.back")}</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stage}>
      <div className={styles.statusBar} role="status" aria-live="polite">
        <span className={styles.statusDot} data-phase={phase} aria-hidden />
        <span>{t(statusKey)}</span>
        <span className={styles.peers}><Users size={14} aria-hidden /> {peers}</span>
      </div>

      {deviceError && <p className={styles.deviceError} role="alert">{deviceError}</p>}

      {tiles.length === 0 ? (
        <div className={styles.emptyTile}>
          <p>{t(phase === "connected" ? "call.waiting" : "call.connecting")}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {tiles.map((tile) => (
            <figure key={tile.key} className={styles.tile} data-local={tile.local}>
              <TileVideo track={tile.track} />
              <figcaption>
                {tile.name}
                {tile.local && <span className={styles.badge}>{t("call.you")}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlBtn}
          data-active={micOn}
          onClick={toggleMic}
          aria-pressed={micOn}
          aria-label={t(micOn ? "call.mic" : "call.micOff")}
        >
          {micOn ? <Mic size={20} aria-hidden /> : <MicOff size={20} aria-hidden />}
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          data-active={camOn}
          onClick={toggleCam}
          aria-pressed={camOn}
          aria-label={t(camOn ? "call.cam" : "call.camOff")}
        >
          {camOn ? <VideoIcon size={20} aria-hidden /> : <VideoOff size={20} aria-hidden />}
        </button>
        <button
          type="button"
          className={`${styles.controlBtn} ${styles.leaveBtn}`}
          onClick={leave}
          aria-label={t("call.leave")}
        >
          <PhoneOff size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Attaches a LiveKit track to a DOM video element and detaches on unmount.
 * Kept separate so track identity, not React reconciliation, decides which
 * <video> a media stream lands in.
 */
function TileVideo({ track }: { track: Track }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (track.kind === Track.Kind.Video) {
      track.attach(el);
      return () => { track.detach(el); };
    }
  }, [track]);
  // A raw <video>: LiveKit owns the stream and attaches it imperatively.
  return <video ref={ref} playsInline autoPlay muted className={styles.video} />;
}
