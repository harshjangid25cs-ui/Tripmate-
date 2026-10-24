// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { MascotCharacter, type MascotState } from "@/components/features/ai-companion/MascotCharacter";
import { FloatingMascotFAB } from "@/components/features/ai-companion/FloatingMascotFAB";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Supabase realtime sync
vi.mock("@/lib/supabase/use-realtime-sync", () => ({
  useRealtimeTableSync: vi.fn(),
}));

// Mock useVoiceRecording hook
vi.mock("@/lib/hooks/use-voice-recording", () => ({
  useVoiceRecording: () => ({
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(new Blob()),
    isRecording: false,
    audioLevel: 0,
    hasPermission: true,
    error: null,
  }),
}));

describe("TripMate AI Mascot ('Matey') Visual System & State Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. MascotCharacter State Rendering", () => {
    it("renders 'idle' state with bobbing breathing animation", () => {
      render(<MascotCharacter state="idle" size={64} />);
      const mascot = screen.getByTestId("mascot-character-idle");
      expect(mascot).toBeDefined();
      expect(mascot.getAttribute("aria-label")).toContain("idle");
      expect(mascot.className).toContain("bounce-slow");
    });

    it("renders 'listening' state with aqua/cyan ripple rings around headphones", () => {
      render(<MascotCharacter state="listening" size={64} showRings={true} />);
      const mascot = screen.getByTestId("mascot-character-listening");
      expect(mascot).toBeDefined();
      expect(mascot.getAttribute("aria-label")).toContain("listening");

      // Verify ripple rings elements exist
      const cyanRings = document.querySelectorAll(".border-\\[\\#22D3EE\\]");
      expect(cyanRings.length).toBeGreaterThanOrEqual(2);
    });

    it("renders 'guiding' state with speech bubble 'Let\\'s go explore!' and waving pose", () => {
      render(<MascotCharacter state="guiding" size={64} showSpeechBubble={true} />);
      const mascot = screen.getByTestId("mascot-character-guiding");
      expect(mascot).toBeDefined();
      expect(mascot.getAttribute("aria-label")).toContain("guiding");
      expect(screen.getByText("Let's go explore!")).toBeDefined();
    });

    it("renders 'success' state with sparkly star patterns", () => {
      render(<MascotCharacter state="success" size={64} />);
      const mascot = screen.getByTestId("mascot-character-success");
      expect(mascot).toBeDefined();
      expect(mascot.getAttribute("aria-label")).toContain("success");
      const stars = screen.getAllByText("✦");
      expect(stars.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("2. State Transitions Between 'idle', 'listening', 'guiding', and 'success'", () => {
    function StateTransitionTestWrapper({ initialState }: { initialState: MascotState }) {
      const [currentState, setCurrentState] = React.useState<MascotState>(initialState);

      return (
        <div>
          <MascotCharacter state={currentState} size={64} />
          <button onClick={() => setCurrentState("listening")} data-testid="btn-state-listening">
            Start Listening
          </button>
          <button onClick={() => setCurrentState("guiding")} data-testid="btn-state-guiding">
            Start Guiding
          </button>
          <button onClick={() => setCurrentState("success")} data-testid="btn-state-success">
            Complete Action
          </button>
          <button onClick={() => setCurrentState("idle")} data-testid="btn-state-idle">
            Reset Idle
          </button>
        </div>
      );
    }

    it("transitions cleanly from 'idle' to 'listening' when speech recording begins", () => {
      render(<StateTransitionTestWrapper initialState="idle" />);
      expect(screen.getByTestId("mascot-character-idle")).toBeDefined();

      // Trigger transition to listening
      act(() => {
        screen.getByTestId("btn-state-listening").click();
      });

      expect(screen.queryByTestId("mascot-character-idle")).toBeNull();
      const listeningMascot = screen.getByTestId("mascot-character-listening");
      expect(listeningMascot).toBeDefined();
      expect(document.querySelectorAll(".border-\\[\\#22D3EE\\]").length).toBeGreaterThan(0);
    });

    it("transitions from 'listening' to 'guiding' during AI reasoning & speech generation", () => {
      render(<StateTransitionTestWrapper initialState="listening" />);
      expect(screen.getByTestId("mascot-character-listening")).toBeDefined();

      // Trigger transition to guiding
      act(() => {
        screen.getByTestId("btn-state-guiding").click();
      });

      expect(screen.queryByTestId("mascot-character-listening")).toBeNull();
      expect(screen.getByTestId("mascot-character-guiding")).toBeDefined();
      expect(screen.getByText("Let's go explore!")).toBeDefined();
    });

    it("transitions from 'guiding' to 'success' on completed travel card action", () => {
      render(<StateTransitionTestWrapper initialState="guiding" />);
      expect(screen.getByTestId("mascot-character-guiding")).toBeDefined();

      // Trigger transition to success
      act(() => {
        screen.getByTestId("btn-state-success").click();
      });

      expect(screen.queryByTestId("mascot-character-guiding")).toBeNull();
      expect(screen.getByTestId("mascot-character-success")).toBeDefined();
      expect(screen.getAllByText("✦").length).toBeGreaterThan(0);
    });
  });

  describe("3. Floating Mascot FAB & Speech Bubble Interaction", () => {
    it("renders FloatingMascotFAB with default pill on non-admin screens", () => {
      render(<FloatingMascotFAB initialState="idle" showTooltip={true} />);
      const fab = screen.getByTestId("matey-floating-fab");
      expect(fab).toBeDefined();
      expect(screen.getByText(/Ask Matey/i)).toBeDefined();
    });

    it("opens voice assistant drawer upon clicking the floating mascot FAB", () => {
      render(<FloatingMascotFAB initialState="idle" showTooltip={true} />);
      const fab = screen.getByTestId("matey-floating-fab");

      act(() => {
        fab.click();
      });

      // Dialog drawer should be open
      expect(screen.getByTestId("voice-drawer-sheet")).toBeDefined();
      expect(screen.getByText("Your TripMate")).toBeDefined();
      expect(screen.getByText(/Want to explore Jaipur\?/i)).toBeDefined();
    });
  });
});
